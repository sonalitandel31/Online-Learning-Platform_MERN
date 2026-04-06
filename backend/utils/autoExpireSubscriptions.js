const UserSubscription = require("../models/userSubscriptionModel");

/**
 * Mark subscriptions expired if their access window has passed.
 * - Trial: trialEndDate passed
 * - Active/Cancelled/PastDue: currentPeriodEnd (or endDate) passed
 */
const expireSubscriptions = async () => {
  try {
    const now = new Date();

    // ✅ 1) Expire trials whose trialEndDate has passed
    const trialResult = await UserSubscription.updateMany(
      {
        status: "trial",
        trialEndDate: { $ne: null, $lte: now },
      },
      {
        $set: {
          status: "expired",
          autoRenew: false,
          lastEvent: "trial_auto_expired",
        },
      }
    );

    // ✅ 2) Expire paid window subs (active/cancelled/past_due) whose period end passed
    const paidResult = await UserSubscription.updateMany(
      {
        status: { $in: ["active", "cancelled", "past_due"] },
        $or: [
          { currentPeriodEnd: { $ne: null, $lte: now } },
          { currentPeriodEnd: null, endDate: { $ne: null, $lte: now } },
        ],
      },
      {
        $set: {
          status: "expired",
          autoRenew: false,
          lastEvent: "auto_expired",
        },
      }
    );

    // 🟡 Optional: cleanup stale pending (created but never paid) after 24h
    const pendingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingResult = await UserSubscription.updateMany(
      { status: "pending", createdAt: { $lte: pendingCutoff } },
      { $set: { status: "expired", autoRenew: false, lastEvent: "pending_timeout" } }
    );

    const modified =
      (trialResult?.modifiedCount || 0) +
      (paidResult?.modifiedCount || 0) +
      (pendingResult?.modifiedCount || 0);

    if (modified) {
      console.log(`[autoExpireSubscriptions] updated: ${modified} (trial=${trialResult?.modifiedCount || 0}, paid=${paidResult?.modifiedCount || 0}, pending=${pendingResult?.modifiedCount || 0})`);
    }
  } catch (err) {
    console.error("[autoExpireSubscriptions] error:", err);
  }
};

// run once at boot + then every 30 minutes
const startAutoExpireSubscriptions = () => {
  setTimeout(expireSubscriptions, 10 * 1000);
  setInterval(expireSubscriptions, 30 * 60 * 1000);
};

module.exports = startAutoExpireSubscriptions;