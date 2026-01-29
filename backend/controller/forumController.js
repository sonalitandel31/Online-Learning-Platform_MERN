const ForumQuestion = require("../models/forumQuestionModel");
const ForumAnswer = require("../models/forumAnswerModel");
const Course = require("../models/courseModel");
const ForumReport = require("../models/forumReportModel");
const ForumReply = require("../models/forumReplyModel");
const { default: mongoose } = require("mongoose");
const { canAccessCourse, canAccessQuestion } = require("../utils/forumAccess");
const userModel = require("../models/userModel");
const nodemailer = require("nodemailer");

const REPORT_POLICY = {
  spam: { warnAt: 5, blockAt: 10 },
  abuse: { warnAt: 3, blockAt: 7 },
  harassment: { warnAt: 2, blockAt: 5 },
  misinformation: { warnAt: 5, blockAt: 12 },
  other: { warnAt: 8, blockAt: 20 },
};

const ALL_REASONS = Object.keys(REPORT_POLICY);

/* const SPAM_WARN_AT = Number(process.env.SPAM_WARN_AT || 5);
const SPAM_BLOCK_AT = Number(process.env.SPAM_BLOCK_AT || 10);
 */
const normalizeReason = (r = "") => (r || "").toString().trim().toLowerCase();
const isSpamReason = (r) => normalizeReason(r) === "spam";

function buildTransporter() {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendEmail(to, subject, text) {
  try {
    if (!to) return;
    const transporter = buildTransporter();
    if (!transporter) return;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
  } catch (e) {
    console.error("Email send failed:", e?.message || e);
  }
}

async function getReasonCountForUser(userId, reasonKey, { status = "resolved" } = {}) {
  if (!userId) return 0;

  const q = { targetUserId: userId, status };
  q.reason = { $regex: new RegExp(`^${String(reasonKey).trim()}$`, "i") };

  return ForumReport.countDocuments(q);
}

async function attachTargetContent(reportsQuery = {}) {
  // returns reports with: targetContent (object)
  return ForumReport.aggregate([
    { $match: reportsQuery },

    // reporter / targetUser / actionBy / course populate (via lookups)
    {
      $lookup: {
        from: "users",
        localField: "reporterId",
        foreignField: "_id",
        as: "reporter",
      },
    },
    { $unwind: { path: "$reporter", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "users",
        localField: "targetUserId",
        foreignField: "_id",
        as: "targetUser",
      },
    },
    { $unwind: { path: "$targetUser", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "users",
        localField: "actionBy",
        foreignField: "_id",
        as: "actionUser",
      },
    },
    { $unwind: { path: "$actionUser", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "course",
      },
    },
    { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },

    // -------------- Target lookups --------------
    {
      $lookup: {
        from: "forumquestions",
        localField: "targetId",
        foreignField: "_id",
        as: "targetQuestion",
      },
    },
    {
      $lookup: {
        from: "forumanswers",
        localField: "targetId",
        foreignField: "_id",
        as: "targetAnswer",
      },
    },
    {
      $lookup: {
        from: "forumreplies",
        localField: "targetId",
        foreignField: "_id",
        as: "targetReply",
      },
    },

    // For answer/reply: also fetch their question for context (title)
    {
      $lookup: {
        from: "forumquestions",
        let: { ansQid: { $arrayElemAt: ["$targetAnswer.questionId", 0] } },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$ansQid"] } } },
          { $project: { title: 1, courseId: 1, isDeleted: 1 } },
        ],
        as: "answerQuestion",
      },
    },
    {
      $lookup: {
        from: "forumquestions",
        let: { repQid: { $arrayElemAt: ["$targetReply.questionId", 0] } },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$repQid"] } } },
          { $project: { title: 1, courseId: 1, isDeleted: 1 } },
        ],
        as: "replyQuestion",
      },
    },

    // Build targetContent by switching targetType
    {
      $addFields: {
        targetContent: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$targetType", "question"] },
                then: {
                  kind: "question",
                  questionId: "$targetId",
                  title: { $arrayElemAt: ["$targetQuestion.title", 0] },
                  text: { $arrayElemAt: ["$targetQuestion.description", 0] },
                  isDeleted: { $arrayElemAt: ["$targetQuestion.isDeleted", 0] },
                },
              },
              {
                case: { $eq: ["$targetType", "answer"] },
                then: {
                  kind: "answer",
                  answerId: "$targetId",
                  questionId: { $arrayElemAt: ["$targetAnswer.questionId", 0] },
                  questionTitle: { $arrayElemAt: ["$answerQuestion.title", 0] },
                  text: { $arrayElemAt: ["$targetAnswer.answerText", 0] },
                  isDeleted: { $arrayElemAt: ["$targetAnswer.isDeleted", 0] },
                },
              },
              {
                case: { $eq: ["$targetType", "reply"] },
                then: {
                  kind: "reply",
                  replyId: "$targetId",
                  questionId: { $arrayElemAt: ["$targetReply.questionId", 0] },
                  answerId: { $arrayElemAt: ["$targetReply.answerId", 0] },
                  questionTitle: { $arrayElemAt: ["$replyQuestion.title", 0] },
                  text: { $arrayElemAt: ["$targetReply.replyText", 0] },
                  isDeleted: { $arrayElemAt: ["$targetReply.isDeleted", 0] },
                },
              },
            ],
            default: { kind: "unknown" },
          },
        },
      },
    },

    // shape output similar to populate() you already use
    {
      $project: {
        targetType: 1,
        targetId: 1,
        reason: 1,
        note: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        actionNote: 1,
        actionAt: 1,

        reporterId: { _id: "$reporter._id", name: "$reporter.name", role: "$reporter.role", email: "$reporter.email" },
        targetUserId: { _id: "$targetUser._id", name: "$targetUser.name", role: "$targetUser.role", email: "$targetUser.email" },
        actionBy: { _id: "$actionUser._id", name: "$actionUser.name", role: "$actionUser.role" },
        courseId: { _id: "$course._id", title: "$course.title" },

        targetContent: 1,
      },
    },

    { $sort: { createdAt: -1 } },
  ]);
}

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

  const access = await canAccessCourse(req.user, courseId);
  if (!access.ok) {
    return res.status(access.status).json({ message: access.message });
  }

  const question = await ForumQuestion.create({
    courseId,
    userId: req.user._id,
    title,
    description,
    lastActivityAt: new Date(),
  });

  res.status(201).json(question);
};

exports.getCourseQuestions = async (req, res) => {
  try {
    const access = await canAccessCourse(req.user, req.params.courseId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
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

exports.getQuestionDetail = async (req, res) => {
  try {

    const access = await canAccessQuestion(req.user, req.params.id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
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

exports.postAnswer = async (req, res) => {
  const { questionId, answerText } = req.body;

  if (!questionId || !answerText?.trim()) {
    return res.status(400).json({ message: "Answer required" });
  }

  const gate = await assertNotReportBlocked(req, res);
  if (!gate.ok) return;

  const access = await canAccessQuestion(req.user, questionId);
  if (!access.ok) {
    return res.status(access.status).json({ message: access.message });
  }

  const question = await ForumQuestion.findById(questionId).select("isLocked isSolved userId title");
  if (!question) return res.status(404).json({ message: "Question not found" });

  if (question.isLocked || question.isSolved) {
    return res.status(403).json({ message: "Discussion closed" });
  }

  const answer = await ForumAnswer.create({
    questionId,
    userId: req.user._id,
    answerText,
  });

  await ForumQuestion.findByIdAndUpdate(questionId, {
    lastActivityAt: new Date(),
  });

  if (question.userId?.toString() !== req.user._id.toString()) {
    const owner = await userModel.findById(question.userId).select("email name");
    await sendEmail(
      owner?.email,
      "Your question has a new answer",
      `Hello ${owner?.name || ""},\n\nYour question "${question.title}" has received a new answer.\n\nPlease login to view it.`
    );
  }

  res.status(201).json(answer);
};

exports.upvoteAnswer = async (req, res) => {
  try {
    const answer = await ForumAnswer.findOne({ _id: req.params.id, isDeleted: false });
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    const question = await ForumQuestion.findById(answer.questionId).select("isLocked isSolved");
    if (question?.isLocked || question?.isSolved) {
      return res.status(403).json({ message: "Discussion closed" });
    }

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

exports.acceptAnswerByOwner = async (req, res) => {
  const { id: questionId } = req.params;
  const { answerId } = req.body;

  if (!isObjectId(questionId) || !isObjectId(answerId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const question = await ForumQuestion.findOne({
      _id: questionId,
      isDeleted: false,
    }).select("userId isLocked isSolved title");

    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.isSolved) return res.status(403).json({ message: "Question already solved" });

    if (question.isLocked) return res.status(403).json({ message: "Discussion is locked" });

    if (question.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only question owner can accept answer" });
    }

    const ans = await ForumAnswer.findOne({
      _id: answerId,
      questionId,
      isDeleted: false,
    }).select("userId");

    if (!ans) return res.status(400).json({ message: "Answer does not belong to this question" });

    // unaccept all answers (only non-deleted)
    await ForumAnswer.updateMany(
      { questionId, isDeleted: false },
      { isAccepted: false }
    );

    // mark question solved
    await ForumQuestion.findByIdAndUpdate(questionId, {
      isSolved: true,
      acceptedAnswerId: answerId,
      lastActivityAt: new Date(),
    });

    // mark selected answer accepted
    await ForumAnswer.findByIdAndUpdate(answerId, { isAccepted: true });

    // ✅ email to answer author
    try {
      const answerAuthor = await userModel.findById(ans.userId).select("email name");
      await sendEmail(
        answerAuthor?.email,
        "Your answer was accepted",
        `Hello ${answerAuthor?.name || ""},\n\nYour answer was accepted for the question "${question.title}".\n\nPlease login to see details.`
      );
    } catch (e) {
      console.error("Accept email error:", e?.message || e);
    }

    return res.json({ message: "Answer accepted. Question marked as solved." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to accept answer" });
  }
};

exports.verifyAnswerByInstructor = async (req, res) => {
  const { id: questionId } = req.params;
  const { answerId } = req.body;

  if (!isObjectId(questionId) || !isObjectId(answerId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    // only instructor who owns the course can verify
    if (req.user.role?.toLowerCase() === "instructor") {
      const check = await assertInstructorOwnsCourseByQuestion(questionId, req.user._id);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    const question = await ForumQuestion.findOne({
      _id: questionId,
      isDeleted: false,
    }).select("isLocked title");

    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.isLocked) return res.status(403).json({ message: "Discussion is locked" });

    const ans = await ForumAnswer.findOne({
      _id: answerId,
      questionId,
      isDeleted: false,
    }).select("userId");

    if (!ans) return res.status(400).json({ message: "Answer does not belong to this question" });

    await ForumAnswer.updateMany({ questionId, isDeleted: false }, { isVerified: false });

    await ForumQuestion.findByIdAndUpdate(questionId, {
      verifiedAnswerId: answerId,
      lastActivityAt: new Date(),
    });

    await ForumAnswer.findByIdAndUpdate(answerId, { isVerified: true });

    // ✅ email to answer author
    try {
      const answerAuthor = await userModel.findById(ans.userId).select("email name");
      await sendEmail(
        answerAuthor?.email,
        "Your answer was verified by instructor",
        `Hello ${answerAuthor?.name || ""},\n\nYour answer was verified by the instructor for the question "${question.title}".\n\nPlease login to see details.`
      );
    } catch (e) {
      console.error("Verify email error:", e?.message || e);
    }

    return res.json({ message: "Answer verified by instructor" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to verify answer" });
  }
};

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

exports.reportContent = async (req, res) => {
  const { targetType, targetId, reason, note = "" } = req.body;

  if (!["question", "answer", "reply"].includes(targetType)) {
    return res.status(400).json({ message: "Invalid targetType" });
  }
  if (!isObjectId(targetId)) return res.status(400).json({ message: "Invalid targetId" });
  if (!reason) return res.status(400).json({ message: "Reason required" });

  try {
    const existing = await ForumReport.findOne({
      targetType,
      targetId,
      reporterId: req.user._id,
      status: "pending",
    });
    if (existing) return res.json({ message: "Already reported" });

    let courseId = null;
    let targetUserId = null;

    if (targetType === "question") {
      const q = await ForumQuestion.findOne({ _id: targetId, isDeleted: false }).select("courseId userId");
      if (!q) return res.status(404).json({ message: "Question not found" });
      courseId = q.courseId;
      targetUserId = q.userId;
    }

    if (targetType === "answer") {
      const a = await ForumAnswer.findOne({ _id: targetId, isDeleted: false }).select("questionId userId");
      if (!a) return res.status(404).json({ message: "Answer not found" });
      targetUserId = a.userId;

      const q = await ForumQuestion.findOne({ _id: a.questionId, isDeleted: false }).select("courseId");
      if (!q) return res.status(404).json({ message: "Question not found" });
      courseId = q.courseId;
    }

    if (targetType === "reply") {
      const r = await ForumReply.findOne({ _id: targetId, isDeleted: false }).select("questionId userId");
      if (!r) return res.status(404).json({ message: "Reply not found" });
      targetUserId = r.userId;

      const q = await ForumQuestion.findOne({ _id: r.questionId, isDeleted: false }).select("courseId");
      if (!q) return res.status(404).json({ message: "Question not found" });
      courseId = q.courseId;
    }

    // ✅ can't report own content
    if (targetUserId && targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot report your own content" });
    }

    const access = await canAccessCourse(req.user, courseId);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const report = await ForumReport.create({
      targetType,
      targetId,
      reporterId: req.user._id,
      courseId,
      reason,
      note,
      targetUserId, // ✅ ensure schema has this exact field
    });

    /*
    if (targetUserId && isSpamReason(reason)) {
      const spamCount = await getSpamCountForUser(targetUserId);

      if (spamCount === SPAM_WARN_AT || spamCount === SPAM_BLOCK_AT) {
        const u = await userModel.findById(targetUserId).select("email name");
        const subject = spamCount === SPAM_BLOCK_AT ? "Forum posting blocked" : "Spam warning (forum)";
        const text =
          spamCount === SPAM_BLOCK_AT
            ? `Hello ${u?.name || ""},\n\nYour forum posting has been blocked because your content received ${spamCount} spam reports.\n\nIf you believe this is a mistake, contact support.`
            : `Hello ${u?.name || ""},\n\nWarning: Your content has received ${spamCount} spam reports.\n\nIf spam reports continue, your forum posting may be blocked.\n\nPlease follow community guidelines.`;

        await sendEmail(u?.email, subject, text);
      }
    } */

    return res.status(201).json({ message: "Reported", reportId: report._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to report content" });
  }
};

exports.getAdminReports = async (req, res) => {
  try {
    const status = String(req.query.status || "pending").toLowerCase();
    const q = {};
    if (status !== "all") q.status = status;

    const reports = await attachTargetContent(q);
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

exports.getInstructorReports = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const status = String(req.query.status || "pending").toLowerCase();

    const myCourses = await Course.find({ instructor: instructorId }).select("_id");
    const myCourseIds = myCourses.map((c) => c._id);

    const q = { courseId: { $in: myCourseIds } };
    if (status !== "all") q.status = status;

    const reports = await attachTargetContent(q);
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

  const report = await ForumReport.findById(id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  report.status = action;
  report.actionBy = req.user._id;
  report.actionNote = actionNote;
  report.actionAt = new Date();
  await report.save();

  if (action === "resolved" && report.targetUserId) {
    const reasonKey = normalizeReason(report.reason) || "other";
    const policy = REPORT_POLICY[reasonKey] || REPORT_POLICY.other;

    const cnt = await getReasonCountForUser(report.targetUserId, reasonKey, { status: "resolved" });

    if (cnt === policy.warnAt || cnt === policy.blockAt) {
      const u = await userModel.findById(report.targetUserId).select("email name");

      const isBlock = cnt === policy.blockAt;
      const subject = isBlock ? "Forum posting blocked" : "Forum warning (reports)";

      const text = isBlock
        ? `Hello ${u?.name || ""},\n\nYour forum posting has been blocked because your content received ${cnt} confirmed "${reasonKey}" reports.\n\nIf you believe this is a mistake, contact support.`
        : `Hello ${u?.name || ""},\n\nWarning: Your content has received ${cnt} confirmed "${reasonKey}" reports.\n\nIf this continues, your forum posting may be blocked.\n\nPlease follow community guidelines.`;

      await sendEmail(u?.email, subject, text);
    }
  }

  return res.json({ message: "Report updated" });
};

exports.postReply = async (req, res) => {
  const { questionId, answerId, replyText } = req.body;

  // ✅ spam block check
  const gate = await assertNotReportBlocked(req, res);
  if (!gate.ok) return;

  const access = await canAccessQuestion(req.user, questionId);
  if (!access.ok) {
    return res.status(access.status).json({ message: access.message });
  }

  const question = await ForumQuestion.findById(questionId).select("isLocked isSolved");
  if (!question) return res.status(404).json({ message: "Question not found" });

  if (question.isLocked || question.isSolved) {
    return res.status(403).json({ message: "Discussion closed" });
  }

  const reply = await ForumReply.create({
    questionId,
    answerId,
    userId: req.user._id,
    replyText: replyText.trim(),
  });

  await ForumQuestion.findByIdAndUpdate(questionId, {
    lastActivityAt: new Date(),
  });

  res.status(201).json(reply);
};

exports.getRepliesForQuestion = async (req, res) => {
  const access = await canAccessQuestion(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ message: access.message });

  const replies = await ForumReply.find({
    questionId: req.params.id,
    isDeleted: false,
  }).populate("userId", "name role");

  res.json(replies);
};
