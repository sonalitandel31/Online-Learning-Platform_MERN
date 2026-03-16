const liveClassModel = require("../models/liveClassModel");
const liveAttendanceModel = require("../models/liveAttendanceModel");
const { getPastMeetingParticipants } = require("../config/zoom");
const { matchStudentFromZoomParticipant } = require("./attendanceMatcher");

const syncLiveClassAttendance = async (liveClassId) => {
  try {
    const liveClass = await liveClassModel.findById(liveClassId);

    if (!liveClass || !liveClass.meetingId) {
      console.log("Attendance sync: live class or meetingId not found");
      return;
    }

    console.log("Fetching Zoom participants for meeting:", liveClass.meetingId);

    // Ensure getPastMeetingParticipants in config/zoom.js handles the pagination
    const participants = await getPastMeetingParticipants(liveClass.meetingId);

    if (!participants || participants.length === 0) {
      console.log("No participants found for meeting");
      return;
    }

    // Step 1: Group participant data by email.
    // Zoom returns multiple rows if a student drops and reconnects. We must merge them.
    const userSessions = {};
    
    for (const p of participants) {
      const email = (p.user_email || "").trim().toLowerCase();
      if (!email) continue;

      if (!userSessions[email]) {
        userSessions[email] = {
          zoomUserEmail: email,
          zoomUserName: p.name,
          joinTimes: [],
          leaveTimes: [],
          totalDuration: 0,
        };
      }

      if (p.join_time) userSessions[email].joinTimes.push(new Date(p.join_time));
      if (p.leave_time) userSessions[email].leaveTimes.push(new Date(p.leave_time));
      
      // Zoom API returns duration in seconds, divide by 60 for minutes
      const sessionMinutes = Math.round(Number(p.duration || 0) / 60);
      userSessions[email].totalDuration += sessionMinutes;
    }

    // Step 2: Match with DB and update records
    const classDuration = Number(liveClass.durationMin || liveClass.duration || 60);

    for (const email of Object.keys(userSessions)) {
      const sessionData = userSessions[email];
      const student = await matchStudentFromZoomParticipant({ 
        email, 
        user_name: sessionData.zoomUserName 
      });

      if (!student) continue;

      // Sort arrays to ensure timeline accuracy
      sessionData.joinTimes.sort((a, b) => a - b);
      sessionData.leaveTimes.sort((a, b) => a - b);

      // Determine Attendance Status (e.g., 70% threshold to be marked Present)
      let status = "absent";
      if (sessionData.totalDuration >= classDuration * 0.7) {
        status = "present";
      } else if (sessionData.totalDuration > 0) {
        status = "partial";
      }

      // Upsert the reconciled data
      await liveAttendanceModel.findOneAndUpdate(
        { liveClass: liveClass._id, student: student._id },
        {
          $set: {
            zoomUserEmail: sessionData.zoomUserEmail,
            zoomUserName: sessionData.zoomUserName,
            joinTimes: sessionData.joinTimes,
            leaveTimes: sessionData.leaveTimes,
            totalDuration: sessionData.totalDuration,
            attendanceStatus: status,
            reconciled: true,
          }
        },
        { upsert: true, new: true }
      );
    }

    console.log("Attendance reconciliation completed");
  } catch (err) {
    console.error("Attendance sync error:", err.message);
  }
};

module.exports = {
  syncLiveClassAttendance,
};