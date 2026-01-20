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

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    // Question status
    isSolved: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },

    // Accepted & Verified (SEPARATE concepts)
    acceptedAnswerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumAnswer",
      default: null,
    },
    verifiedAnswerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumAnswer",
      default: null,
    },

    // Optional: question upvotes (you can implement later)
    upvotes: { type: Number, default: 0 },

    // Advanced / optional
    isPinned: { type: Boolean, default: false },
    tags: { type: [String], default: [] },

    lastActivityAt: { type: Date, default: Date.now },

    // Soft delete + audit
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    deleteReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumQuestion", forumQuestionSchema);
