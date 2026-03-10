const express = require("express");
const router = express.Router();
const admin = require("../controller/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.post("/add-admin", admin.addAdmin);
router.get("/dashboard",authMiddleware, admin.dashboard);

router.get("/users", authMiddleware, roleMiddleware(["admin"]), admin.getAllUsers);
router.get("/instructors", admin.getInstructors);
router.get("/instructors/:id", admin.getInstructorById);
router.get("/students", admin.getStudents);
router.get("/students/:id", admin.getStudentById);

router.get("/courses", admin.getAllCourses);
router.get("/courses/pending", admin.getPendingCourses);
router.get("/courses/:courseId/content", authMiddleware, roleMiddleware(["admin"]), admin.getCourseContentForReview);
router.get("/courses/rejected", admin.getRejectedCourses);
router.post("/courses/:id/approve", authMiddleware, roleMiddleware(["admin"]), admin.approveCourse);
router.post("/courses/:id/reject", authMiddleware, roleMiddleware(["admin"]), admin.rejectCourse);

router.get("/revenue", admin.getRevenueSummary);
router.get("/payouts", admin.getPayouts);
router.get("/transactions", admin.getTransactions);

router.get("/enrollment-stats", admin.getEnrollmentStats);
router.get("/course-performance", admin.getCoursePerformance);

module.exports = router;
