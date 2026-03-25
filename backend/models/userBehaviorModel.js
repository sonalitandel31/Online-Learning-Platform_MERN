const mongoose = require("mongoose");

const userBehaviorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "course" },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "lesson" },
  timeSpentSeconds: { type: Number, default: 0 },
  rewindCount: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 }, // percentage of video watched
  interactionDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("userBehavior", userBehaviorSchema);