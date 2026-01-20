// models/forumReplyModel.js  (2-level only: answer -> reply)
const { default: mongoose } = require("mongoose");

const forumReplySchema = mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumQuestion",
      required: true,
      index: true,
    },

    // 2-level ONLY: reply must be under an answer
    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumAnswer",
      required: true,
      index: true,
    },

    // keep for future threaded mode, but in 2-level it should always remain null
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumReply",
      default: null,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    replyText: {
      type: String,
      required: true,
      trim: true,
    },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    deleteReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// Useful compound index for fast fetch in UI (question -> answer -> replies)
forumReplySchema.index({ questionId: 1, answerId: 1, createdAt: 1 });

module.exports = mongoose.model("ForumReply", forumReplySchema);
