const mongoose = require("mongoose");

const liveAttendanceSchema = new mongoose.Schema(
  {
    // Live class reference
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "liveClass",
      required: true,
      index: true,
    },

    // Student reference
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    // Zoom participant identifiers
    zoomParticipantId: {
      type: String,
      default: null,
    },

    zoomUserEmail: {
      type: String,
      default: null,
    },

    zoomUserName: {
      type: String,
      default: null,
    },

    // Arrays to track multiple join/leave cycles (handles disconnects automatically)
    joinTimes: [
      {
        type: Date,
      }
    ],

    leaveTimes: [
      {
        type: Date,
      }
    ],

    // Total minutes attended across all join/leave cycles
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Attendance status
    attendanceStatus: {
      type: String,
      enum: ["absent", "partial", "present"],
      default: "absent",
      index: true,
    },

    // How the student joined
    joinSource: {
      type: String,
      enum: ["meeting_link", "system", "manual"],
      default: "meeting_link",
    },

    // Flag if attendance was corrected via reconciliation script (syncLiveClassAttendance)
    reconciled: {
      type: Boolean,
      default: false,
    },

    // For analytics/debugging
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance records
liveAttendanceSchema.index({ liveClass: 1, student: 1 }, { unique: true });

// Faster filtering for instructor dashboard
liveAttendanceSchema.index({ liveClass: 1, attendanceStatus: 1 });

// Query performance for reconciliation
liveAttendanceSchema.index({ zoomParticipantId: 1 });

module.exports = mongoose.model("liveAttendance", liveAttendanceSchema);