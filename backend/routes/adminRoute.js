const express = require("express");
const router = express.Router();
const admin = require("../controller/adminController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/add-admin", admin.addAdmin);
router.get("/dashboard",authMiddleware, admin.dashboard);

router.get("/users", admin.getAllUsers);
router.get("/instructors", admin.getInstructors);
router.get("/instructors/:id", admin.getInstructorById);
router.get("/students", admin.getStudents);
router.get("/students/:id", admin.getStudentById);

router.get("/courses", admin.getAllCourses);
router.get("/courses/pending", admin.getPendingCourses);
router.get("/courses/rejected", admin.getRejectedCourses);
router.post("/courses/:id/approve", admin.approveCourse);
router.post("/courses/:id/reject", admin.rejectCourse);

router.get("/revenue", admin.getRevenueSummary);
router.get("/payouts", admin.getPayouts);
router.get("/transactions", admin.getTransactions);

router.get("/enrollment-stats", admin.getEnrollmentStats);
router.get("/course-performance", admin.getCoursePerformance);

module.exports = router;
