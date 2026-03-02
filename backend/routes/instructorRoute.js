const express = require("express");
const router = express.Router();
const instructorController = require("../controller/instructorController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const { uploadLessonFile, uploadThumbnailFile } = instructorController;

router.use(authMiddleware, roleMiddleware(["instructor"]));

router.get("/dashboard", instructorController.dashboard);

router.get("/courses", instructorController.courses);
router.post("/create-course", instructorController.createCourse);
router.put("/course/:courseId", instructorController.updateCourse);

router.put("/course/:courseId/status", instructorController.updateCourseStatus);
router.delete("/course/:courseId", instructorController.deleteCourse);

router.post("/lesson/upload", uploadLessonFile.single("file"), instructorController.uploadLesson);
router.post( "/course/upload-thumbnail", uploadThumbnailFile.single("thumbnail"), instructorController.uploadThumbnail);

router.get("/course/:courseId/lessons", instructorController.getLessonsByCourse);
router.post("/course/:courseId/add-lesson", instructorController.addLesson);
router.put("/lesson/:lessonId", instructorController.updateLesson);
router.delete("/lesson/:lessonId", instructorController.deleteLesson);
router.put("/course/:courseId/reorder-lessons", instructorController.reorderLessons);

router.get("/course/:courseId/students", instructorController.getStudents);
router.get("/enrolled-students", instructorController.getEnrolledStudents);
router.get("/students-progress", instructorController.getStudentProgress);

// router.get("/course/:courseId/exams", instructorController.getCourseExams);
router.get("/course/:courseId/exams", instructorController.getInstructorCourseExams);
router.post("/course/:courseId/add-exam", instructorController.addExam);
router.put("/exam/:examId", instructorController.updateExam);
router.delete("/exam/:examId", instructorController.deleteExam);

router.get("/exam-results/:examId", instructorController.getExamResults);

router.get("/course-analytics", instructorController.getCourseAnalytics);
router.get("/earnings", instructorController.getInstructorEarnings);
router.get("/payouts", instructorController.getPayoutHistory);

router.get("/course/:courseId/detail", instructorController.getCourseDetail);
router.get("/course/:courseId/details", instructorController.getCourseDetailForInstructor);

module.exports = router;