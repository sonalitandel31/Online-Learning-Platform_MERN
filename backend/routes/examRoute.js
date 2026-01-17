const express = require("express");
const router = express.Router();
const examCtrl = require("../controller/examController");

router.get("/course/:courseId", examCtrl.getExamsByCourse);
router.get("/:examId/result/:studentId", examCtrl.getExamResult);
router.post("/submit", examCtrl.submitExam);
router.get("/:examId", examCtrl.getExamById);
router.get("/:studentId/:courseId/progress", examCtrl.getExamProgress);

module.exports = router;
