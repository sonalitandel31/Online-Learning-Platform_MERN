const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptionPlan", required: true },
    userSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "userSubscription", index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true },

    type: {
      type: String,
      enum: ["initial", "renewal", "upgrade", "downgrade", "refund", "one_time"],
      default: "initial",
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    paymentDate: { type: Date, default: Date.now, index: true },

    // billing period this payment covers (helps access + forecasting)
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },

    provider: { type: String, enum: ["razorpay", "stripe", "dummy"], default: "razorpay" },

    // normalized provider ids
    providerPaymentId: { type: String, default: null },
    providerOrderId: { type: String, default: null },
    providerInvoiceId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },

    // keep your razorpay fields if already used
    paymentId: { type: String, default: null },
    orderId: { type: String, default: null },
    invoiceId: { type: String, default: null },
    subscriptionId: { type: String, default: null },

    eventId: { type: String, default: null },

    failureReason: { type: String, default: null, trim: true },
    failureCode: { type: String, default: null, trim: true },

    // optional minimal snapshot for debugging (avoid huge payloads in prod)
    raw: { type: Object, default: null },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ userId: 1, paymentDate: -1 });
subscriptionPaymentSchema.index({ providerSubscriptionId: 1 });
subscriptionPaymentSchema.index({ subscriptionId: 1 });
subscriptionPaymentSchema.index({ status: 1, paymentDate: -1 });
subscriptionPaymentSchema.index({ paymentId: 1 }, { unique: true, sparse: true });
subscriptionPaymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.subscriptionPayment ||
  mongoose.model("subscriptionPayment", subscriptionPaymentSchema);