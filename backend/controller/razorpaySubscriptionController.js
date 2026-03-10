const razorpay = require("../config/razorpay");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const UserSubscription = require("../models/UserSubscriptionModel");

const toPaise = (amt) => {
  const n = Number(amt || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

const normalizeCurrency = (c) => String(c || "INR").trim().toUpperCase();

const pickRazorpayError = (err) => {
  // Razorpay SDK typically: err.statusCode + err.error.{code,description,source,step,reason}
  const status = err?.statusCode || 500;
  const rp = err?.error || null;

  return {
    status,
    code: rp?.code || null,
    message: rp?.description || err?.message || "Server error",
    meta: rp?.metadata || rp?.meta || null,
    raw: rp || null,
  };
};

exports.createRazorpayPlanForDbPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    // Only Razorpay provider supported here
    if (String(plan.provider || "razorpay") !== "razorpay") {
      return res.status(400).json({
        success: false,
        message: `Plan provider is "${plan.provider}". This endpoint supports only Razorpay plans.`,
      });
    }

    // already linked
    if (plan.providerPlanId) {
      return res.json({ success: true, message: "Already linked", plan });
    }

    // Validate billingCycle -> Razorpay period
    const billing = String(plan.billingCycle || "").toLowerCase();
    if (!["monthly", "yearly"].includes(billing)) {
      return res.status(400).json({ success: false, message: "Invalid billingCycle on plan" });
    }
    const period = billing === "yearly" ? "yearly" : "monthly";

    // intervalCount -> interval
    const interval = Number(plan.intervalCount || 1);
    if (!Number.isFinite(interval) || interval < 1) {
      return res.status(400).json({ success: false, message: "Invalid intervalCount" });
    }

    // Price -> amount in paise
    const amount = toPaise(plan.price);
    if (!amount || amount < 100) {
      // Razorpay often expects minimum 1 INR (100 paise)
      return res.status(400).json({
        success: false,
        message: "Plan price is too low/invalid. Minimum ₹1 (100 paise) recommended.",
      });
    }

    const currency = normalizeCurrency(plan.currency);

    const rpPlan = await razorpay.plans.create({
      period,
      interval,
      item: {
        name: String(plan.name || "Plan").trim(),
        amount,
        currency,
        // description: optional (only if you want, otherwise skip)
      },
    });
    // Save mapping
    plan.providerPlanId = rpPlan.id;
    await plan.save();

    return res.json({
      success: true,
      message: "Razorpay plan created",
      plan,
      razorpayPlan: rpPlan,
    });
  } catch (err) {
    const info = pickRazorpayError(err);

    let friendly = info.message;
    if (
      info.code === "BAD_REQUEST_ERROR" &&
      /requested URL was not found/i.test(info.message)
    ) {
      friendly =
        "Razorpay Subscriptions/Plans is likely not enabled on this account (or keys belong to an account without access). Enable Subscriptions in Razorpay Dashboard or contact support.";
    }

    console.log("RP statusCode:", err?.statusCode);
    console.log("RP error:", err?.error);
    console.log("RP message:", err?.message);
    console.log("RP full:", JSON.stringify(err, null, 2));

    return res.status(info.status).json({
      success: false,
      message: friendly,
      code: info.code,
      statusCode: info.status,
      metadata: info.meta,
    });
  }
};

exports.createRazorpaySubscription = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { planId, useTrial = true } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!planId) return res.status(400).json({ success: false, message: "planId required" });

    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan || plan.isActive === false) {
      return res.status(404).json({ success: false, message: "Plan not available" });
    }

    if (String(plan.provider || "razorpay") !== "razorpay") {
      return res.status(400).json({
        success: false,
        message: `This plan uses provider "${plan.provider}". Only Razorpay is supported here.`,
      });
    }

    if (!plan.providerPlanId) {
      return res.status(400).json({ success: false, message: "Plan not linked to Razorpay yet" });
    }

    const now = new Date();

    // 1) If user already has access states, block
    const accessSub = await UserSubscription.findOne({
      userId,
      status: { $in: ["trial", "active", "past_due"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (accessSub) {
      return res.status(400).json({
        success: false,
        message: "Already have a subscription in progress/active",
      });
    }

    // 2) If pending exists -> Option A resume (same plan), else expire it (different plan / old)
    const pendingSub = await UserSubscription.findOne({
      userId,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (pendingSub?.razorpaySubscriptionId) {
      // Optional TTL: expire pending older than 15 mins
      const PENDING_TTL_MS = 15 * 60 * 1000;
      const ageMs = Date.now() - new Date(pendingSub.createdAt).getTime();
      const isExpiredByTtl = ageMs > PENDING_TTL_MS;

      // Same plan + not expired => resume
      if (!isExpiredByTtl && String(pendingSub.planId) === String(planId)) {
        return res.json({
          success: true,
          message: "Pending subscription found. Resuming payment...",
          key: process.env.RAZORPAY_KEY_ID,
          razorpaySubscriptionId: pendingSub.razorpaySubscriptionId,
          resume: true,
        });
      }

      // Otherwise expire the old pending so user can proceed
      await UserSubscription.updateOne(
        { _id: pendingSub._id, status: "pending" },
        {
          $set: {
            status: "expired",
            lastEvent: isExpiredByTtl ? "pending_ttl_expired" : "pending_replaced_by_new_plan",
            endDate: now,
            cancelAt: now,
            autoRenew: false,
          },
        }
      );
    }

    // Trial abuse prevention: if user ever had trial before -> block
    const trialUsedBefore = await UserSubscription.findOne({
      userId,
      trialEndDate: { $ne: null },
    }).lean();

    const planTrialDays = Number(plan.trialDays || 0);
    const canUseTrial = Boolean(useTrial) && planTrialDays > 0 && !trialUsedBefore;

    const trialDays = canUseTrial ? planTrialDays : 0;
    const trialEndDate = trialDays > 0 ? new Date(Date.now() + trialDays * 86400000) : null;

    // Build Razorpay subscription payload
    const rpSubPayload = {
      plan_id: plan.providerPlanId,
      total_count: 100,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: String(userId),
        dbPlanId: String(plan._id),
        useTrial: String(Boolean(trialEndDate)),
      },
    };

    // If trial enabled, delay first charge until trial end
    if (trialEndDate) {
      rpSubPayload.start_at = Math.floor(trialEndDate.getTime() / 1000);
    }

    const rpSub = await razorpay.subscriptions.create(rpSubPayload);

    // DB subscription record
    const sub = await UserSubscription.create({
      userId,
      planId: plan._id,
      status: trialEndDate ? "trial" : "pending",
      startDate: new Date(),
      trialEndDate,
      endDate: null,
      autoRenew: true,

      provider: "razorpay",
      providerSubscriptionId: rpSub.id, 
      providerPaymentId: null,
      providerOrderId: null,

      razorpaySubscriptionId: rpSub.id, 
      lastEvent: "subscription.created",

      amount: Number(plan.price || 0),
      currency: plan.currency || "INR",
    });

    return res.json({
      success: true,
      message: trialEndDate ? `Trial started for ${trialDays} day(s)` : "Subscription created",
      key: process.env.RAZORPAY_KEY_ID,
      razorpaySubscriptionId: rpSub.id,
      dbSubscription: sub,
      trial: { enabled: Boolean(trialEndDate), trialDays, trialEndDate },
    });
  } catch (err) {
    console.error("createRazorpaySubscription error:", err);

    const info = pickRazorpayError(err);
    return res.status(info.status).json({
      success: false,
      message: info.message,
      code: info.code,
      statusCode: info.status,
      metadata: info.meta,
    });
  }
};