const { default: mongoose } = require("mongoose");

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumAnswer", forumAnswerSchema);
