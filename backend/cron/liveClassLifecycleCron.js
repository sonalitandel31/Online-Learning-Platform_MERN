const cron = require("node-cron");
const liveClassModel = require("../models/liveClassModel");
const liveAttendanceModel = require("../models/liveAttendanceModel");
// FIXED: Added missing import
const enrollmentModel = require("../models/enrollmentModel"); 
const { syncLiveClassAttendance } = require("../services/liveAttendanceSyncService");

/**
 * Enhanced Attendance Logic
 */
const getAttendanceStatus = (totalDuration, classDurationMin) => {
  const attended = Math.max(0, Number(totalDuration || 0));
  const total = Math.max(1, Number(classDurationMin || 0));

  if (attended < 5) return "absent";
  const ratio = attended / total;

  if (ratio >= 0.70) return "present";
  return "partial";
};

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const classes = await liveClassModel.find({
      status: { $in: ["scheduled", "live"] },
    });

    for (const liveClass of classes) {
      const startAt = new Date(liveClass.startAt);
      const endAt = liveClass.getEndTime();

      let nextStatus = liveClass.status;

      if (now >= endAt) {
        nextStatus = "ended";
      } else if (now >= startAt && now < endAt) {
        nextStatus = "live";
      }

      if (nextStatus !== liveClass.status) {
        console.log(`Class ${liveClass.title} transitioning: ${liveClass.status} -> ${nextStatus}`);

        liveClass.status = nextStatus;
        liveClass.lastStatusSyncedAt = now;
        await liveClass.save();

        if (nextStatus === "ended") {
          console.log(`Class ${liveClass._id} ended. Finalizing all enrollments...`);

          // 1. Get all students enrolled in this course
          const enrollments = await enrollmentModel.find({
            course: liveClass.course,
            status: { $in: ["active", "completed"] }
          }).select("student");

          const enrolledStudentIds = enrollments.map(e => String(e.student));

          // 2. Get students who DID attend (website joiners)
          const attendees = await liveAttendanceModel.find({
            liveClass: liveClass._id
          });

          const attendeeStudentIds = attendees.map(a => String(a.student));

          // 3. Process existing attendees (Update status and close open sessions)
          for (const row of attendees) {
            if (row.joinTimes.length > row.leaveTimes.length) {
              row.leaveTimes.push(endAt);
              const lastJoin = row.joinTimes[row.joinTimes.length - 1];
              const diffMs = endAt.getTime() - new Date(lastJoin).getTime();
              row.totalDuration += Math.max(0, Math.round(diffMs / 60000));
            }
            row.attendanceStatus = getAttendanceStatus(row.totalDuration, liveClass.durationMin);
            await row.save();
          }

          // 4. Handle "Ghost" Students (Enrolled but never clicked join)
          const missingStudentIds = enrolledStudentIds.filter(id => !attendeeStudentIds.includes(id));

          if (missingStudentIds.length > 0) {
            const absentRecords = missingStudentIds.map(studentId => ({
              liveClass: liveClass._id,
              student: studentId,
              attendanceStatus: "absent",
              totalDuration: 0,
              joinTimes: [],
              leaveTimes: []
            }));

            await liveAttendanceModel.insertMany(absentRecords);
            console.log(`Marked ${missingStudentIds.length} enrolled students as Absent.`);
          }

          // 5. Trigger the Zoom Backup Sync (WRAP IN TRY/CATCH OR COMMENT IF ON FREE TIER)
          // Since you're on a free tier, this will keep erroring. 
          // I am wrapping it in a safety check so it doesn't clutter your logs.
          /*
          setTimeout(async () => {
            try {
               console.log(`Attempting Zoom Sync for ${liveClass._id}...`);
               await syncLiveClassAttendance(liveClass._id);
            } catch (err) {
               console.log("Zoom Sync skipped: Likely Free Account limitation.");
            }
          }, 5 * 60 * 1000);
          */
        }
      }
    }
  } catch (err) {
    console.error("Live class lifecycle cron error:", err.message);
  }
});