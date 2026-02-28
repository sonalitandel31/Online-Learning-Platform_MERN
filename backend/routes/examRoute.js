const express = require("express");
const router = express.Router();

const examCtrl = require("../controller/examController");
const authMiddleware = require("../middleware/authMiddleware");
const courseAccessMiddleware = require("../middleware/courseAccessMiddleware");

/* ======================================================
   Student Exam Routes (Hybrid Protected)
   ====================================================== */

router.get(
  "/course/:courseId",
  authMiddleware,
  courseAccessMiddleware,
  examCtrl.getExamsByCourse
);

router.get(
  "/course/:courseId/exam/:examId",
  authMiddleware,
  courseAccessMiddleware,
  examCtrl.getExamById
);

router.post(
  "/course/:courseId/exam/:examId/submit",
  authMiddleware,
  courseAccessMiddleware,
  examCtrl.submitExam
);

router.get(
  "/:examId/result/:studentId",
  authMiddleware,
  examCtrl.getExamResult
);

router.get(
  "/:studentId/:courseId/progress",
  authMiddleware,
  courseAccessMiddleware,
  examCtrl.getExamProgress
);

module.exports = router;
