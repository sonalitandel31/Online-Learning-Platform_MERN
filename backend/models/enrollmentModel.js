const { default: mongoose } = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true,
  },
  amount: {
    type: Number,
    required: false,
    default: 0,
  },
  paymentId: {
    type: String,
  },
  orderId: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "complete", "failed"],
    default: "pending",
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completedLessons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "lesson",
    },
  ],
  examProgress: [
    {
      examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "exam",
        required: true,
      },
      attempts: {
        type: Number,
        default: 0,
        max: 3,
      },
      bestScore: {
        type: Number,
        default: 0,
      },
      lastAttemptAt: {
        type: Date,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
    },
  ],
  certificate: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("enrollment", enrollmentSchema);
