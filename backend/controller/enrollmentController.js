const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Student = require("../models/studentModel");

const path = require("path");

const enrollCourse = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.studentId;
    const { courseId, amount } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: "Missing student or course" });
    }

    const course = await Course.findById(courseId);
    if (!course || course.status !== "approved") {
      return res.status(400).json({ success: false, message: "Course not available" });
    }

    let existing = await Enrollment.findOne({ student: userId, course: courseId });

    if (existing) {
      const now = new Date();
      if (existing.status === "cancelled" || existing.expiryDate < now) {
        existing.status = "active";
        existing.paymentStatus = "complete";
        existing.amount = amount;
        existing.expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); 
        await existing.save();

        await Student.findOneAndUpdate(
          { user: userId },
          { $addToSet: { enrolledCourses: courseId } },
          { new: true }
        );

        return res.status(200).json({
          success: true,
          message: "Re-enrolled successfully",
          enrollment: existing,
        });
      }

      return res.status(400).json({ success: false, message: "Already enrolled and active" });
    }

    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
      amount,
      paymentStatus: "complete",
      status: "active",
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });

    await Student.findOneAndUpdate(
      { user: userId },
      { $addToSet: { enrolledCourses: courseId } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Enrollment successful",
      enrollment,
    });
  } catch (err) {
    console.error("EnrollCourse Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const unenrollCourse = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ student: userId, course: courseId });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    enrollment.status = "cancelled";
    await enrollment.save();

    await Student.findOneAndUpdate(
      { user: userId },
      { $pull: { enrolledCourses: courseId } }
    );

    res.json({ success: true, message: "Unenrolled successfully" });
  } catch (err) {
    console.error("UnenrollCourse Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ student: userId })
      .populate({
        path: "course",
        select: "title description price instructor status thumbnail lessons",
        populate: { path: "instructor", select: "name" },
      })
      .lean();

    const student = await Student.findOne({ user: userId })
      .populate({
        path: "enrolledCourses",
        select: "title _id",
      })
      .lean();

    res.json({ success: true, enrollments, student });
  } catch (err) {
    console.error("GetStudentEnrollments Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const enrolledStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    })
      .populate("student", "name email")
      .populate("course", "title");

    if (!enrollment) {
      return res.status(200).json({ message: "Enrollment not found" });
    }

    if (enrollment.progress === 100 && !enrollment.certificate) {
      const fileName = `${studentId}_${courseId}_Certificate.pdf`;
      const filePath = `/uploads/certificates/${fileName}`;

      enrollment.certificate = filePath;
      await enrollment.save();
    }

    res.json(enrollment);
  } catch (err) {
    console.error("Enrollment fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { enrollCourse, unenrollCourse, getStudentEnrollments, enrolledStudent };
