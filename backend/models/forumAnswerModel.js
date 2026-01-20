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

    answerText: { type: String, required: true },

    // Instructor validation
    isVerified: { type: Boolean, default: false },

    // Student acceptance (owner of question)
    isAccepted: { type: Boolean, default: false },

    // Likes/upvotes
    upvotes: { type: Number, default: 0 },
    upvotedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] },
    ],

    // Soft delete + audit
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    deleteReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumAnswer", forumAnswerSchema);
