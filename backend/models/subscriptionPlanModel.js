const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },

    currency: { type: String, default: "INR", trim: true },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
      index: true,
    },

    // for future: quarterly, 2 years, etc.
    intervalCount: { type: Number, default: 1, min: 1 },

    accessType: {
      type: String,
      enum: ["all", "selected"],
      default: "all",
      index: true,
    },

    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "course" }],

    trialDays: { type: Number, default: 0, min: 0 },

    features: [{ type: String, trim: true }],

    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },

    // payment provider mapping (future-proof)
    provider: {
      type: String,
      enum: ["razorpay", "stripe", "manual"],
      default: "razorpay",
    },
    providerPlanId: { type: String, default: null },
  },
  { timestamps: true }
);

// Ensure selected plans actually select courses
subscriptionPlanSchema.path("courseIds").validate(function (val) {
  if (this.accessType !== "selected") return true;
  return Array.isArray(val) && val.length > 0;
}, "Selected accessType requires at least one courseId.");

// Auto-generate code if missing (prevents validation error)
subscriptionPlanSchema.pre("validate", function (next) {
  if (this.code) return next();

  const base = String(this.name || "PLAN")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);

  const cycle = String(this.billingCycle || "M").slice(0, 1).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

  this.code = `${base}_${cycle}_${rand}`; // e.g. PRO_MONTHLY_M_AB12
  next();
});

// Index for fast listing/sorting
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

// removed duplicate billingCycle index because billingCycle already has index: true

module.exports =
  mongoose.models.subscriptionPlan ||
  mongoose.model("subscriptionPlan", subscriptionPlanSchema);