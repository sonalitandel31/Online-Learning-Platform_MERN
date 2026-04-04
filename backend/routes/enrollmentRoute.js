const express = require("express");
const router = express.Router();
const { enrollCourse, getStudentEnrollments, enrolledStudent, unenrollCourse, downloadReceipt, getEnrollmentById } = require("../controller/enrollmentController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, enrollCourse);
router.get("/", authMiddleware, getStudentEnrollments);
router.get("/student/:studentId/course/:courseId",authMiddleware, enrolledStudent);
router.put("/unenroll/:courseId",authMiddleware, unenrollCourse);
router.get("/:id/receipt", authMiddleware, downloadReceipt);
router.get('/:id', authMiddleware, getEnrollmentById);

module.exports = router;
