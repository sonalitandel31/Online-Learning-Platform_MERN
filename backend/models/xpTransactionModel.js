const { default: mongoose } = require("mongoose");

const xpTransactionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "student", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },

    event: {
      type: String,
      enum: ["LESSON_COMPLETE", "EXAM_PASS", "COURSE_COMPLETE"],
      required: true,
    },

    // lessonId / examId / courseId etc
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },

    xp: { type: Number, required: true, min: 1 },

    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// ✅ Prevent XP farming (same event + same refId once)
xpTransactionSchema.index({ student: 1, event: 1, refId: 1 }, { unique: true });
xpTransactionSchema.index({ course: 1, createdAt: -1 });

module.exports = mongoose.model("xpTransaction", xpTransactionSchema);
