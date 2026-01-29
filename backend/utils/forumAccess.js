const mongoose = require("mongoose");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const ForumQuestion = require("../models/forumQuestionModel");

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const roleOf = (user) => (user?.role || "").toLowerCase();

/**
 * Check access by courseId
 */
async function canAccessCourse(user, courseId) {
  if (!isObjectId(courseId)) {
    return { ok: false, status: 400, message: "Invalid courseId" };
  }

  // Admin → full access
  if (roleOf(user) === "admin") return { ok: true };

  const course = await Course.findById(courseId).select("instructor");
  if (!course) return { ok: false, status: 404, message: "Course not found" };

  // Instructor → only own course
  if (roleOf(user) === "instructor") {
    if (course.instructor.toString() !== user._id.toString()) {
      return { ok: false, status: 403, message: "Not allowed for this course" };
    }
    return { ok: true };
  }

  // Student/User → must be enrolled
  const enrollment = await Enrollment.findOne({
    student: user._id,
    course: courseId,
    status: "active",
    expiryDate: { $gte: new Date() },
  }).select("_id");

  if (!enrollment) {
    return { ok: false, status: 403, message: "You are not enrolled in this course" };
  }

  return { ok: true };
}

/**
 * Check access by questionId
 */
async function canAccessQuestion(user, questionId) {
  if (!isObjectId(questionId)) {
    return { ok: false, status: 400, message: "Invalid questionId" };
  }

  const q = await ForumQuestion.findOne({
    _id: questionId,
    isDeleted: false,
  }).select("courseId");

  if (!q) return { ok: false, status: 404, message: "Question not found" };

  return canAccessCourse(user, q.courseId);
}

module.exports = { canAccessCourse, canAccessQuestion, isObjectId };
