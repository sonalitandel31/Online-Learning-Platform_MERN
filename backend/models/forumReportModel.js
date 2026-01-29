const { default: mongoose } = require("mongoose");

const forumReportSchema = mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["question", "answer", "reply"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      default: null,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    //reason: { type: String, required: true },
    reason: {
      type: String,
      enum: ["spam", "abuse", "harassment", "misinformation", "other"],
      required: true
    },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    actionNote: { type: String, default: "" },
    actionAt: { type: Date, default: null },
  },
  { timestamps: true }
);

forumReportSchema.index({ targetUserId: 1, reason: 1, status: 1 });
forumReportSchema.index({ courseId: 1, status: 1, createdAt: -1 });
forumReportSchema.index({ targetType: 1, targetId: 1, reporterId: 1, status: 1 });

module.exports = mongoose.model("ForumReport", forumReportSchema);
