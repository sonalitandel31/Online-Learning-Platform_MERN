const crypto = require("crypto");
const liveClassModel = require("../models/liveClassModel");
const liveAttendanceModel = require("../models/liveAttendanceModel");
const userModel = require("../models/userModel");
const { matchStudentFromZoomParticipant } = require('../services/attendanceMatcher');

const verifyZoomWebhook = (req) => {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

  if (!secret) {
    console.error("CRITICAL: ZOOM_WEBHOOK_SECRET_TOKEN is missing in environment variables.");
    return false;
  }

  const signature = req.headers["x-zm-signature"];
  const timestamp = req.headers["x-zm-request-timestamp"];

  if (!signature || !timestamp) return false;

  const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  const expectedSignature = `v0=${hash}`;
  return signature === expectedSignature;
};

exports.zoomWebhookHandler = async (req, res) => {
  try {
    const event = req.body?.event;
    const payload = req.body?.payload || {};

    // 1. Zoom endpoint URL validation event (The Handshake)
    if (event === "endpoint.url_validation") {
      const plainToken = payload?.plainToken;
      const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

      const encryptedToken = crypto
        .createHmac("sha256", secret)
        .update(plainToken)
        .digest("hex");

      return res.status(200).json({
        plainToken,
        encryptedToken,
      });
    }

    // 2. Verify all other incoming webhooks
    if (!verifyZoomWebhook(req)) {
      console.warn("Unauthorized Zoom Webhook attempt detected.");
      return res.status(401).json({ success: false, message: "Invalid Zoom webhook signature" });
    }

    // 3. PREVENT TIMEOUTS: Send 200 OK immediately
    res.status(200).json({ success: true });

    // --- ASYNCHRONOUS DATABASE PROCESSING BEGINS HERE --- //
    const object = payload?.object || {};
    const meetingId = String(object.id || "");
    const participant = object.participant || {};

    if (!meetingId) return;

    switch (event) {
      case "meeting.participant_joined": {
        console.log("\n=== ZOOM WEBHOOK RECEIVED: PARTICIPANT JOINED ===");
        console.log("Raw Zoom Data:", JSON.stringify(participant, null, 2));

        const joinTime = new Date(participant.join_time);
        const liveClass = await liveClassModel.findOne({ meetingId });
        
        // Pass the entire participant object so it can try matching by name if email is missing
        const student = await matchStudentFromZoomParticipant(participant);
        
        console.log("Matcher Result:", student ? `Matched LMS Student: ${student.email}` : "NO MATCH FOUND");

        if (!liveClass || !student) {
          console.log("-> Action: Dropped (Could not find LiveClass or matching Student in DB)");
          break;
        }

        console.log(`-> Action: Recording JOIN at ${joinTime.toISOString()}`);
        await liveAttendanceModel.findOneAndUpdate(
          { liveClass: liveClass._id, student: student._id },
          { $push: { joinTimes: joinTime } },
          { upsert: true, new: true }
        );
        break;
      }

      case "meeting.participant_left": {
        console.log("\n=== ZOOM WEBHOOK RECEIVED: PARTICIPANT LEFT ===");
        console.log("Raw Zoom Data:", JSON.stringify(participant, null, 2));

        const leaveTime = new Date(participant.leave_time);
        const liveClass = await liveClassModel.findOne({ meetingId });
        const student = await matchStudentFromZoomParticipant(participant);

        console.log("Matcher Result:", student ? `Matched LMS Student: ${student.email}` : "NO MATCH FOUND");

        if (!liveClass || !student) {
          console.log("-> Action: Dropped (Could not find LiveClass or matching Student in DB)");
          break;
        }

        const attendance = await liveAttendanceModel.findOne({
          liveClass: liveClass._id,
          student: student._id
        });

        if (attendance) {
          const lastJoinTime = attendance.joinTimes[attendance.joinTimes.length - 1];
          let sessionDurationMinutes = 0;

          if (lastJoinTime) {
            sessionDurationMinutes = (leaveTime - lastJoinTime) / (1000 * 60);
          }

          console.log(`-> Action: Recording LEAVE at ${leaveTime.toISOString()}. Session Duration: ${Math.round(sessionDurationMinutes)} mins`);
          await liveAttendanceModel.updateOne(
            { _id: attendance._id },
            {
              $push: { leaveTimes: leaveTime },
              $inc: { totalDuration: Math.max(0, sessionDurationMinutes) }
            }
          );
        }
        break;
      }

      case "meeting.ended": {
        console.log(`\n=== ZOOM WEBHOOK: MEETING ENDED (${meetingId}) ===`);
        await liveClassModel.updateOne(
          { meetingId, status: { $ne: "cancelled" } },
          { $set: { status: "ended" } }
        );
        break;
      }

      case "recording.completed": {
        console.log(`\n=== ZOOM WEBHOOK: RECORDING COMPLETED (${meetingId}) ===`);
        const recordingFiles = Array.isArray(object.recording_files) ? object.recording_files : [];

        const firstPlayableFile =
          recordingFiles.find((f) => f.play_url) ||
          recordingFiles.find((f) => f.download_url) ||
          null;

        const recordingUrl = firstPlayableFile?.play_url || firstPlayableFile?.download_url || "";

        if (recordingUrl) {
          await liveClassModel.updateOne(
            { meetingId },
            {
              $set: {
                recordingLink: recordingUrl,
                recordingStatus: "ready",
                recordingAvailableAt: new Date(),
                recordingProviderId: String(object.uuid || ""),
                recordingDurationMin: Number(object.duration || 0)
              }
            }
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Zoom Webhook Processing Error:", err.message);
  }
};