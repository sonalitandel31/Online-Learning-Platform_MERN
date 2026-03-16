const mongoose = require("mongoose");

const liveQuestionSchema = new mongoose.Schema(
  {
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "liveClass",
      required: true,
      index: true,
    },
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["open", "answered"],
      default: "open",
      index: true,
    },
    answer: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

liveQuestionSchema.index({ liveClass: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("liveQuestion", liveQuestionSchema);