const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptionPlan", required: true },

    status: {
      type: String,
      enum: ["pending", "trial", "active", "past_due", "cancelled", "expired"],
      default: "pending",
      index: true,
    },

    // trial
    trialEndDate: { type: Date, default: null },
    trialUsed: { type: Boolean, default: false },

    // lifecycle
    startDate: { type: Date, required: true, default: Date.now },

    // current billing period (important for renewals/forecasting)
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null, index: true },

    // final end (set when expired or cancelled immediately)
    endDate: { type: Date, default: null },

    lastPaymentAt: { type: Date, default: null },

    autoRenew: { type: Boolean, default: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    provider: { type: String, enum: ["razorpay", "stripe", "dummy"], default: "razorpay" },

    // provider identifiers (future-proof)
    providerSubscriptionId: { type: String, default: null },
    providerPaymentId: { type: String, default: null },
    providerOrderId: { type: String, default: null },

    // keep razorpay fields if already used (optional)
    razorpaySubscriptionId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },

    // audit + cancellation
    cancelAt: { type: Date, default: null },
    cancelledReason: { type: String, trim: true, default: null },
    lastEvent: { type: String, default: null },

    // payment snapshot (optional but recommended)
    amount: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "INR", trim: true },
  },
  { timestamps: true }
);

// Indexes
userSubscriptionSchema.index({ userId: 1, createdAt: -1 });
userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ status: 1, currentPeriodEnd: -1 });
userSubscriptionSchema.index({ providerSubscriptionId: 1 }, { sparse: true });
userSubscriptionSchema.index({ razorpaySubscriptionId: 1 }, { sparse: true });

// Prevent multiple active subscriptions per user (partial unique index)
userSubscriptionSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["trial", "active", "past_due"] } },
  }
);

module.exports =
  mongoose.models.userSubscription ||
  mongoose.model("userSubscription", userSubscriptionSchema);