const mongoose = require("mongoose");

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

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    provider: {
      type: String,
      enum: ["zoom", "webrtc"],
      default: "zoom",
      index: true,
    },

    // Useful for future Zoom/WebRTC integration
    meetingId: {
      type: String,
      default: "",
      trim: true,
    },

    meetingPassword: {
      type: String,
      default: "",
      trim: true,
    },

    roomName: {
      type: String,
      default: "",
      trim: true,
    },

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationMin: {
      type: Number,
      default: 60,
      min: 10,
      max: 600,
    },

    meetingLink: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "cancelled"],
      default: "scheduled",
      index: true,
    },

    // Reminder / email flags
    reminder10Sent: {
      type: Boolean,
      default: false,
    },

    emailCreatedSent: {
      type: Boolean,
      default: false,
    },

    recordingReadyEmailSent: {
      type: Boolean,
      default: false,
    },

    // Recording support
    recordingMode: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
    },

    recordingLink: {
      type: String,
      default: "",
      trim: true,
    },

    recordingStatus: {
      type: String,
      enum: ["not_available", "processing", "ready"],
      default: "not_available",
      index: true,
    },

    recordingProviderId: {
      type: String,
      default: "",
      trim: true,
    },

    recordingDurationMin: {
      type: Number,
      default: 0,
      min: 0,
    },

    recordingAvailableAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },

    rescheduledAt: {
      type: Date,
      default: null,
    },

    lastStatusSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

liveClassSchema.index({ course: 1, startAt: 1 });
liveClassSchema.index({ instructor: 1, startAt: 1 });
liveClassSchema.index({ status: 1, startAt: 1 });
liveClassSchema.index({ provider: 1, status: 1, startAt: 1 });

liveClassSchema.methods.getEndTime = function () {
  return new Date(
    new Date(this.startAt).getTime() + Number(this.durationMin || 60) * 60000
  );
};

liveClassSchema.methods.canBeJoined = function (now = new Date()) {
  if (this.status === "cancelled" || this.status === "ended") return false;

  const startAt = new Date(this.startAt);
  const joinWindowMs = 10 * 60 * 1000;

  if (this.status === "live") return true;
  if (this.status === "scheduled") {
    return startAt.getTime() - now.getTime() <= joinWindowMs;
  }

  return false;
};

liveClassSchema.methods.isEditableBeforeStart = function () {
  return this.status === "scheduled";
};

module.exports = mongoose.model("liveClass", liveClassSchema);