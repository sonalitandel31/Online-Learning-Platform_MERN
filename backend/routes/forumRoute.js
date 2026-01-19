// routes/forumRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getForumCount,
  createQuestion,
  getCourseQuestions,
  getQuestionDetail,
  markQuestionSolved,
  deleteQuestion,
  postAnswer,
  upvoteAnswer,
  getInstructorQuestions,
  getAdminQuestions,
  setQuestionLock,
} = require("../controller/forumController");

// Public count
router.get("/course/:courseId/count", getForumCount);

// Student view
router.post("/question", authMiddleware, createQuestion);
router.get("/course/:courseId", authMiddleware, getCourseQuestions);
router.get("/question/:id", authMiddleware, getQuestionDetail);

// Instructor/Admin actions
router.put(
  "/question/:id/solve",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  markQuestionSolved
);

router.put(
  "/question/:id/lock",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  setQuestionLock
);

// Admin moderation
router.delete("/question/:id", authMiddleware, roleMiddleware(["admin"]), deleteQuestion);

// Answers
router.post("/answer", authMiddleware, postAnswer);
router.put("/answer/upvote/:id", authMiddleware, upvoteAnswer);

// Panels
router.get("/instructor/questions", authMiddleware, roleMiddleware(["instructor"]), getInstructorQuestions);
router.get("/admin/questions", authMiddleware, roleMiddleware(["admin"]), getAdminQuestions);

module.exports = router;
