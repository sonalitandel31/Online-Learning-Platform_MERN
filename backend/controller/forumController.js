// controller/forumController.js
const ForumQuestion = require("../models/forumQuestionModel");
const ForumAnswer = require("../models/forumAnswerModel");
const Course = require("../models/courseModel");
const { default: mongoose } = require("mongoose");

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function assertInstructorOwnsCourseByQuestion(questionId, instructorId) {
  const question = await ForumQuestion.findById(questionId).select("courseId");
  if (!question) return { ok: false, status: 404, message: "Question not found" };

  const course = await Course.findById(question.courseId).select("instructor");
  if (!course) return { ok: false, status: 404, message: "Course not found" };

  if (course.instructor.toString() !== instructorId.toString()) {
    return { ok: false, status: 403, message: "Not allowed for this course" };
  }

  return { ok: true, question, course };
}

// -------- Discussion count (public) --------
exports.getForumCount = async (req, res) => {
  try {
    const count = await ForumQuestion.countDocuments({ courseId: req.params.courseId });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ count: 0 });
  }
};

// -------- Create Question (student) --------
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

// -------- Get all questions for a course (student view) --------
exports.getCourseQuestions = async (req, res) => {
  try {
    const courseObjectId = new mongoose.Types.ObjectId(req.params.courseId);

    const questions = await ForumQuestion.aggregate([
      { $match: { courseId: courseObjectId } },
      {
        $lookup: {
          from: "forumanswers",
          localField: "_id",
          foreignField: "questionId",
          as: "answers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $addFields: {
          answerCount: { $size: "$answers" },
          totalUpvotes: { $sum: "$answers.upvotes" },
        },
      },
      { $project: { answers: 0, "user.password": 0 } },
      { $sort: { lastActivityAt: -1, createdAt: -1 } },
    ]);

    res.json(
      questions.map((q) => ({
        ...q,
        userId: { name: q.user.name },
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
};

// -------- Question detail (student/instructor/admin) --------
exports.getQuestionDetail = async (req, res) => {
  try {
    const question = await ForumQuestion.findById(req.params.id).populate("userId", "name");
    if (!question) return res.status(404).json({ message: "Question not found" });

    const answers = await ForumAnswer.find({ questionId: question._id })
      .populate("userId", "name role")
      .sort({ isVerified: -1, createdAt: 1 });

    const userIdStr = req.user._id.toString();

    const formattedAnswers = answers.map((ans) => {
      const upvotedByStr = (ans.upvotedBy || []).map((x) => x.toString());
      return {
        ...ans.toObject(),
        hasLiked: upvotedByStr.includes(userIdStr),
        isOwner: ans.userId?._id?.toString() === userIdStr,
      };
    });

    res.json({ question, answers: formattedAnswers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch question detail" });
  }
};

// -------- Post Answer (student/instructor) --------
exports.postAnswer = async (req, res) => {
  const { questionId, answerText } = req.body;
  if (!questionId || !answerText?.trim()) {
    return res.status(400).json({ message: "Answer required" });
  }
  if (!isObjectId(questionId)) return res.status(400).json({ message: "Invalid questionId" });

  try {
    const question = await ForumQuestion.findById(questionId).select("isLocked isSolved");
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

// -------- Upvote toggle (no self upvote) --------
exports.upvoteAnswer = async (req, res) => {
  try {
    const answer = await ForumAnswer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    const userId = req.user._id;
    const userIdStr = userId.toString();

    // Prevent self-upvoting
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

// -------- Mark Question Solved (instructor/admin) --------
exports.markQuestionSolved = async (req, res) => {
  const { answerId } = req.body;
  const { id: questionId } = req.params;

  if (!isObjectId(questionId) || !isObjectId(answerId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const question = await ForumQuestion.findById(questionId).select("courseId");
    if (!question) return res.status(404).json({ message: "Question not found" });

    // If instructor: must own course
    if (req.user.role?.toLowerCase() === "instructor") {
      const check = await assertInstructorOwnsCourseByQuestion(questionId, req.user._id);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    // Ensure answer belongs to this question
    const ans = await ForumAnswer.findOne({ _id: answerId, questionId });
    if (!ans) return res.status(400).json({ message: "Answer does not belong to this question" });

    // Reset all verified for this question
    await ForumAnswer.updateMany({ questionId }, { isVerified: false });

    await ForumQuestion.findByIdAndUpdate(questionId, {
      isSolved: true,
      verifiedAnswerId: answerId,
      lastActivityAt: new Date(),
    });

    await ForumAnswer.findByIdAndUpdate(answerId, { isVerified: true });

    res.json({ message: "Question marked as solved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark as solved" });
  }
};

// -------- Lock/Unlock Question (instructor/admin) --------
exports.setQuestionLock = async (req, res) => {
  const { id: questionId } = req.params;
  const { isLocked } = req.body;

  if (!isObjectId(questionId)) return res.status(400).json({ message: "Invalid questionId" });

  try {
    if (req.user.role?.toLowerCase() === "instructor") {
      const check = await assertInstructorOwnsCourseByQuestion(questionId, req.user._id);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    const updated = await ForumQuestion.findByIdAndUpdate(
      questionId,
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

// -------- Delete Question (admin) --------
exports.deleteQuestion = async (req, res) => {
  try {
    await ForumAnswer.deleteMany({ questionId: req.params.id });
    await ForumQuestion.findByIdAndDelete(req.params.id);
    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete question" });
  }
};

// -------- Instructor Panel Questions (only their courses) --------
exports.getInstructorQuestions = async (req, res) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(req.user._id);

    const questions = await ForumQuestion.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      // Only instructor's courses
      { $match: { "course.instructor": instructorId } },
      { $sort: { lastActivityAt: -1, createdAt: -1 } },
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
          as: "answers",
        },
      },
      {
        $addFields: {
          answerCount: { $size: "$answers" },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          isSolved: 1,
          isLocked: 1,
          verifiedAnswerId: 1,
          lastActivityAt: 1,
          createdAt: 1,
          answerCount: 1,
          courseTitle: "$course.title",
          userId: { name: "$asker.name" },
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

// -------- Admin Panel Questions (all courses) --------
exports.getAdminQuestions = async (req, res) => {
  try {
    const questions = await ForumQuestion.aggregate([
      { $sort: { lastActivityAt: -1, createdAt: -1 } },

      // Course title
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },

      // Asker name
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "asker",
        },
      },
      { $unwind: { path: "$asker", preserveNullAndEmptyArrays: true } },

      // Answers + answer user
      {
        $lookup: {
          from: "forumanswers",
          localField: "_id",
          foreignField: "questionId",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "answerUser",
              },
            },
            { $unwind: { path: "$answerUser", preserveNullAndEmptyArrays: true } },
            { $sort: { isVerified: -1, createdAt: 1 } }, // verified first, then oldest first
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
          userId: { name: "$asker.name" },

          // IMPORTANT: Send answers in the exact shape frontend expects
          answers: {
            $map: {
              input: "$answers",
              as: "ans",
              in: {
                _id: "$$ans._id",
                answerText: "$$ans.answerText",
                isVerified: "$$ans.isVerified",
                createdAt: "$$ans.createdAt",
                userId: { name: "$$ans.answerUser.name" },
              },
            },
          },
        },
      },
    ]);

    res.json(questions);
  } catch (err) {
    console.error("Admin Question Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

