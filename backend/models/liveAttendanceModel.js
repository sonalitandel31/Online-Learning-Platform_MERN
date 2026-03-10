const { default: mongoose } = require("mongoose");

const liveAttendanceSchema = new mongoose.Schema(
  {
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "liveClass",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    joinAt: { type: Date, default: null },
    leaveAt: { type: Date, default: null },
    minutesAttended: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

liveAttendanceSchema.index({ liveClass: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("liveAttendance", liveAttendanceSchema);