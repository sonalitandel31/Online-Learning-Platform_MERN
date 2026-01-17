const lessonModel = require("../models/lessonModel");
const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const examModel = require("../models/examModel");
const fs = require("fs");
const path = require("path");
const { generateCertificate, sendCompletionEmail } = require("../utils/sendCompletionEmail");
const { v4: uuidv4 } = require("uuid");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

exports.addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, contentType, description, isPreviewFree } = req.body;

    const course = await courseModel.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    let fileUrl = null;
    if (req.file) {
      fileUrl = `${BASE_URL}/uploads/lessons/${req.file.filename}`;
    }

    const lesson = new lessonModel({
      course: courseId,
      title,
      contentType,
      fileUrl,
      description,
      isPreviewFree,
    });

    await lesson.save();
    course.lessons.push(lesson._id);
    await course.save();

    res.status(201).json({ message: "Lesson added successfully", lesson });
  } catch (error) {
    console.error("Add Lesson Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.query.studentId;

    const lessons = await lessonModel.find({ course: courseId }).sort({ createdAt: 1 });

    let lastLessonId = null;
    let completedLessons = [];

    if (studentId) {
      const enrollment = await enrollmentModel.findOne({ course: courseId, student: studentId });
      if (enrollment) {
        lastLessonId = enrollment.lastLessonId;
        completedLessons = enrollment.completedLessons?.map(l => l.toString()) || [];
      }
    }

    res.json({ lessons, lastLessonId, completedLessons });
  } catch (error) {
    console.error("Get Lessons Error:", error);
    res.status(500).json({ message: "Error fetching lessons", error: error.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const updates = req.body;

    if (req.file) updates.fileUrl = `${BASE_URL}/uploads/lessons/${req.file.filename}`;

    const lesson = await lessonModel.findByIdAndUpdate(lessonId, updates, { new: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    res.json({ message: "Lesson updated successfully", lesson });
  } catch (error) {
    console.error("Update Lesson Error:", error);
    res.status(500).json({ message: "Error updating lesson", error: error.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await lessonModel.findByIdAndDelete(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    if (lesson.fileUrl) {
      const filePath = path.join(__dirname, "..", "uploads", "lessons", path.basename(lesson.fileUrl));
      fs.unlink(filePath, err => {
        if (err) console.warn("File deletion failed:", err);
      });
    }

    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Delete Lesson Error:", error);
    res.status(500).json({ message: "Error deleting lesson", error: error.message });
  }
};

exports.getCompletedLessons = async (req, res) => {
  try {
    const { studentId } = req.params;
    const enrollments = await enrollmentModel.find({ student: studentId });

    const completedLessons = [];
    enrollments.forEach(enroll => {
      if (enroll.completedLessons) {
        completedLessons.push(...enroll.completedLessons.map(l => l.toString()));
      }
    });

    //remove duplicates
    const uniqueLessons = [...new Set(completedLessons)];

    res.json(uniqueLessons);
  } catch (error) {
    console.error("Get Completed Lessons Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.saveLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { studentId, courseId, watchedPercent, lastPosition } = req.body;

    const enrollment = await enrollmentModel.findOne({ student: studentId, course: courseId });
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });

    //update or insert lesson progress
    let lessonData = enrollment.lessonProgress.find(l => l.lesson.toString() === lessonId);
    if (lessonData) {
      lessonData.watchedPercent = watchedPercent;
      lessonData.lastPosition = lastPosition;
    } else {
      enrollment.lessonProgress.push({ lesson: lessonId, watchedPercent, lastPosition });
    }

    //if watched >= 90%, mark as completed
    if (watchedPercent >= 90) {
      enrollment.completedLessons = Array.from(
        new Set([
          ...enrollment.completedLessons.map(id => id.toString()),
          lessonId.toString(),
        ])
      );
    }

    //update course progress
    const course = await courseModel.findById(courseId).populate("lessons");
    const totalLessons = course.lessons.length;
    const completedCount = enrollment.completedLessons.length;
    enrollment.progress = Math.round((completedCount / totalLessons) * 100);

    await enrollment.save();

    res.json({
      message: "Progress saved successfully",
      progress: enrollment.progress,
      watchedPercent,
      lastPosition
    });
  } catch (error) {
    console.error("Save Progress Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.markLessonAsWatched = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ message: "Student ID and Course ID required" });
    }

    const enrollment = await enrollmentModel
      .findOne({ student: studentId, course: courseId })
      .populate("student")
      .populate("course");

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    enrollment.completedLessons = Array.from(
      new Set([
        ...enrollment.completedLessons.map(id => id.toString()),
        lessonId.toString(),
      ])
    );

    enrollment.lastLessonId = lessonId;

    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await examModel.countDocuments({ course: courseId });
    const totalItems = totalLessons + totalExams;

    const completedLessonsCount = enrollment.completedLessons.length;
    const completedExamsCount = (enrollment.examProgress || []).filter(e => e.isCompleted).length;
    const totalCompleted = completedLessonsCount + completedExamsCount;

    if (totalLessons === 0) {
      enrollment.progress = 0;
    } else if (totalExams === 0) {
      enrollment.progress = Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100));
    } else {
      enrollment.progress = Math.min(100, Math.round((totalCompleted / totalItems) * 100));
    }

    //if completed all -> generate certificate
    if (enrollment.progress >= 100 && enrollment.status !== "completed") {
      enrollment.status = "completed";

      const course = await courseModel
        .findById(courseId)
        .populate("instructor", "name email");

      const certId = uuidv4();
      const instructorName = course?.instructor?.name || "Instructor";

      console.log("🧾 Instructor Name:", instructorName);

      const certPath = await generateCertificate(
        enrollment.student.name,
        course.title,
        instructorName,
        certId
      );

      enrollment.certificate = `/uploads/certificates/${certId}.pdf`;
      await sendCompletionEmail(enrollment.student, course, certPath);
    }

    await enrollment.save();

    res.status(200).json({
      message: "Lesson marked as watched successfully",
      progress: enrollment.progress,
      status: enrollment.status,
      certificate: enrollment.certificate || null,
      lastLessonId: lessonId,
    });
  } catch (error) {
    console.error("Mark Lesson Watched Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
