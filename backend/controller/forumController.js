const ForumQuestion = require("../models/forumQuestionModel");
const ForumAnswer = require("../models/forumAnswerModel");
const { default: mongoose } = require("mongoose");

// -------- Discussion count (public) --------
exports.getForumCount = async (req, res) => {
  try {
    const count = await ForumQuestion.countDocuments({
      courseId: req.params.courseId,
    });
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

  try {
    const question = await ForumQuestion.create({
      courseId,
      userId: req.user._id,
      title,
      description,
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
    const questions = await ForumQuestion.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(req.params.courseId) } },
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
      { $sort: { createdAt: -1 } },
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

exports.getQuestionDetail = async (req, res) => {
  try {
    const question = await ForumQuestion.findById(req.params.id).populate("userId", "name");
    if (!question) return res.status(404).json({ message: "Question not found" });

    const answers = await ForumAnswer.find({ questionId: question._id })
      .populate("userId", "name")
      .sort({ isVerified: -1, createdAt: 1 });

    // Add a 'hasLiked' flag for the current user
    const formattedAnswers = answers.map(ans => ({
      ...ans.toObject(),
      hasLiked: ans.upvotedBy.includes(req.user._id)
    }));

    res.json({ question, answers: formattedAnswers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch question detail" });
  }
};

// -------- Post Answer (student/instructor) --------
exports.postAnswer = async (req, res) => {
  const { questionId, answerText } = req.body;
  if (!answerText) return res.status(400).json({ message: "Answer required" });

  try {
    const answer = await ForumAnswer.create({
      questionId,
      userId: req.user._id,
      answerText,
    });
    res.status(201).json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to post answer" });
  }
};

exports.upvoteAnswer = async (req, res) => {
  try {
    const answer = await ForumAnswer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    // 1. Prevent self-upvoting
    if (answer.userId.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "Cannot upvote your own answer" });
    }

    // 2. Check if user already upvoted (assuming you add 'upvotedBy' to your Schema)
    const userId = req.user._id;
    const alreadyUpvoted = answer.upvotedBy.includes(userId);

    if (alreadyUpvoted) {
      /* // Option A: Simply return an error
      return res.status(400).json({ message: "You have already upvoted this answer" });
       */

      // Option B: Toggle upvote (Remove it if clicked again)
      await ForumAnswer.findByIdAndUpdate(req.params.id, {
        $pull: { upvotedBy: userId },
        $inc: { upvotes: -1 }
      });
      return res.json({ message: "Upvote removed" });
      
    }

    // 3. Add user to upvotedBy array and increment the count
    answer.upvotedBy.push(userId);
    answer.upvotes += 1;
    await answer.save();

    res.json({ upvotes: answer.upvotes, hasLiked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upvote answer" });
  }
};

// -------- Mark Question Solved (instructor/admin) --------
exports.markQuestionSolved = async (req, res) => {
  const { answerId } = req.body;
  const { id } = req.params; // questionId

  try {
    const question = await ForumQuestion.findById(id);
    if (!question) return res.status(404).json({ message: "Question not found" });

    question.isSolved = true;
    question.verifiedAnswerId = answerId;
    await question.save();

    await ForumAnswer.findByIdAndUpdate(answerId, { isVerified: true });
    res.json({ message: "Question marked as solved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark as solved" });
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

// -------- Instructor Panel Questions --------
exports.getInstructorQuestions = async (req, res) => {
  try {
    const questions = await ForumQuestion.find()
      .populate("userId", "name")
      .populate("courseId", "title")
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      questions.map(async (q) => {
        const answerCount = await ForumAnswer.countDocuments({ questionId: q._id });
        const answers = await ForumAnswer.find({ questionId: q._id });
        return {
          ...q.toObject(),
          courseTitle: q.courseId?.title,
          answerCount,
          answers,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

// -------- Admin Panel Questions (read-only) --------
exports.getAdminQuestions = async (req, res) => {
  try {
    const questions = await ForumQuestion.find()
      .populate("userId", "name")
      .populate("courseId", "title")
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      questions.map(async (q) => {
        const answerCount = await ForumAnswer.countDocuments({ questionId: q._id });
        return {
          ...q.toObject(),
          courseTitle: q.courseId?.title,
          answerCount,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};
