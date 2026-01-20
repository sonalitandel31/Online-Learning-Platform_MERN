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

    reason: { type: String, required: true },
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

module.exports = mongoose.model("ForumReport", forumReportSchema);
