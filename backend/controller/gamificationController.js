const studentModel = require("../models/studentModel");
const XpTransaction = require("../models/xpTransactionModel");
const mongoose = require("mongoose");

exports.getMyGamification = async (req, res) => {
  try {
    const courseId = req.query.courseId;

    // ✅ find student using logged-in user (req.user._id)
    const student = await studentModel
      .findOne({ user: req.user._id })
      .populate("user", "name email profilePic")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // ✅ xpByCourse always return (for MyLearnings)
    // normalize shape: [{ course: "id", xp: number }]
    const xpByCourse = (student.xpByCourse || []).map((x) => ({
      course: x.course?.toString(),
      xp: Number(x.xp || 0),
    }));

    // ✅ course-wise xp if courseId is passed (for CourseDetail)
    let xpInCourse = 0;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      const found = xpByCourse.find((x) => x.course === courseId);
      xpInCourse = found?.xp || 0;
    }

    // ✅ recent transactions (optionally filtered by course)
    const txnQuery = { student: student._id };
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      txnQuery.course = new mongoose.Types.ObjectId(courseId);
    }

    const recentTransactions = await XpTransaction.find(txnQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({
      user: student.user,
      xpTotal: Number(student.xpTotal || 0),
      xpByCourse, // ✅ IMPORTANT for MyLearnings
      xpInCourse,
      streakCount: Number(student.streakCount || 0),
      lastStreakDate: student.lastStreakDate || null,
      recentTransactions,
    });
  } catch (err) {
    console.error("getMyGamification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.query;
    const limit = Math.min(Number(req.query.limit || 10), 50);

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "courseId required" });
    }

    const cid = new mongoose.Types.ObjectId(courseId);

    const leaderboard = await studentModel.aggregate([
      { $unwind: "$xpByCourse" },
      { $match: { "xpByCourse.course": cid } },
      { $sort: { "xpByCourse.xp": -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users", // ✅ correct collection name for model "user"
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: "$userData" },
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          userId: "$userData._id",
          name: "$userData.name",
          profilePic: "$userData.profilePic",
          xp: "$xpByCourse.xp",
        },
      },
    ]);

    return res.json({ courseId, leaderboard });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyBadges = async (req, res) => {
  try {
    const courseId = req.query.courseId;

    const student = await studentModel
      .findOne({ user: req.user._id })
      .select("badges")
      .lean();

    if (!student) return res.status(404).json({ message: "Student profile not found" });

    let badges = student.badges || [];

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      badges = badges.filter((b) => String(b.course || "") === String(courseId));
    }

    // sort newest first
    badges.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

    return res.json({ badges });
  } catch (err) {
    console.error("getMyBadges error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
