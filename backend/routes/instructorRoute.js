const express = require("express");
const router = express.Router();
const instructorController = require("../controller/instructorController");
const authMiddleware = require("../middleware/authMiddleware");

const { uploadLessonFile, uploadThumbnailFile } = instructorController;

router.get("/dashboard", authMiddleware, instructorController.dashboard);

router.get("/courses", authMiddleware, instructorController.courses);
router.post("/create-course", authMiddleware, instructorController.createCourse);
router.put("/course/:courseId", authMiddleware, instructorController.updateCourse);

router.put("/course/:courseId/status",authMiddleware,instructorController.updateCourseStatus);
router.delete("/course/:courseId", authMiddleware, instructorController.deleteCourse);

router.post("/lesson/upload",authMiddleware,uploadLessonFile.single("file"),instructorController.uploadLesson);
router.post("/course/upload-thumbnail",authMiddleware,uploadThumbnailFile.single("thumbnail"),instructorController.uploadThumbnail);

router.get("/course/:courseId/lessons",authMiddleware,instructorController.getLessonsByCourse);
router.post("/course/:courseId/add-lesson",authMiddleware,instructorController.addLesson);
router.put("/lesson/:lessonId", authMiddleware, instructorController.updateLesson);
router.delete("/lesson/:lessonId", authMiddleware, instructorController.deleteLesson);
router.put("/course/:courseId/reorder-lessons",authMiddleware,instructorController.reorderLessons);

router.get("/course/:courseId/students",authMiddleware,instructorController.getStudents);
router.get("/enrolled-students",authMiddleware,instructorController.getEnrolledStudents);
router.get("/students-progress",authMiddleware,instructorController.getStudentProgress);

router.get("/course/:courseId/exams",authMiddleware,instructorController.getCourseExams);
router.post("/course/:courseId/add-exam",authMiddleware,instructorController.addExam);
router.put("/exam/:examId", authMiddleware, instructorController.updateExam);
router.delete("/exam/:examId", authMiddleware, instructorController.deleteExam);
router.get("/exam-results/:examId", instructorController.getExamResults);

router.get("/course-analytics", authMiddleware, instructorController.getCourseAnalytics);
router.get("/earnings", authMiddleware, instructorController.getInstructorEarnings);
router.get("/payouts", authMiddleware, instructorController.getPayoutHistory);

router.get("/:courseId", authMiddleware, instructorController.getCourseDetail);

module.exports = router;
