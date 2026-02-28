// middleware/courseAccessMiddleware.js
const mongoose = require("mongoose");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const { checkSubscriptionForCourse } = require("../utils/subscriptionAccess");

module.exports = async function courseAccessMiddleware(req, res, next) {
  try {
    const userId = req.user?._id;

    // ✅ prefer params; body should not decide access for GET
    const courseId = req.params.courseId || req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    const course = await Course.findById(courseId).select("price status").lean();
    if (!course || course.status !== "approved") {
      return res.status(404).json({ success: false, message: "Course not available" });
    }

    // ✅ Free course
    if (!course.price || Number(course.price) === 0) return next();

    const now = new Date();

    // ✅ Enrollment check (purchase path) - lightweight
    const enrollmentOk = await Enrollment.exists({
      student: userId,
      course: courseId,
      status: { $ne: "cancelled" },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    });

    if (enrollmentOk) return next();

    // ✅ Subscription check
    const subCheck = await checkSubscriptionForCourse({ userId, courseId });
    if (subCheck.ok) return next();

    return res.status(403).json({
      success: false,
      message: "Access denied. Please enroll or subscribe.",
      reason: subCheck.reason || "no_active_access",
    });
  } catch (err) {
    console.error("courseAccessMiddleware error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};