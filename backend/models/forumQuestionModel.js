const mongoose = require("mongoose");

const forumQuestionSchema = mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    isSolved: {
      type: Boolean,
      default: false,
    },
    verifiedAnswerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumAnswer",
      default: null,
    },
    upvotedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }],
    upvotes: {
      type: Number,
      default: 0,
    },
    isLocked: { 
      type: Boolean, 
      default: false 
    },
    reports: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }],
    lastActivityAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true }
);

forumQuestionSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("ForumQuestion", forumQuestionSchema);