const mongoose = require("mongoose");

const EngagementScoreSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },

    // range used for this calculation
    from: { type: Date, required: true },
    to: { type: Date, required: true },

    // counts
    lessonCompletes: { type: Number, default: 0 },
    watch30Events: { type: Number, default: 0 },
    examAttempts: { type: Number, default: 0 },
    examCompletes: { type: Number, default: 0 },

    rawScore: { type: Number, default: 0 },
    score: { type: Number, default: 0 }, // 0-100

    lastEventAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EngagementScoreSchema.index({ courseId: 1, userId: 1, from: 1, to: 1 }, { unique: true });

module.exports = mongoose.model("EngagementScore", EngagementScoreSchema);
