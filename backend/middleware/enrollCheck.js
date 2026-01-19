const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

const canAccessForum = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role?.toLowerCase();
    
    if (role === "admin") return next();

    const courseId = req.body.courseId || req.params.courseId;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required to access forum" });
    }

    if (role === "instructor") {
      const course = await Course.findById(courseId);
      if (course && course.instructor.toString() === userId.toString()) {
        return next();
      }
      return res.status(403).json({ message: "You can only access forums of your own courses" });
    }

    const isEnrolled = await Enrollment.findOne({ userId, courseId });

    if (!isEnrolled) {
      return res.status(403).json({ 
        message: "Aapne is course mein enroll nahi kiya hai. Forum access karne ke liye pehle enroll karein." 
      });
    }

    next();
  } catch (err) {
    console.error("Enrollment Check Error:", err);
    res.status(500).json({ message: "Internal server error during access check" });
  }
};

module.exports = canAccessForum;