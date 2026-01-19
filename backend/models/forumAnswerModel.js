const mongoose = require("mongoose");

const forumAnswerSchema = mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumQuestion",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumAnswer",
      default: null
    },
    answerText: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    upvotedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: []
    }],
    reports: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumAnswer", forumAnswerSchema);