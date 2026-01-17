const { default: mongoose } = require("mongoose");

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
    upvotes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumQuestion", forumQuestionSchema);
