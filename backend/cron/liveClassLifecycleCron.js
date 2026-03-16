const cron = require("node-cron");
const liveClassModel = require("../models/liveClassModel");
const liveAttendanceModel = require("../models/liveAttendanceModel");
// Import the sync service we built earlier
const { syncLiveClassAttendance } = require("../services/liveAttendanceSyncService");

const getAttendanceStatus = (totalDuration, classDurationMin) => {
  const total = Math.max(1, Number(classDurationMin || 0));
  const attended = Math.max(0, Number(totalDuration || 0));
  const ratio = attended / total;

  // Aligning with the 70% threshold we established in the sync service
  if (ratio >= 0.70) return "present";
  if (ratio > 0) return "partial";
  return "absent";
};

// Every minute sync scheduled/live/ended states
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    // Fetch classes that might need a status transition
    const classes = await liveClassModel.find({
      status: { $in: ["scheduled", "live"] },
    });

    for (const liveClass of classes) {
      const startAt = new Date(liveClass.startAt);
      const endAt = liveClass.getEndTime(); // Using the excellent fat model method you wrote

      let nextStatus = liveClass.status;

      if (now >= endAt) {
        nextStatus = "ended";
      } else if (now >= startAt && now < endAt) {
        nextStatus = "live";
      }

      // If the status needs to change, update it
      if (nextStatus !== liveClass.status) {
        liveClass.status = nextStatus;
        liveClass.lastStatusSyncedAt = now;
        await liveClass.save();

        // --- WHEN A CLASS ENDS ---
        if (nextStatus === "ended") {
          console.log(`Class ${liveClass._id} ended. Closing attendance records...`);
          
          const attendanceList = await liveAttendanceModel.find({
            liveClass: liveClass._id,
          });

          for (const row of attendanceList) {
            // NEW SCHEMA LOGIC: Check if they never "left" via webhook 
            // (If joinTimes has more entries than leaveTimes, they were active when class ended)
            if (row.joinTimes.length > row.leaveTimes.length) {
              row.leaveTimes.push(endAt);
              
              const lastJoin = row.joinTimes[row.joinTimes.length - 1];
              const diffMs = endAt.getTime() - new Date(lastJoin).getTime();
              const minutes = Math.max(0, Math.round(diffMs / 60000));
              
              row.totalDuration += minutes;
            }

            row.attendanceStatus = getAttendanceStatus(
              row.totalDuration,
              liveClass.durationMin
            );

            await row.save();
          }

          // THE MASTER STROKE: Trigger the Zoom REST API Fallback Sync!
          // We wrap it in a setTimeout of 5 minutes so Zoom's servers have time 
          // to compile the final meeting report before we fetch it.
          // We don't 'await' it so the cron job finishes its sweep immediately.
          setTimeout(() => {
            console.log(`Initiating backup sync for class ${liveClass._id}...`);
            syncLiveClassAttendance(liveClass._id).catch(console.error);
          }, 5 * 60 * 1000); 
        }
      }
    }
  } catch (err) {
    console.error("Live class lifecycle cron error:", err.message);
  }
});