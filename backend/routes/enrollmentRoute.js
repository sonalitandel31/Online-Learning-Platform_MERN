const express = require("express");
const router = express.Router();
const { enrollCourse, getStudentEnrollments, enrolledStudent, unenrollCourse, downloadReceipt } = require("../controller/enrollmentController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, enrollCourse);
router.get("/", authMiddleware, getStudentEnrollments);
router.get("/student/:studentId/course/:courseId", enrolledStudent);
router.put("/unenroll/:courseId",authMiddleware, unenrollCourse);
router.get("/:id/receipt", authMiddleware, downloadReceipt);

module.exports = router;
