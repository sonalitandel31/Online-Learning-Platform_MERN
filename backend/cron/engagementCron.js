const cron = require("node-cron");
const Course = require("../models/courseModel");
const AnalyticsEvent = require("../models/AnalyticsEventModel");
const EngagementScore = require("../models/EngagementScoreModel");

const computeAllEngagements = async () => {
  try {
    console.log("⏳ Starting nightly engagement computation...");
    const days = 30;
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const courses = await Course.find({ status: "approved" }).select("_id");

    for (let course of courses) {
      const courseId = String(course._id);

      const match = {
        ts: { $gte: from, $lte: to },
        userId: { $ne: null },
        "payload.courseId": courseId,
        event: { $in: ["lesson_complete", "video_watch_30s", "exam_attempt", "exam_complete"] },
      };

      const rows = await AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$userId",
            lessonCompletes: { $sum: { $cond: [{ $eq: ["$event", "lesson_complete"] }, 1, 0] } },
            watch30Events: { $sum: { $cond: [{ $eq: ["$event", "video_watch_30s"] }, 1, 0] } },
            examAttempts: { $sum: { $cond: [{ $eq: ["$event", "exam_attempt"] }, 1, 0] } },
            examCompletes: { $sum: { $cond: [{ $eq: ["$event", "exam_complete"] }, 1, 0] } },
            lastEventAt: { $max: "$ts" },
          },
        },
      ]);

      if (!rows.length) continue;

      const ops = rows.map((r) => {
        // Quick local calculation so we don't have to import from controllers
        const raw = (r.lessonCompletes || 0) * 8 + (r.watch30Events || 0) * 1 + (r.examAttempts || 0) * 6 + (r.examCompletes || 0) * 10;
        const score = Math.min(100, raw);

        return {
          updateOne: {
            filter: { courseId, userId: r._id },
            update: {
              $set: {
                courseId,
                userId: r._id,
                from,
                to,
                lessonCompletes: r.lessonCompletes || 0,
                watch30Events: r.watch30Events || 0,
                examAttempts: r.examAttempts || 0,
                examCompletes: r.examCompletes || 0,
                rawScore: raw,
                score: score,
                lastEventAt: r.lastEventAt || null,
              },
            },
            upsert: true,
          },
        };
      });

      await EngagementScore.bulkWrite(ops, { ordered: false });
    }
    console.log("✅ Nightly engagement computation finished!");
  } catch (error) {
    console.error("❌ Error in cron job:", error);
  }
};

const initCronJobs = () => {
  // Runs at 2:00 AM every day
  cron.schedule("0 2 * * *", () => {
    computeAllEngagements();
  });
  
  // Uncomment the line below to run it immediately on server start so you can see it working right now!
  // computeAllEngagements(); 
};

module.exports = initCronJobs;