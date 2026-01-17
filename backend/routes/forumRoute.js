const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware"); // make sure you have this
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
} = require("../controller/forumController");

// -------- Discussion count (public) --------
router.get("/course/:courseId/count", getForumCount);

// -------- Question routes --------
router.post("/question", authMiddleware, createQuestion); // student
router.get("/course/:courseId", authMiddleware, getCourseQuestions); // student
router.get("/question/:id", authMiddleware, getQuestionDetail); // student
router.put("/question/:id/solve", authMiddleware, roleMiddleware(["instructor", "admin"]), markQuestionSolved); // instructor/admin
router.delete("/question/:id", authMiddleware, roleMiddleware(["admin"]), deleteQuestion);

// -------- Answer routes --------
router.post("/answer", authMiddleware, postAnswer);
router.put("/answer/upvote/:id", authMiddleware, upvoteAnswer);

// -------- Instructor panel --------
router.get("/instructor/questions", authMiddleware, roleMiddleware(["instructor"]), getInstructorQuestions);

// -------- Admin panel (read-only) --------
router.get("/admin/questions", authMiddleware, roleMiddleware(["admin"]), getAdminQuestions);

module.exports = router;
