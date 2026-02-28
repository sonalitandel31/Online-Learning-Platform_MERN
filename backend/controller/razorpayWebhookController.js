const crypto = require("crypto");
const UserSubscription = require("../models/UserSubscriptionModel");
const SubscriptionPayment = require("../models/SubscriptionPaymentModel");

const verifySignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
};

const toDateFromUnix = (unixSeconds) => {
  if (!unixSeconds) return null;
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000);
};

exports.razorpayWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    // raw body is required for verification
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}));

    if (!verifySignature(rawBody, signature)) return res.status(400).send("Invalid signature");

    const payload = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString("utf8"))
      : req.body;

    const event = payload?.event;
    const eventId = payload?.id || null;

    const subEntity = payload?.payload?.subscription?.entity || null;
    const paymentEntity = payload?.payload?.payment?.entity || null;

    const razorpaySubscriptionId = subEntity?.id || paymentEntity?.subscription_id;
    if (!razorpaySubscriptionId) return res.status(200).send("No subscription id");

    const dbSub = await UserSubscription.findOne({ razorpaySubscriptionId }).populate("planId");
    if (!dbSub) return res.status(200).send("No db subscription");

    dbSub.lastEvent = event;

    // Always update current period if webhook provides it
    if (subEntity) {
      const cps = toDateFromUnix(subEntity.current_start);
      const cpe = toDateFromUnix(subEntity.current_end);
      if (cps) dbSub.currentPeriodStart = cps;
      if (cpe) dbSub.currentPeriodEnd = cpe;
    }

    // subscription events
    if (event === "subscription.activated") {
      // pending -> active
      if (dbSub.status === "pending") dbSub.status = "active";
      if (dbSub.autoRenew !== false) dbSub.autoRenew = true;

      // When activated and trial is in future, keep trialEndDate as-is
      // (Your access logic should treat trial separately if you want)
    }

    if (event === "subscription.cancelled") {
      dbSub.status = "cancelled";
      dbSub.autoRenew = false;
      dbSub.cancelAt = new Date();
      // endDate is final end, keep it if already set, else set now
      dbSub.endDate = dbSub.endDate || new Date();
    }

    if (event === "subscription.completed" || event === "subscription.halted") {
      dbSub.status = "expired";
      dbSub.autoRenew = false;
      dbSub.endDate = dbSub.endDate || new Date();
    }

    // payment.captured
    if (event === "payment.captured") {
      const payId = paymentEntity?.id;
      if (!payId) {
        await dbSub.save();
        return res.status(200).send("OK");
      }

      // Idempotency by paymentId
      const alreadyPay = await SubscriptionPayment.findOne({ paymentId: payId }).lean();
      if (alreadyPay) {
        await dbSub.save();
        return res.status(200).send("OK");
      }

      // Optional idempotency by eventId
      if (eventId) {
        const alreadyEvent = await SubscriptionPayment.findOne({ eventId }).lean();
        if (alreadyEvent) {
          await dbSub.save();
          return res.status(200).send("OK");
        }
      }

      const amount = Number(paymentEntity?.amount || 0) / 100;

      await SubscriptionPayment.create({
        userId: dbSub.userId,
        planId: dbSub.planId?._id,
        userSubscriptionId: dbSub._id,
        amount,
        currency: paymentEntity?.currency || "INR",
        status: "completed",
        paymentMethod: "Razorpay",
        paymentId: payId,
        orderId: paymentEntity?.order_id || null,
        subscriptionId: razorpaySubscriptionId,
        eventId,
      });

      dbSub.razorpayPaymentId = payId;
      dbSub.lastPaymentAt = new Date();

      // If pending -> active after first successful payment
      if (dbSub.status === "pending") dbSub.status = "active";

      // IMPORTANT: do NOT overwrite endDate here.
      // Billing period should live in currentPeriodStart/currentPeriodEnd.
      // endDate is reserved for final cancellation/expiry.
      dbSub.endDate = null;

      // If trial expired in the past, clear it
      if (dbSub.trialEndDate && new Date(dbSub.trialEndDate) <= new Date()) {
        dbSub.trialEndDate = null;
      }
    }

    // payment.failed
    if (event === "payment.failed") {
      const failId = paymentEntity?.id;

      if (failId) {
        const exists = await SubscriptionPayment.findOne({ paymentId: failId }).lean();
        if (!exists) {
          await SubscriptionPayment.create({
            userId: dbSub.userId,
            planId: dbSub.planId?._id,
            userSubscriptionId: dbSub._id,
            amount: Number(paymentEntity?.amount || 0) / 100,
            currency: paymentEntity?.currency || "INR",
            status: "failed",
            paymentMethod: "Razorpay",
            paymentId: failId,
            subscriptionId: razorpaySubscriptionId,
            eventId,
          });
        }
      }

      // pending/active -> past_due on failure
      if (["active", "pending", "trial"].includes(dbSub.status)) {
        dbSub.status = "past_due";
      }
    }

    await dbSub.save();
    return res.status(200).send("OK");
  } catch (err) {
    console.error("razorpayWebhookHandler error:", err);
    return res.status(500).send("Server error");
  }
};