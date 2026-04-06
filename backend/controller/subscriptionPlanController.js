const mongoose = require("mongoose");
const SubscriptionPlan = require("../models/subscriptionPlanModel");

// helpers
const isValidObjectIdArray = (arr) =>
  Array.isArray(arr) && arr.length > 0 && arr.every((id) => mongoose.Types.ObjectId.isValid(id));

const normalizeCurrency = (c) => String(c || "INR").trim().toUpperCase();

// Create plan (Admin)
const createPlan = async (req, res) => {
  try {
    const {
      name,
      description = "",
      price,
      compareAtPrice = null,
      currency = "INR",
      billingCycle,
      intervalCount = 1,
      accessType = "all",
      courseIds = [],
      trialDays = 0,
      features = [],
      isActive = true,
      sortOrder = 0,
      isFeatured = false,
      provider = "razorpay",
    } = req.body;

    if (!name || !billingCycle) {
      return res.status(400).json({ success: false, message: "name and billingCycle required" });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, message: "price must be number >= 0" });
    }

    const numericCompare = compareAtPrice === null || compareAtPrice === "" ? null : Number(compareAtPrice);
    if (numericCompare !== null && (!Number.isFinite(numericCompare) || numericCompare < 0)) {
      return res.status(400).json({ success: false, message: "compareAtPrice must be number >= 0 or null" });
    }

    if (!["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({ success: false, message: "Invalid billingCycle" });
    }

    const numericInterval = Number(intervalCount);
    if (!Number.isFinite(numericInterval) || numericInterval < 1) {
      return res.status(400).json({ success: false, message: "intervalCount must be number >= 1" });
    }

    if (!["all", "selected"].includes(accessType)) {
      return res.status(400).json({ success: false, message: "Invalid accessType" });
    }

    const numericTrialDays = Number(trialDays);
    if (!Number.isFinite(numericTrialDays) || numericTrialDays < 0) {
      return res.status(400).json({ success: false, message: "trialDays must be number >= 0" });
    }

    if (!["razorpay", "stripe", "manual"].includes(String(provider))) {
      return res.status(400).json({ success: false, message: "Invalid provider" });
    }

    let finalCourseIds = [];
    if (accessType === "selected") {
      if (!isValidObjectIdArray(courseIds)) {
        return res.status(400).json({
          success: false,
          message: "Valid courseIds required when accessType=selected",
        });
      }
      finalCourseIds = courseIds;
    }

    const plan = await SubscriptionPlan.create({
      name: String(name).trim(),
      description: String(description || "").trim(),
      price: numericPrice,
      compareAtPrice: numericCompare,
      currency: normalizeCurrency(currency),
      billingCycle,
      intervalCount: numericInterval,
      accessType,
      courseIds: finalCourseIds,
      trialDays: numericTrialDays,
      features: Array.isArray(features) ? features.map((f) => String(f).trim()).filter(Boolean) : [],
      isActive: Boolean(isActive),
      sortOrder: Number(sortOrder) || 0,
      isFeatured: Boolean(isFeatured),

      provider: String(provider),
      providerPlanId: null, // mapping created by integration controller only
    });

    return res.status(201).json({ success: true, plan });
  } catch (err) {
    // friendly message for duplicate code (unique index)
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate plan code detected. Please retry creating the plan.",
      });
    }

    console.error("createPlan error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin list plans
const getAllPlansAdmin = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ success: true, plans });
  } catch (err) {
    console.error("getAllPlansAdmin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update plan (Admin)
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    // whitelist updates only
    const allowedFields = [
      "name",
      "description",
      "price",
      "compareAtPrice",
      "currency",
      "billingCycle",
      "intervalCount",
      "accessType",
      "courseIds",
      "trialDays",
      "features",
      "isActive",
      "sortOrder",
      "isFeatured",
      "provider",
    ];

    const updates = {};
    for (const k of allowedFields) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (updates.price !== undefined) {
      const numericPrice = Number(updates.price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ success: false, message: "price must be number >= 0" });
      }
      updates.price = numericPrice;
    }

    if (updates.compareAtPrice !== undefined) {
      const numericCompare =
        updates.compareAtPrice === null || updates.compareAtPrice === "" ? null : Number(updates.compareAtPrice);
      if (numericCompare !== null && (!Number.isFinite(numericCompare) || numericCompare < 0)) {
        return res.status(400).json({ success: false, message: "compareAtPrice must be number >= 0 or null" });
      }
      updates.compareAtPrice = numericCompare;
    }

    if (updates.trialDays !== undefined) {
      const numericTrialDays = Number(updates.trialDays);
      if (!Number.isFinite(numericTrialDays) || numericTrialDays < 0) {
        return res.status(400).json({ success: false, message: "trialDays must be number >= 0" });
      }
      updates.trialDays = numericTrialDays;
    }

    if (updates.intervalCount !== undefined) {
      const numericInterval = Number(updates.intervalCount);
      if (!Number.isFinite(numericInterval) || numericInterval < 1) {
        return res.status(400).json({ success: false, message: "intervalCount must be number >= 1" });
      }
      updates.intervalCount = numericInterval;
    }

    if (updates.billingCycle !== undefined && !["monthly", "yearly"].includes(updates.billingCycle)) {
      return res.status(400).json({ success: false, message: "Invalid billingCycle" });
    }

    if (updates.accessType !== undefined && !["all", "selected"].includes(updates.accessType)) {
      return res.status(400).json({ success: false, message: "Invalid accessType" });
    }

    if (updates.provider !== undefined && !["razorpay", "stripe", "manual"].includes(String(updates.provider))) {
      return res.status(400).json({ success: false, message: "Invalid provider" });
    }

    if (updates.currency !== undefined) updates.currency = normalizeCurrency(updates.currency);

    if (updates.features !== undefined) {
      updates.features = Array.isArray(updates.features)
        ? updates.features.map((f) => String(f).trim()).filter(Boolean)
        : [];
    }

    // if plan already linked with provider (razorpay/stripe), block price/billing changes
    if (plan.providerPlanId) {
      if (updates.price !== undefined || updates.billingCycle !== undefined || updates.intervalCount !== undefined) {
        return res.status(400).json({
          success: false,
          message: "Plan is linked with payment provider. Don’t change price/billing/interval. Create a new plan instead.",
        });
      }
    }

    // accessType handling
    const nextAccessType = updates.accessType || plan.accessType;

    if (nextAccessType === "all") {
      updates.courseIds = [];
    } else if (nextAccessType === "selected") {
      const ids = updates.courseIds ?? plan.courseIds;
      if (!isValidObjectIdArray(ids)) {
        return res.status(400).json({ success: false, message: "Valid courseIds required for selected plan" });
      }
      updates.courseIds = ids;
    }

    const updated = await SubscriptionPlan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    return res.json({ success: true, plan: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate value detected" });
    }
    console.error("updatePlan error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle active (Admin)
const togglePlanActive = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    plan.isActive = !plan.isActive;
    await plan.save();

    return res.json({ success: true, plan });
  } catch (err) {
    console.error("togglePlanActive error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { createPlan, getAllPlansAdmin, updatePlan, togglePlanActive};