const AnalyticsEvent = require("../models/AnalyticsEventModel");
const EngagementScore = require("../models/EngagementScoreModel");

let Course;
try {
  Course = require("../models/courseModel");
} catch (e) {
  Course = null;
}

const getInstructorCourseIds = async (instructorId) => {
  if (!Course) return [];

  const id = instructorId;
  const courses = await Course.find({
    $or: [
      { instructor: id },
      { instructorId: id },
      { createdBy: id },
      { userId: id },
      { owner: id },
    ],
  }).select("_id");

  return courses.map((c) => String(c._id));
};

const normalizeEvent = (e) => {
  if (!e || typeof e !== "object") return null;

  const event = String(e.event || "").trim();
  if (!event) return null;

  return {
    event,
    payload: e.payload || {},
    sessionId: e.sessionId || null,
    userId: e.userId || null,
    role: e.role || null,
    path: e.path || null,
    referrer: e.referrer || null,
    ua: e.ua || null,
    tz: e.tz || null,
    ts: e.ts ? new Date(e.ts) : new Date(),
    createdAt: new Date(),
  };
};

const trackSingle = async (req, res) => {
  try {
    const doc = normalizeEvent(req.body);
    if (!doc) return res.status(400).json({ success: false, message: "Invalid event" });

    // if token user exists, override
    if (req.user?._id) {
      doc.forEach(d => {
        d.userId = req.user._id;
        d.role = req.user.role;
      });
    }

    await AnalyticsEvent.create(doc);
    return res.json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false }); // never block UI
  }
};

const trackBatch = async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) return res.status(400).json({ success: false, message: "No events" });

    const docs = events.map(normalizeEvent).filter(Boolean);
    if (!docs.length) return res.status(400).json({ success: false, message: "Invalid events" });

    if (req.user?._id) {
      docs.forEach(d => {
        d.userId = req.user._id;
        d.role = req.user.role;
      });
    }

    await AnalyticsEvent.insertMany(docs, { ordered: false });
    return res.json({ success: true, inserted: docs.length });
  } catch (e) {
    return res.status(200).json({ success: false });
  }
};

const getOverview = async (req, res) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const match = { ts: { $gte: fromDate, $lte: toDate } };

    const [totalEvents, uniqueUsers, eventBreakdown, topPages, topCourses] = await Promise.all([
      AnalyticsEvent.countDocuments(match),

      AnalyticsEvent.distinct("userId", match).then((arr) => arr.filter(Boolean).length),

      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$event", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$path", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$payload.courseId", count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      success: true,
      range: { from: fromDate, to: toDate },
      totalEvents,
      uniqueUsers,
      eventBreakdown,
      topPages,
      topCourses,
    });
  } catch (err) {
    console.error("getOverview error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getDAU = async (req, res) => {
  try {
    const days = Number(req.query.days || 14);
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const dau = await AnalyticsEvent.aggregate([
      {
        $match: {
          ts: { $gte: start },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
          users: { $addToSet: "$userId" },
          events: { $sum: 1 },
        },
      },
      {
        $project: {
          date: "$_id",
          dau: { $size: "$users" },
          events: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.json({ success: true, dau });
  } catch (err) {
    console.error("getDAU error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const studentMe = async (req, res) => {
  try {
    const userId = req.user._id;
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const [lessonCompletes, courseOpens, watch30] = await Promise.all([
      AnalyticsEvent.countDocuments({ userId, event: "lesson_complete", ts: { $gte: from } }),
      AnalyticsEvent.countDocuments({ userId, event: "course_open", ts: { $gte: from } }),
      AnalyticsEvent.countDocuments({ userId, event: "video_watch_30s", ts: { $gte: from } }),
    ]);

    res.json({
      success: true,
      rangeDays: 30,
      metrics: {
        lessonCompletes,
        courseOpens,
        watch30Events: watch30,
        approxWatchMinutes: Math.floor((watch30 * 30) / 60),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const instructorMe = async (req, res) => {
  try {
    const userId = req.user._id;
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const events = await AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: from } } },
      {
        $group: {
          _id: "$event",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, rangeDays: 30, events });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const courseAnalytics = async (req, res) => {
  try {
    const courseId = String(req.params.id);

    const from = new Date();
    from.setDate(from.getDate() - 30);

    const events = await AnalyticsEvent.aggregate([
      { $match: { ts: { $gte: from }, "payload.courseId": courseId } },
      {
        $group: {
          _id: "$event",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, courseId, rangeDays: 30, events });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const calcScore = ({ lessonCompletes, watch30Events, examAttempts, examCompletes }) => {
  const raw =
    (lessonCompletes || 0) * 8 +
    (watch30Events || 0) * 1 +
    (examAttempts || 0) * 6 +
    (examCompletes || 0) * 10;

  return { rawScore: raw, score: Math.min(100, raw) };
};

// Compute engagement for a course (and save in DB)
const computeCourseEngagement = async (req, res) => {
  try {
    const courseId = String(req.params.id);
    const days = Number(req.query.days || 30);

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

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

    if (!rows.length) {
      return res.json({ success: true, message: "No data for this course in range", inserted: 0 });
    }

    // Upsert per user
    const ops = rows.map((r) => {
      const { rawScore, score } = calcScore(r);

      return {
        updateOne: {
          filter: { courseId, userId: r._id, from, to },
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
              rawScore,
              score,
              lastEventAt: r.lastEventAt || null,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await EngagementScore.bulkWrite(ops, { ordered: false });

    return res.json({
      success: true,
      courseId,
      rangeDays: days,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      total: rows.length,
    });
  } catch (e) {
    console.error("computeCourseEngagement error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get leaderboard for a course
const getCourseEngagementLeaderboard = async (req, res) => {
  try {
    const courseId = String(req.params.id);
    const days = Number(req.query.days || 30);

    // We store by exact from/to, so we query latest by "createdAt"
    const leaderboard = await EngagementScore.find({ courseId })
      .sort({ score: -1, rawScore: -1, updatedAt: -1 })
      .limit(50)
      .populate("userId", "name email role");

    // (Optional) you can filter by range if you want strict range matching,
    // but simplest is: always run compute first, then read leaderboard.

    res.json({ success: true, courseId, rangeDays: days, leaderboard });
  } catch (e) {
    console.error("getCourseEngagementLeaderboard error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const studentEngagementMe = async (req, res) => {
  try {
    const userId = req.user._id;

    const rows = await EngagementScore.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ success: true, rows });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getCourseDropoutRisk = async (req, res) => {
  try {
    const courseId = String(req.params.id);

    // how far back to look for "last activity"
    const lookbackDays = Number(req.query.lookbackDays || 90);
    const start = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const inactive7 = Number(req.query.inactive7 || 7);
    const inactive14 = Number(req.query.inactive14 || 14);

    // 1) last activity per student in this course (source of truth)
    const lastActivity = await AnalyticsEvent.aggregate([
      {
        $match: {
          "payload.courseId": courseId,
          userId: { $ne: null },
          ts: { $gte: start },
        },
      },
      {
        $group: {
          _id: "$userId",
          lastEventAt: { $max: "$ts" },
          totalEvents: { $sum: 1 },
        },
      },
    ]);

    // 2) get engagement score snapshot (if computed)
    const scores = await EngagementScore.find({ courseId })
      .select("userId score rawScore lessonCompletes watch30Events examAttempts examCompletes lastEventAt updatedAt")
      .populate("userId", "name email");

    // Map for quick merge
    const scoreMap = new Map(scores.map((s) => [String(s.userId?._id || s.userId), s]));

    const now = Date.now();

    const rows = lastActivity
      .map((r) => {
        const uid = String(r._id);
        const s = scoreMap.get(uid);

        const last = r.lastEventAt ? new Date(r.lastEventAt) : null;
        const daysInactive = last ? Math.floor((now - last.getTime()) / (1000 * 60 * 60 * 24)) : 9999;

        let risk = "LOW";
        if (daysInactive >= inactive14) risk = "HIGH";
        else if (daysInactive >= inactive7) risk = "MEDIUM";

        // Optional: increase risk if score is very low
        const score = s?.score ?? null;
        if (score !== null && score < 15 && risk === "MEDIUM") risk = "HIGH";

        return {
          userId: uid,
          student: s?.userId
            ? { _id: s.userId._id, name: s.userId.name, email: s.userId.email }
            : { _id: uid, name: "Unknown", email: "" },

          lastEventAt: last,
          daysInactive,

          risk,
          score,

          // show breakdown if available
          lessonCompletes: s?.lessonCompletes ?? 0,
          watch30Events: s?.watch30Events ?? 0,
          examAttempts: s?.examAttempts ?? 0,
          examCompletes: s?.examCompletes ?? 0,

          totalEvents: r.totalEvents || 0,
        };
      })
      // show risky students first
      .sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        if (order[a.risk] !== order[b.risk]) return order[a.risk] - order[b.risk];
        return b.daysInactive - a.daysInactive;
      });

    return res.json({
      success: true,
      courseId,
      lookbackDays,
      rules: { inactive7, inactive14 },
      count: rows.length,
      rows,
    });
  } catch (e) {
    console.error("getCourseDropoutRisk error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getLessonDropoff = async (req, res) => {
  try {
    const courseId = String(req.params.id);
    const days = Number(req.query.days || 30);

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // lesson_select = open
    // lesson_complete = complete
    const match = {
      ts: { $gte: from, $lte: to },
      userId: { $ne: null },
      "payload.courseId": courseId,
      "payload.lessonId": { $ne: null },
      event: { $in: ["lesson_select", "lesson_complete"] },
    };

    const rows = await AnalyticsEvent.aggregate([
      { $match: match },

      {
        $group: {
          _id: "$payload.lessonId",
          opens: { $sum: { $cond: [{ $eq: ["$event", "lesson_select"] }, 1, 0] } },
          completes: { $sum: { $cond: [{ $eq: ["$event", "lesson_complete"] }, 1, 0] } },

          openUsers: { $addToSet: { $cond: [{ $eq: ["$event", "lesson_select"] }, "$userId", "$$REMOVE"] } },
          completeUsers: {
            $addToSet: { $cond: [{ $eq: ["$event", "lesson_complete"] }, "$userId", "$$REMOVE"] },
          },

          lastOpenAt: { $max: { $cond: [{ $eq: ["$event", "lesson_select"] }, "$ts", null] } },
          lastCompleteAt: { $max: { $cond: [{ $eq: ["$event", "lesson_complete"] }, "$ts", null] } },
        },
      },

      {
        $project: {
          lessonId: "$_id",
          opens: 1,
          completes: 1,
          uniqueOpens: { $size: "$openUsers" },
          uniqueCompletes: { $size: "$completeUsers" },
          lastOpenAt: 1,
          lastCompleteAt: 1,
          _id: 0,

          // protect divide-by-zero
          completionRate: {
            $cond: [{ $gt: ["$opens", 0] }, { $divide: ["$completes", "$opens"] }, 0],
          },
        },
      },

      {
        $addFields: {
          // dropRate = 1 - completionRate
          dropRate: { $subtract: [1, "$completionRate"] },
        },
      },
      {
        $addFields: {
          lessonObjId: { $toObjectId: "$lessonId" },
        },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "lessonObjId",
          foreignField: "_id",
          as: "lessonData",
        },
      },

      {
        $unwind: {
          path: "$lessonData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          lessonTitle: "$lessonData.title",
        },
      },

      // worst lessons first (highest drop)
      { $sort: { dropRate: -1, opens: -1 } },
      { $limit: 50 },
    ]);

    // add simple suggestion text (frontend can show)
    const suggestions = rows
      .filter((r) => r.opens >= 1)
      .slice(0, 10)
      .map((r) => ({
        lessonId: r.lessonId,
        lessonTitle: r.lessonTitle || "Untitled Lesson",
        message: `High drop-off in "${r.lessonTitle || "Untitled Lesson"}": ${(r.dropRate * 100).toFixed(0)}% drop (opens ${r.opens}, completes ${r.completes}).`,
      }));

    return res.json({
      success: true,
      courseId,
      rangeDays: days,
      rows,
      suggestions,
    });
  } catch (e) {
    console.error("getLessonDropoff error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const calcInstructorScore = async (instructorId) => {
  const courseIds = await getInstructorCourseIds(instructorId);

  // If no courses, return zeros
  if (!courseIds.length) {
    return {
      instructorId: String(instructorId),
      courseCount: 0,
      avgEngagement: 0,
      highRiskRate: 0,
      avgDropRate: 0,
      score: 0,
    };
  }

  // A) Avg Engagement (from EngagementScore collection)
  const engAgg = await EngagementScore.aggregate([
    { $match: { courseId: { $in: courseIds } } },
    { $group: { _id: null, avgEngagement: { $avg: "$score" } } },
  ]);
  const avgEngagement = Math.round((engAgg[0]?.avgEngagement || 0));

  // B) High-risk rate (last activity per user in instructor courses)
  const lookbackDays = 90;
  const start = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const lastActivity = await AnalyticsEvent.aggregate([
    {
      $match: {
        "payload.courseId": { $in: courseIds },
        userId: { $ne: null },
        ts: { $gte: start },
      },
    },
    {
      $group: {
        _id: "$userId",
        lastEventAt: { $max: "$ts" },
      },
    },
  ]);

  const now = Date.now();
  const inactive14 = 14;
  const totalStudents = lastActivity.length || 0;

  const highRiskCount = lastActivity.reduce((cnt, r) => {
    const last = r.lastEventAt ? new Date(r.lastEventAt).getTime() : 0;
    const daysInactive = last ? Math.floor((now - last) / (1000 * 60 * 60 * 24)) : 9999;
    return cnt + (daysInactive >= inactive14 ? 1 : 0);
  }, 0);

  const highRiskRate = totalStudents ? Math.round((highRiskCount / totalStudents) * 100) : 0;

  // C) Avg Lesson Drop-off (lesson_select vs lesson_complete) 
  const from30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const dropAgg = await AnalyticsEvent.aggregate([
    {
      $match: {
        "payload.courseId": { $in: courseIds },
        "payload.lessonId": { $ne: null },
        userId: { $ne: null },
        ts: { $gte: from30 },
        event: { $in: ["lesson_select", "lesson_complete"] },
      },
    },
    {
      $group: {
        _id: "$payload.lessonId",
        opens: { $sum: { $cond: [{ $eq: ["$event", "lesson_select"] }, 1, 0] } },
        completes: { $sum: { $cond: [{ $eq: ["$event", "lesson_complete"] }, 1, 0] } },
      },
    },
    {
      $project: {
        opens: 1,
        completes: 1,
        dropRate: {
          $cond: [
            { $gt: ["$opens", 0] },
            { $subtract: [1, { $divide: ["$completes", "$opens"] }] },
            0,
          ],
        },
      },
    },
    // weighted average by opens
    {
      $group: {
        _id: null,
        totalOpens: { $sum: "$opens" },
        weightedDropSum: { $sum: { $multiply: ["$dropRate", "$opens"] } },
      },
    },
    {
      $project: {
        avgDropRate: {
          $cond: [
            { $gt: ["$totalOpens", 0] },
            { $divide: ["$weightedDropSum", "$totalOpens"] },
            0,
          ],
        },
      },
    },
  ]);

  const avgDropRate = Math.round((dropAgg[0]?.avgDropRate || 0) * 100); // percent

  // Final score
  const scoreRaw =
    0.5 * avgEngagement +
    0.3 * (100 - highRiskRate) +
    0.2 * (100 - avgDropRate);

  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));

  return {
    instructorId: String(instructorId),
    courseCount: courseIds.length,
    avgEngagement,
    highRiskRate,
    avgDropRate,
    score,
  };
};


const instructorScoreMe = async (req, res) => {
  try {
    const data = await calcInstructorScore(req.user._id);
    res.json({ success: true, data });
  } catch (e) {
    console.error("instructorScoreMe error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const adminInstructorScores = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // You need User model to fetch instructors
    const User = require("../models/userModel");
    const instructors = await User.find({ role: "instructor" }).select("_id name email");

    const results = [];
    for (const ins of instructors) {
      const scoreData = await calcInstructorScore(ins._id);
      results.push({ ...scoreData, name: ins.name, email: ins.email });
    }

    results.sort((a, b) => b.score - a.score);

    res.json({ success: true, results });
  } catch (e) {
    console.error("adminInstructorScores error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPlatformHeatmap = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await AnalyticsEvent.aggregate([
      {
        $match: {
          ts: { $gte: start },
          userId: { $ne: null },
        },
      },
      {
        $project: {
          dayOfWeek: { $isoDayOfWeek: "$ts" }, // 1 = Monday
          hour: { $hour: "$ts" },
        },
      },
      {
        $group: {
          _id: { day: "$dayOfWeek", hour: "$hour" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          day: "$_id.day",
          hour: "$_id.hour",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.json({ success: true, rows });
  } catch (e) {
    console.error("getPlatformHeatmap error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPlatformRiskOverview = async (req, res) => {
  try {
    const lookbackDays = 90; // consider last 90 days students
    const start = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const rows = await AnalyticsEvent.aggregate([
      {
        $match: {
          ts: { $gte: start },
          userId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$userId",
          lastEventAt: { $max: "$ts" },
        },
      },
    ]);

    const now = Date.now();
    let medium = 0;
    let high = 0;

    rows.forEach((r) => {
      const last = r.lastEventAt ? new Date(r.lastEventAt).getTime() : 0;
      const daysInactive = last
        ? Math.floor((now - last) / (1000 * 60 * 60 * 24))
        : 9999;

      if (daysInactive >= 14) high++;
      else if (daysInactive >= 7) medium++;
    });

    const totalStudents = rows.length;
    const highRate = totalStudents
      ? Math.round((high / totalStudents) * 100)
      : 0;

    // ---- Top Risky Courses ----
    const courseAgg = await AnalyticsEvent.aggregate([
      {
        $match: {
          ts: { $gte: start },
          userId: { $ne: null },
          "payload.courseId": { $ne: null },
        },
      },
      {
        $group: {
          _id: {
            courseId: "$payload.courseId",
            userId: "$userId",
          },
          lastEventAt: { $max: "$ts" },
        },
      },
      {
        $group: {
          _id: "$_id.courseId",
          students: { $push: "$lastEventAt" },
        },
      },
      {
        $project: {
          courseId: "$_id",
          totalStudents: { $size: "$students" },
          highRiskCount: {
            $size: {
              $filter: {
                input: "$students",
                as: "last",
                cond: {
                  $gte: [
                    {
                      $divide: [
                        { $subtract: [new Date(), "$$last"] },
                        1000 * 60 * 60 * 24,
                      ],
                    },
                    14,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          courseId: 1,
          totalStudents: 1,
          highRiskCount: 1,
          highRiskRate: {
            $cond: [
              { $gt: ["$totalStudents", 0] },
              {
                $multiply: [
                  { $divide: ["$highRiskCount", "$totalStudents"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          courseObjId: { $toObjectId: "$courseId" },
        },
      },
      {
        $lookup: {
          from: "courses",  
          localField: "courseObjId",
          foreignField: "_id",
          as: "courseData",
        },
      },
      {
        $unwind: {
          path: "$courseData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          courseTitle: "$courseData.title",
        },
      },
      { $sort: { highRiskRate: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      totalStudents,
      mediumRisk: medium,
      highRisk: high,
      highRiskRate: highRate,
      topRiskCourses: courseAgg,
    });
  } catch (e) {
    console.error("getPlatformRiskOverview error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  trackSingle,
  trackBatch,
  getOverview,
  getDAU,
  studentMe,
  instructorMe,
  instructorScoreMe,
  adminInstructorScores,
  courseAnalytics,
  computeCourseEngagement,
  getCourseEngagementLeaderboard,
  studentEngagementMe,
  getCourseDropoutRisk,
  getLessonDropoff,
  getPlatformHeatmap,
  getPlatformRiskOverview,
};
