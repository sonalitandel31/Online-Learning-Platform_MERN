const mongoose = require("mongoose");

const AnalyticsEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    sessionId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    role: { type: String, default: null },

    path: { type: String, default: null, index: true },
    referrer: { type: String, default: null },
    ua: { type: String, default: null },
    tz: { type: String, default: null },

    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
