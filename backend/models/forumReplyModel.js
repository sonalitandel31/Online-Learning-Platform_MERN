const { default: mongoose } = require("mongoose");

const forumReplySchema = mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumQuestion",
      required: true,
      index: true,
    },

    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumAnswer",
      required: true,
      index: true,
    },

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

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    deleteReason: { type: String, default: "" },
  },
  { timestamps: true }
);

forumReplySchema.index({ questionId: 1, answerId: 1, createdAt: 1 });

module.exports = mongoose.model("ForumReply", forumReplySchema);
