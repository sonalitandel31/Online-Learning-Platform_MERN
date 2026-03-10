const { default: mongoose } = require("mongoose");

const liveClassSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
      index: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    provider: {
      type: String,
      enum: ["zoom", "webrtc"],
      default: "zoom",
    },

    startAt: { type: Date, required: true, index: true },
    durationMin: { type: Number, default: 60, min: 10, max: 600 },

    meetingLink: { type: String, required: true, trim: true },
    recordingLink: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "cancelled"],
      default: "scheduled",
      index: true,
    },

    reminder10Sent: { type: Boolean, default: false },
    emailCreatedSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

liveClassSchema.index({ course: 1, startAt: 1 });
liveClassSchema.index({ instructor: 1, startAt: 1 });
liveClassSchema.index({ status: 1, startAt: 1 });

liveClassSchema.methods.getEndTime = function () {
  return new Date(new Date(this.startAt).getTime() + Number(this.durationMin || 60) * 60000);
};

module.exports = mongoose.model("liveClass", liveClassSchema);