const mongoose = require("mongoose");
const UserSubscription = require("../models/userSubscriptionModel");
const SubscriptionPayment = require("../models/subscriptionPaymentModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

const toDate = (v, fallback) => {
  const dt = v ? new Date(v) : fallback;
  return Number.isNaN(dt.getTime()) ? fallback : dt;
};

// ✅ MRR: sum(monthly) + sum(yearly)/12 for ACTIVE subscriptions
exports.getRevenueOverview = async (req, res) => {
  try {
    const now = new Date();

    const from = toDate(req.query.from, startOfMonth(now));
    const to = toDate(req.query.to, endOfMonth(now));

    // 1) Revenue received in range (payments)
    // Uses paymentDate if present else createdAt.
    const revenueAgg = await SubscriptionPayment.aggregate([
      {
        $match: {
          status: "completed",
          $or: [
            { paymentDate: { $gte: from, $lt: to } },
            { paymentDate: { $exists: false }, createdAt: { $gte: from, $lt: to } },
          ],
        },
      },
      {
        $addFields: {
          effectiveDate: { $ifNull: ["$paymentDate", "$createdAt"] },
        },
      },
      { $match: { effectiveDate: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$amount" },
          payments: { $sum: 1 },
        },
      },
    ]);

    const revenue = revenueAgg?.[0]?.revenue || 0;
    const payments = revenueAgg?.[0]?.payments || 0;

    // 2) Active subscriptions count + MRR/ARR
    // Active = status active AND endDate > now
    const mrrAgg = await UserSubscription.aggregate([
      {
        $match: {
          status: "active",
          endDate: { $gt: now },
        },
      },
      {
        $lookup: {
          from: SubscriptionPlan.collection.name,
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: "$plan" },
      {
        $group: {
          _id: null,
          activeSubs: { $sum: 1 },
          monthlyMRR: {
            $sum: {
              $cond: [
                { $eq: ["$plan.billingCycle", "monthly"] },
                "$plan.price",
                0,
              ],
            },
          },
          yearlyAsMRR: {
            $sum: {
              $cond: [
                { $eq: ["$plan.billingCycle", "yearly"] },
                { $divide: ["$plan.price", 12] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          activeSubs: 1,
          mrr: { $add: ["$monthlyMRR", "$yearlyAsMRR"] },
        },
      },
    ]);

    const activeSubs = mrrAgg?.[0]?.activeSubs || 0;
    const mrr = Number(mrrAgg?.[0]?.mrr || 0);
    const arr = mrr * 12;

    // 3) New subscriptions started in range
    const newSubs = await UserSubscription.countDocuments({
      createdAt: { $gte: from, $lt: to },
    });

    // 4) Cancellations in range
    const cancelledSubs = await UserSubscription.countDocuments({
      status: "cancelled",
      cancelAt: { $gte: from, $lt: to },
    });

    // 5) Past due count (current)
    const pastDueSubs = await UserSubscription.countDocuments({
      status: "past_due",
    });

    return res.json({
      success: true,
      range: { from, to },
      kpis: {
        revenue,
        payments,
        mrr,
        arr,
        activeSubs,
        newSubs,
        cancelledSubs,
        pastDueSubs,
      },
    });
  } catch (err) {
    console.error("getRevenueOverview error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Timeseries revenue by month (last N months)
exports.getRevenueTimeseries = async (req, res) => {
  try {
    const now = new Date();
    const months = Math.min(Math.max(Number(req.query.months || 12), 1), 36);

    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const rows = await SubscriptionPayment.aggregate([
      { $match: { status: "completed" } },
      {
        $addFields: {
          effectiveDate: { $ifNull: ["$paymentDate", "$createdAt"] },
        },
      },
      { $match: { effectiveDate: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            y: { $year: "$effectiveDate" },
            m: { $month: "$effectiveDate" },
          },
          revenue: { $sum: "$amount" },
          payments: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);

    // Fill missing months with 0
    const map = new Map();
    for (const r of rows) {
      const key = `${r._id.y}-${String(r._id.m).padStart(2, "0")}`;
      map.set(key, { revenue: r.revenue, payments: r.payments });
    }

    const series = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const item = map.get(key) || { revenue: 0, payments: 0 };
      series.push({ month: key, ...item });
    }

    return res.json({
      success: true,
      range: { start, end },
      series,
    });
  } catch (err) {
    console.error("getRevenueTimeseries error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ MRR timeseries (active subs snapshot per month, last N months)
exports.getMRRTimeseries = async (req, res) => {
  try {
    const now = new Date();
    const months = Math.min(Math.max(Number(req.query.months || 12), 1), 36);

    // We compute MRR for each month-end snapshot using endDate/startDate windows.
    // Snapshot date = first day of next month (exclusive upper bound)
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const series = [];

    for (let i = 0; i < months; i++) {
      const snapStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const snapEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1); // snapshot point

      // active at snapshot if:
      // startDate < snapEnd AND endDate >= snapEnd AND status active
      const agg = await UserSubscription.aggregate([
        {
          $match: {
            status: "active",
            startDate: { $lt: snapEnd },
            endDate: { $gte: snapEnd },
          },
        },
        {
          $lookup: {
            from: SubscriptionPlan.collection.name,
            localField: "planId",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: null,
            activeSubs: { $sum: 1 },
            monthlyMRR: {
              $sum: {
                $cond: [{ $eq: ["$plan.billingCycle", "monthly"] }, "$plan.price", 0],
              },
            },
            yearlyAsMRR: {
              $sum: {
                $cond: [
                  { $eq: ["$plan.billingCycle", "yearly"] },
                  { $divide: ["$plan.price", 12] },
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            activeSubs: 1,
            mrr: { $add: ["$monthlyMRR", "$yearlyAsMRR"] },
          },
        },
      ]);

      const monthKey = `${snapStart.getFullYear()}-${String(snapStart.getMonth() + 1).padStart(2, "0")}`;
      series.push({
        month: monthKey,
        mrr: Number(agg?.[0]?.mrr || 0),
        activeSubs: agg?.[0]?.activeSubs || 0,
      });
    }

    return res.json({ success: true, series });
  } catch (err) {
    console.error("getMRRTimeseries error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};