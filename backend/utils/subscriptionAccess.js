const UserSubscription = require("../models/userSubscriptionModel");

const isFuture = (date) => {
  if (!date) return false;
  return new Date(date) > new Date();
};

// pick current subscription: prefer useful statuses first
const findCurrentSubscription = async (userId) => {
  let sub = await UserSubscription.findOne({
    userId,
    status: { $in: ["trial", "active", "cancelled", "past_due", "pending"] },
  })
    .sort({ createdAt: -1 })
    .populate("planId")
    .lean();

  if (!sub) {
    sub = await UserSubscription.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate("planId")
      .lean();
  }

  return sub;
};

const checkSubscriptionForCourse = async ({ userId, courseId }) => {
  const sub = await findCurrentSubscription(userId);

  if (!sub) {
    return { ok: false, reason: "no_subscription", subscription: null, plan: null };
  }

  const plan = sub.planId || null;

  // pending: created but not activated
  if (sub.status === "pending") {
    return { ok: false, reason: "pending_activation", subscription: sub, plan };
  }

  // past_due: payment failed; safe default = block
  // (optional future: allow grace window while retries happen)
  if (sub.status === "past_due") {
    return { ok: false, reason: "past_due", subscription: sub, plan };
  }

  // expired: always block
  if (sub.status === "expired") {
    return { ok: false, reason: "expired", subscription: sub, plan };
  }

  // trial: allow until trialEndDate
  if (sub.status === "trial") {
    if (!isFuture(sub.trialEndDate)) {
      return { ok: false, reason: "trial_ended", subscription: sub, plan };
    }
    // continue to plan coverage checks
  }

  // paid window: for active/cancelled
  const paidEnd = sub.currentPeriodEnd || sub.endDate;

  if (sub.status === "active") {
    if (!isFuture(paidEnd)) {
      return { ok: false, reason: "expired_window", subscription: sub, plan };
    }
    // continue to plan coverage checks
  }

  if (sub.status === "cancelled") {
    // cancelled means autoRenew false, but allow access until paid period ends
    if (!isFuture(paidEnd)) {
      return { ok: false, reason: "cancelled_expired", subscription: sub, plan };
    }
    // continue to plan coverage checks
  }

  // plan must exist & be active
  if (!plan || plan.isActive === false) {
    return { ok: false, reason: "plan_inactive", subscription: sub, plan };
  }

  // ✅ Plan access rules
  if (plan.accessType === "all") {
    return {
      ok: true,
      reason: sub.status === "trial" ? "trial_all" : "subscription_all",
      subscription: sub,
      plan,
    };
  }

  if (plan.accessType === "selected") {
    const allowed =
      Array.isArray(plan.courseIds) &&
      plan.courseIds.some((id) => String(id) === String(courseId));

    if (!allowed) {
      return { ok: false, reason: "course_not_in_plan", subscription: sub, plan };
    }

    return {
      ok: true,
      reason: sub.status === "trial" ? "trial_selected" : "subscription_selected",
      subscription: sub,
      plan,
    };
  }

  return { ok: false, reason: "invalid_accessType", subscription: sub, plan };
};

module.exports = { checkSubscriptionForCourse };