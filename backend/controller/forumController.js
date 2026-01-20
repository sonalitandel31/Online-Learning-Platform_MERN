const ForumQuestion = require("../models/forumQuestionModel");
const ForumAnswer = require("../models/forumAnswerModel");
const Course = require("../models/courseModel");
const ForumReport = require("../models/forumReportModel");
const ForumReply = require("../models/forumReplyModel");
const { default: mongoose } = require("mongoose");

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function assertInstructorOwnsCourseByQuestion(questionId, instructorId) {
  const question = await ForumQuestion.findOne({ _id: questionId, isDeleted: false }).select("courseId");
  if (!question) return { ok: false, status: 404, message: "Question not found" };

  const course = await Course.findById(question.courseId).select("instructor");
  if (!course) return { ok: false, status: 404, message: "Course not found" };

  if (course.instructor.toString() !== instructorId.toString()) {
    return { ok: false, status: 403, message: "Not allowed for this course" };
  }

  return { ok: true, question, course };
}

// ---------------- COUNT (public) ----------------
exports.getForumCount = async (req, res) => {
  try {
    const count = await ForumQuestion.countDocuments({
      courseId: req.params.courseId,
      isDeleted: false,
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ count: 0 });
  }
};

exports.createQuestion = async (req, res) => {
  const { courseId, title, description } = req.body;

  if (!courseId || !title || !description) {
    return res.status(400).json({ message: "All fields required" });
  }
  if (!isObjectId(courseId)) return res.status(400).json({ message: "Invalid courseId" });

  try {
    const question = await ForumQuestion.create({
      courseId,
      userId: req.user._id,
      title,
      description,
      lastActivityAt: new Date(),
    });

    res.status(201).json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create question" });
  }
};

// ---------------- COURSE QUESTIONS (student view) ----------------
exports.getCourseQuestions = async (req, res) => {
  try {
    const { search = "", filter = "all", sort = "activity" } = req.query;
    const courseObjectId = new mongoose.Types.ObjectId(req.params.courseId);

    const matchStage = { courseId: courseObjectId, isDeleted: false };

    if (filter === "unanswered") matchStage.isSolved = false;
    if (filter === "solved") matchStage.isSolved = true;
    if (filter === "locked") matchStage.isLocked = true;

    if (search.trim()) {
      matchStage.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const sortStage =
      sort === "newest"
        ? { createdAt: -1 }
        : sort === "activity"
        ? { lastActivityAt: -1, createdAt: -1 }
        : sort === "solved"
        ? { isSolved: -1, lastActivityAt: -1 }
        : { lastActivityAt: -1, createdAt: -1 };

    const questions = await ForumQuestion.aggregate([
      { $match: matchStage },

      {
        $lookup: {
          from: "forumanswers",
          localField: "_id",
          foreignField: "questionId",
          pipeline: [{ $match: { isDeleted: false } }],
          as: "answers",
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "asker",
        },
      },
      { $unwind: "$asker" },

      {
        $addFields: {
          answerCount: { $size: "$answers" },
          totalUpvotes: { $sum: "$answers.upvotes" },
        },
      },

      {
        $project: {
          answers: 0,
          "asker.password": 0,
          "asker.email": 0,
        },
      },

      // single sort (Pinned first)
      { $sort: { isPinned: -1, ...sortStage } },
    ]);

    res.json(
      questions.map((q) => ({
        ...q,
        asker: { _id: q.asker._id, name: q.asker.name },
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
};

// ---------------- QUESTION DETAIL ----------------
exports.getQuestionDetail = async (req, res) => {
  try {
    const question = await ForumQuestion.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("userId", "name");

    if (!question) return res.status(404).json({ message: "Question not found" });

    const answers = await ForumAnswer.find({
      questionId: question._id,
      isDeleted: false,
    })
      .populate("userId", "name role")
      .sort({ isAccepted: -1, isVerified: -1, createdAt: 1 });

    const userIdStr = req.user._id.toString();

    const formattedAnswers = answers.map((ans) => {
      const upvotedByStr = (ans.upvotedBy || []).map((x) => x.toString());
      const isMine = ans.userId?._id?.toString() === userIdStr;

      return {
        ...ans.toObject(),
        hasLiked: upvotedByStr.includes(userIdStr),
        isMine,
      };
    });

    res.json({ question, answers: formattedAnswers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch question detail" });
  }
};

// ---------------- POST ANSWER ----------------
exports.postAnswer = async (req, res) => {
  const { questionId, answerText } = req.body;

  if (!questionId || !answerText?.trim()) {
    return res.status(400).json({ message: "Answer required" });
  }
  if (!isObjectId(questionId)) return res.status(400).json({ message: "Invalid questionId" });

  try {
    const question = await ForumQuestion.findOne({ _id: questionId, isDeleted: false }).select("isLocked isSolved");
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.isLocked) return res.status(403).json({ message: "Discussion is locked" });

    const answer = await ForumAnswer.create({
      questionId,
      userId: req.user._id,
      answerText,
    });

    await ForumQuestion.findByIdAndUpdate(questionId, { lastActivityAt: new Date() });

    res.status(201).json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to post answer" });
  }
};

// ---------------- UPVOTE ANSWER TOGGLE ----------------
exports.upvoteAnswer = async (req, res) => {
  try {
    const answer = await ForumAnswer.findOne({ _id: req.params.id, isDeleted: false });
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    const userId = req.user._id;
    const userIdStr = userId.toString();

    if (answer.userId.toString() === userIdStr) {
      return res.status(403).json({ message: "Cannot upvote your own answer" });
    }

    const alreadyUpvoted = (answer.upvotedBy || []).some((x) => x.toString() === userIdStr);

    if (alreadyUpvoted) {
      await ForumAnswer.findByIdAndUpdate(answer._id, {
        $pull: { upvotedBy: userId },
        $inc: { upvotes: -1 },
      });

      await ForumQuestion.findByIdAndUpdate(answer.questionId, { lastActivityAt: new Date() });
      return res.json({ message: "Upvote removed", hasLiked: false });
    }

    await ForumAnswer.findByIdAndUpdate(answer._id, {
      $addToSet: { upvotedBy: userId },
      $inc: { upvotes: 1 },
    });

    await ForumQuestion.findByIdAndUpdate(answer.questionId, { lastActivityAt: new Date() });
    res.json({ message: "Upvoted", hasLiked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upvote answer" });
  }
};

// ---------------- ACCEPT ANSWER (student owner) ----------------
exports.acceptAnswerByOwner = async (req, res) => {
  const { id: questionId } = req.params;
  const { answerId } = req.body;

  if (!isObjectId(questionId) || !isObjectId(answerId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const question = await ForumQuestion.findOne({ _id: questionId, isDeleted: false }).select("userId isLocked");
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (question.isLocked) return res.status(403).json({ message: "Discussion is locked" });

    if (question.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only question owner can accept answer" });
    }

    const ans = await ForumAnswer.findOne({ _id: answerId, questionId, isDeleted: false });
    if (!ans) return res.status(400).json({ message: "Answer does not belong to this question" });

    await ForumAnswer.updateMany({ questionId }, { isAccepted: false });

    await ForumQuestion.findByIdAndUpdate(questionId, {
      isSolved: true,
      acceptedAnswerId: answerId,
      lastActivityAt: new Date(),
    });

    await ForumAnswer.findByIdAndUpdate(answerId, { isAccepted: true });

    res.json({ message: "Answer accepted. Question marked as solved." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept answer" });
  }
};

// ---------------- VERIFY ANSWER (instructor/admin) ----------------
exports.verifyAnswerByInstructor = async (req, res) => {
  const { id: questionId } = req.params;
  const { answerId } = req.body;

  if (!isObjectId(questionId) || !isObjectId(answerId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    if (req.user.role?.toLowerCase() === "instructor") {
      const check = await assertInstructorOwnsCourseByQuestion(questionId, req.user._id);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    const question = await ForumQuestion.findOne({ _id: questionId, isDeleted: false }).select("isLocked");
    if (!question) return res.status(404).json({ message: "Question not found" });

    // If you want to allow verify even when locked, remove next line
    if (question.isLocked) return res.status(403).json({ message: "Discussion is locked" });

    const ans = await ForumAnswer.findOne({ _id: answerId, questionId, isDeleted: false });
    if (!ans) return res.status(400).json({ message: "Answer does not belong to this question" });

    await ForumAnswer.updateMany({ questionId }, { isVerified: false });

    await ForumQuestion.findByIdAndUpdate(questionId, {
      verifiedAnswerId: answerId,
      lastActivityAt: new Date(),
    });

    await ForumAnswer.findByIdAndUpdate(answerId, { isVerified: true });

    res.json({ message: "Answer verified by instructor" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to verify answer" });
  }
};

// ---------------- LOCK/UNLOCK ----------------
exports.setQuestionLock = async (req, res) => {
  const { id: questionId } = req.params;
  const { isLocked } = req.body;

  if (!isObjectId(questionId)) return res.status(400).json({ message: "Invalid questionId" });

  try {
    if (req.user.role?.toLowerCase() === "instructor") {
      const check = await assertInstructorOwnsCourseByQuestion(questionId, req.user._id);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    const updated = await ForumQuestion.findOneAndUpdate(
      { _id: questionId, isDeleted: false },
      { isLocked: !!isLocked, lastActivityAt: new Date() },
      { new: true }
    ).select("isLocked");

    if (!updated) return res.status(404).json({ message: "Question not found" });

    res.json({ message: updated.isLocked ? "Locked" : "Unlocked", isLocked: updated.isLocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update lock status" });
  }
};

// ---------------- SOFT DELETE THREAD (admin) ----------------
// NOTE: Reason via DELETE body may be dropped. You can keep it; works in many cases.
exports.deleteQuestion = async (req, res) => {
  const { id: questionId } = req.params;
  const { reason = "" } = req.body || {};

  try {
    await ForumQuestion.findByIdAndUpdate(questionId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user._id,
      deleteReason: reason,
      lastActivityAt: new Date(),
    });

    await ForumAnswer.updateMany(
      { questionId },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
        deleteReason: reason,
      }
    );

    await ForumReply.updateMany(
      { questionId },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
        deleteReason: reason,
      }
    );

    res.json({ message: "Thread deleted (soft)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete question" });
  }
};

// ---------------- INSTRUCTOR QUESTIONS (their courses) ----------------
exports.getInstructorQuestions = async (req, res) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(req.user._id);

    const questions = await ForumQuestion.aggregate([
      { $match: { isDeleted: false } },

      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      { $match: { "course.instructor": instructorId } },

      // asker user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "asker",
        },
      },
      { $unwind: { path: "$asker", preserveNullAndEmptyArrays: true } },

      // answers (and answer users)
      {
        $lookup: {
          from: "forumanswers",
          localField: "_id",
          foreignField: "questionId",
          pipeline: [
            { $match: { isDeleted: false } },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "answerUser",
              },
            },
            { $unwind: { path: "$answerUser", preserveNullAndEmptyArrays: true } },
            { $sort: { isAccepted: -1, isVerified: -1, createdAt: 1 } },
            {
              $project: {
                _id: 1,
                answerText: 1,
                isVerified: 1,
                isAccepted: 1,
                createdAt: 1,
                userId: { _id: "$answerUser._id", name: "$answerUser.name" },
              },
            },
          ],
          as: "answers",
        },
      },

      { $addFields: { answerCount: { $size: "$answers" } } },
      { $sort: { lastActivityAt: -1, createdAt: -1 } },

      {
        $project: {
          title: 1,
          description: 1,
          isSolved: 1,
          isLocked: 1,
          acceptedAnswerId: 1,
          verifiedAnswerId: 1,
          lastActivityAt: 1,
          createdAt: 1,
          answerCount: 1,
          courseTitle: "$course.title",
          asker: { _id: "$asker._id", name: "$asker.name" },
          answers: 1,
        },
      },
    ]);

    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

// ---------------- ADMIN QUESTIONS (all courses) ----------------
exports.getAdminQuestions = async (req, res) => {
  try {
    const questions = await ForumQuestion.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { lastActivityAt: -1, createdAt: -1 } },

      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "asker",
        },
      },
      { $unwind: { path: "$asker", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "forumanswers",
          localField: "_id",
          foreignField: "questionId",
          pipeline: [
            { $match: { isDeleted: false } },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "answerUser",
              },
            },
            { $unwind: { path: "$answerUser", preserveNullAndEmptyArrays: true } },
            { $sort: { isAccepted: -1, isVerified: -1, createdAt: 1 } },
            {
              $project: {
                answerText: 1,
                isVerified: 1,
                isAccepted: 1,
                createdAt: 1,
                userId: { _id: "$answerUser._id", name: "$answerUser.name" },
              },
            },
          ],
          as: "answers",
        },
      },

      { $addFields: { answerCount: { $size: "$answers" } } },

      {
        $project: {
          title: 1,
          description: 1,
          isSolved: 1,
          isLocked: 1,
          lastActivityAt: 1,
          createdAt: 1,
          answerCount: 1,
          courseTitle: "$course.title",

          // STANDARD SHAPE
          asker: { _id: "$asker._id", name: "$asker.name" },

          answers: 1,
        },
      },
    ]);

    res.json(questions);
  } catch (err) {
    console.error("Admin Question Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

// ---------------- REPORT CONTENT ----------------
exports.reportContent = async (req, res) => {
  const { targetType, targetId, reason, note = "" } = req.body;

  if (!["question", "answer", "reply"].includes(targetType)) {
    return res.status(400).json({ message: "Invalid targetType" });
  }
  if (!isObjectId(targetId)) return res.status(400).json({ message: "Invalid targetId" });
  if (!reason) return res.status(400).json({ message: "Reason required" });

  try {
    // Avoid duplicate spam reports by same user on same target
    const existing = await ForumReport.findOne({
      targetType,
      targetId,
      reporterId: req.user._id,
      status: "pending",
    });
    if (existing) return res.json({ message: "Already reported" });

    let courseId = null;

    if (targetType === "question") {
      const q = await ForumQuestion.findOne({ _id: targetId, isDeleted: false }).select("courseId");
      if (!q) return res.status(404).json({ message: "Question not found" });
      courseId = q.courseId;
    }

    if (targetType === "answer") {
      const a = await ForumAnswer.findOne({ _id: targetId, isDeleted: false }).select("questionId");
      if (!a) return res.status(404).json({ message: "Answer not found" });
      const q = await ForumQuestion.findOne({ _id: a.questionId, isDeleted: false }).select("courseId");
      if (!q) return res.status(404).json({ message: "Question not found" });
      courseId = q.courseId;
    }

    if (targetType === "reply") {
      const r = await ForumReply.findOne({ _id: targetId, isDeleted: false }).select("questionId");
      if (!r) return res.status(404).json({ message: "Reply not found" });
      const q = await ForumQuestion.findOne({ _id: r.questionId, isDeleted: false }).select("courseId");
      if (!q) return res.status(404).json({ message: "Question not found" });
      courseId = q.courseId;
    }

    const report = await ForumReport.create({
      targetType,
      targetId,
      reporterId: req.user._id,
      courseId,
      reason,
      note,
    });

    res.status(201).json({ message: "Reported", reportId: report._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to report content" });
  }
};

exports.getAdminReports = async (req, res) => {
  try {
    const reports = await ForumReport.find({ status: "pending" })
      .populate("reporterId", "name role")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

exports.getInstructorReports = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const myCourses = await Course.find({ instructor: instructorId }).select("_id");
    const myCourseIds = myCourses.map((c) => c._id);

    const reports = await ForumReport.find({
      status: "pending",
      courseId: { $in: myCourseIds },
    })
      .populate("reporterId", "name role")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

exports.resolveReport = async (req, res) => {
  const { id } = req.params;
  const { action = "resolved", actionNote = "" } = req.body;

  if (!["resolved", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  try {
    const report = await ForumReport.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (req.user.role?.toLowerCase() === "instructor") {
      const course = await Course.findById(report.courseId).select("instructor");
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    report.status = action;
    report.actionBy = req.user._id;
    report.actionNote = actionNote;
    report.actionAt = new Date();
    await report.save();

    res.json({ message: "Report updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update report" });
  }
};

exports.postReply = async (req, res) => {
  const { questionId, answerId, replyText } = req.body;

  if (!isObjectId(questionId))
    return res.status(400).json({ message: "Invalid questionId" });

  if (!isObjectId(answerId))
    return res.status(400).json({ message: "Invalid answerId" });

  if (!replyText?.trim())
    return res.status(400).json({ message: "Reply required" });

  try {
    const question = await ForumQuestion.findOne({
      _id: questionId,
      isDeleted: false,
    }).select("isLocked");

    if (!question)
      return res.status(404).json({ message: "Question not found" });

    if (question.isLocked)
      return res.status(403).json({ message: "Discussion locked" });

    // Ensure answer belongs to this question
    const ans = await ForumAnswer.findOne({
      _id: answerId,
      questionId,
      isDeleted: false,
    });

    if (!ans)
      return res.status(400).json({ message: "Answer mismatch" });

    const reply = await ForumReply.create({
      questionId,
      answerId,
      parentId: null, // 🔒 FORCE 2-LEVEL
      userId: req.user._id,
      replyText: replyText.trim(),
    });

    await ForumQuestion.findByIdAndUpdate(questionId, {
      lastActivityAt: new Date(),
    });

    res.status(201).json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to post reply" });
  }
};

exports.getRepliesForQuestion = async (req, res) => {
  const { id: questionId } = req.params;

  if (!isObjectId(questionId))
    return res.status(400).json({ message: "Invalid questionId" });

  try {
    const replies = await ForumReply.find({
      questionId,
      parentId: null,   // 🔒 2-level only
      isDeleted: false,
    })
      .populate("userId", "name role")
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch replies" });
  }
};
