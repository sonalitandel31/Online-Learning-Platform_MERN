const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getForumCount,
  createQuestion,
  getCourseQuestions,
  getQuestionDetail,

  acceptAnswerByOwner,
  verifyAnswerByInstructor,

  reportContent,
  getInstructorReports,
  getAdminReports,
  resolveReport,

  postReply,
  getRepliesForQuestion,

  deleteQuestion,
  postAnswer,
  upvoteAnswer,

  getInstructorQuestions,
  getAdminQuestions,

  setQuestionLock,
} = require("../controller/forumController");

// ---------- Public ----------
router.get("/course/:courseId/count", getForumCount);

// ---------- Student/general authenticated ----------
router.post("/question", authMiddleware, createQuestion);
router.get("/course/:courseId", authMiddleware, getCourseQuestions);
router.get("/question/:id", authMiddleware, getQuestionDetail);

//Answers
router.post("/answer", authMiddleware, postAnswer);
router.put("/answer/upvote/:id", authMiddleware, upvoteAnswer);

//Accept (question owner)
router.put(
  "/question/:id/accept",
  authMiddleware,
  roleMiddleware(["student", "user", "admin", "instructor"]),
  acceptAnswerByOwner
);

//Verify (instructor/admin)
router.put(
  "/question/:id/verify",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  verifyAnswerByInstructor
);

//Lock/Unlock (instructor/admin)
router.put(
  "/question/:id/lock",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  setQuestionLock
);

//Admin moderation
router.delete(
  "/question/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteQuestion
);

//Panels
router.get(
  "/instructor/questions",
  authMiddleware,
  roleMiddleware(["instructor"]),
  getInstructorQuestions
);

router.get(
  "/admin/questions",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminQuestions
);

// ---------- Reports ----------
router.post("/report", authMiddleware, reportContent);

router.get(
  "/instructor/reports",
  authMiddleware,
  roleMiddleware(["instructor"]),
  getInstructorReports
);

router.get(
  "/admin/reports",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminReports
);

router.put(
  "/report/:id/action",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  resolveReport
);

// ---------- Replies (threaded) ----------
router.post("/reply", authMiddleware, postReply);
router.get("/question/:id/replies", authMiddleware, getRepliesForQuestion);

module.exports = router;
