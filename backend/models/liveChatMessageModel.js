const mongoose = require("mongoose");

const liveChatMessageSchema = new mongoose.Schema(
  {
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "liveClass",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "instructor", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

liveChatMessageSchema.index({ liveClass: 1, createdAt: 1 });

module.exports = mongoose.model("liveChatMessage", liveChatMessageSchema);