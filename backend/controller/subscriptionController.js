const SubscriptionPlan = require("../models/subscriptionPlanModel");
const UserSubscription = require("../models/userSubscriptionModel");
const razorpay = require("../config/razorpay");

// ---------- Access computation (single source of truth) ----------
const computeAccess = (sub) => {
  const now = new Date();

  if (!sub) return { active: false, accessType: null, courseIds: [] };

  const plan = sub?.planId || null;
  const accessType = plan?.accessType || null;
  const courseIds = plan?.courseIds || [];

  // Trial access
  if (sub.status === "trial") {
    if (sub.trialEndDate && new Date(sub.trialEndDate) > now) {
      return { active: true, accessType, courseIds };
    }
    return { active: false, accessType, courseIds };
  }

  // Pending never grants access
  if (sub.status === "pending") {
    return { active: false, accessType, courseIds };
  }

  // Active / Past due: access is valid until currentPeriodEnd (preferred)
  if (["active", "past_due"].includes(sub.status)) {
    const end = sub.currentPeriodEnd || null;
    if (end && new Date(end) > now) {
      return { active: true, accessType, courseIds };
    }
    return { active: false, accessType, courseIds };
  }

  // Cancelled: if cancelled at period end, access lasts until currentPeriodEnd
  if (sub.status === "cancelled") {
    if (sub.cancelAtPeriodEnd) {
      const end = sub.currentPeriodEnd || sub.cancelAt || null;
      if (end && new Date(end) > now) {
        return { active: true, accessType, courseIds };
      }
    }
    return { active: false, accessType, courseIds };
  }

  // Expired => no access
  return { active: false, accessType, courseIds };
};

// ---------- Plans listing ----------
const listActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({
      isActive: true,
      provider: "razorpay",
      providerPlanId: { $exists: true, $ne: null, $ne: "" },
    })
      .select(
        "name description price currency billingCycle accessType courseIds trialDays isFeatured sortOrder provider providerPlanId isActive"
      )
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ success: true, plans });
  } catch (err) {
    console.error("listActivePlans error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------- Get my subscription ----------
const getMySubscription = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Prefer access states first (trial/active/past_due), then pending, then latest
    let sub =
      (await UserSubscription.findOne({
        userId,
        status: { $in: ["trial", "active", "past_due"] },
      })
        .sort({ createdAt: -1 })
        .populate("planId")
        .lean()) ||
      (await UserSubscription.findOne({
        userId,
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .populate("planId")
        .lean()) ||
      (await UserSubscription.findOne({ userId }).sort({ createdAt: -1 }).populate("planId").lean());

    if (!sub) {
      return res.json({
        success: true,
        subscription: null,
        access: { active: false, accessType: null, courseIds: [] },
      });
    }

    return res.json({
      success: true,
      subscription: sub,
      access: computeAccess(sub),
    });
  } catch (err) {
    console.error("getMySubscription error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------- Cancel subscription ----------
const cancelMySubscription = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { mode = "period_end" } = req.body; // "immediate" | "period_end"

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sub = await UserSubscription.findOne({
      userId,
      status: { $in: ["trial", "active", "past_due", "pending"] },
    }).sort({ createdAt: -1 });

    if (!sub) {
      return res.status(404).json({ success: false, message: "No subscription found" });
    }

    const now = new Date();

    // Pending: cancel should expire immediately (no period end concept)
    if (sub.status === "pending") {
      if (sub.razorpaySubscriptionId) {
        try {
          await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
        } catch (e) {
          console.warn("Razorpay cancel failed (pending):", e?.message || e);
        }
      }

      sub.status = "expired";
      sub.autoRenew = false;
      sub.cancelAtPeriodEnd = false;
      sub.cancelAt = now;
      sub.endDate = now;
      sub.lastEvent = "user_cancelled_pending";
      await sub.save();

      return res.json({
        success: true,
        message: "Pending subscription cancelled.",
        subscription: sub,
      });
    }

    // Cancel at period end
    if (mode === "period_end") {
      sub.autoRenew = false;
      sub.cancelAtPeriodEnd = true;

      // Access lasts until currentPeriodEnd (preferred)
      sub.cancelAt = sub.currentPeriodEnd || sub.cancelAt || now;
      sub.lastEvent = "user_cancel_at_period_end";

      await sub.save();

      return res.json({
        success: true,
        message: "Auto-renew disabled. Access remains until period end.",
        subscription: sub,
      });
    }

    // Immediate cancel
    if (sub.razorpaySubscriptionId) {
      try {
        await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
      } catch (e) {
        console.warn("Razorpay cancel failed:", e?.message || e);
      }
    }

    sub.status = "cancelled";
    sub.autoRenew = false;
    sub.cancelAtPeriodEnd = false;
    sub.cancelAt = now;
    sub.endDate = now;
    sub.lastEvent = "user_cancelled_immediate";

    await sub.save();

    return res.json({
      success: true,
      message: "Subscription cancelled immediately.",
      subscription: sub,
    });
  } catch (err) {
    console.error("cancelMySubscription error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------- Get All Subscribers (ADMIN ONLY) ----------
const getAllSubscribersAdmin = async (req, res) => {
  try {
    // Populate user details and plan details
    const subscriptions = await UserSubscription.find()
      .populate("userId", "name email")
      .populate("planId", "name billingCycle price")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, subscriptions });
  } catch (err) {
    console.error("getAllSubscribersAdmin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  listActivePlans,
  getMySubscription,
  cancelMySubscription,
  getAllSubscribersAdmin,
};