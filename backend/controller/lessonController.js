const lessonModel = require("../models/lessonModel");
const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const examModel = require("../models/examModel");
const fs = require("fs");
const path = require("path");
const { generateCertificate, sendCompletionEmail } = require("../utils/sendCompletionEmail");
const { v4: uuidv4 } = require("uuid");

const studentModel = require("../models/studentModel");
const { awardXpOnce } = require("../services/gamificationService");

const { getOrCreateEnrollmentForAccess } = require("../utils/getOrCreateEnrollment");
const { checkSubscriptionForCourse } = require("../utils/subscriptionAccess");


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

/* exports.getLessonsByCourse = async (req, res) => {
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
}; */

exports.getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Subscription access check (all/selected + status window)
    const access = await checkSubscriptionForCourse({ userId, courseId });

    // ✅ If no access, only return preview lessons
    const query = access.ok
      ? { course: courseId }
      : { course: courseId, isPreviewFree: true };

    // ✅ Important: avoid leaking fileUrl for locked lessons
    // (If your lessonModel contains fileUrl, this select ensures safe fields)
    const lessons = await lessonModel
      .find(query)
      .select("title contentType description isPreviewFree fileUrl createdAt")
      .sort({ createdAt: 1 })
      .lean();

    // ✅ Enrollment progress (optional — even non-subscribers can have none)
    let lastLessonId = null;
    let completedLessons = [];

    const enrollment = await enrollmentModel
      .findOne({ course: courseId, student: userId })
      .select("lastLessonId completedLessons")
      .lean();

    if (enrollment) {
      lastLessonId = enrollment.lastLessonId || null;
      completedLessons = enrollment.completedLessons?.map((l) => String(l)) || [];
    }

    return res.json({
      lessons,
      lastLessonId,
      completedLessons,
      access: {
        ok: access.ok,
        reason: access.ok ? null : access.reason,
        scope: access.ok ? "full" : "preview",
      },
    });
  } catch (error) {
    console.error("Get Lessons Error:", error);
    return res.status(500).json({ message: "Error fetching lessons" });
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

/* exports.saveLessonProgress = async (req, res) => {
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
}; */

exports.saveLessonProgress = async (req, res) => {
  try {
    const { lessonId, courseId } = req.params;
    const userId = req.user?._id;
    const { watchedPercent = 0, lastPosition = 0 } = req.body;

    const { enrollment } = await getOrCreateEnrollmentForAccess({ userId, courseId });
    if (!enrollment) return res.status(403).json({ message: "Access denied" });

    // ensure lessonProgress array exists
    enrollment.lessonProgress = enrollment.lessonProgress || [];

    let lessonData = enrollment.lessonProgress.find((l) => String(l.lesson) === String(lessonId));
    if (lessonData) {
      lessonData.watchedPercent = watchedPercent;
      lessonData.lastPosition = lastPosition;
    } else {
      enrollment.lessonProgress.push({ lesson: lessonId, watchedPercent, lastPosition });
    }

    if (watchedPercent >= 90) {
      const set = new Set(enrollment.completedLessons.map((id) => String(id)));
      set.add(String(lessonId));
      enrollment.completedLessons = Array.from(set);
    }

    // update course progress (use counts, not populate lessons if possible)
    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await examModel.countDocuments({ course: courseId });

    const completedLessonsCount = enrollment.completedLessons.length;
    const completedExamsCount = (enrollment.examProgress || []).filter((e) => e.isCompleted).length;

    const totalItems = totalLessons + totalExams;
    const totalCompleted = completedLessonsCount + completedExamsCount;

    enrollment.progress =
      totalItems === 0 ? 0 : Math.min(100, Math.round((totalCompleted / totalItems) * 100));

    await enrollment.save();

    return res.json({
      message: "Progress saved successfully",
      progress: enrollment.progress,
      watchedPercent,
      lastPosition,
    });
  } catch (error) {
    console.error("Save Progress Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* exports.markLessonAsWatched = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ message: "Student ID and Course ID required" });
    }

    // enrollment.student === USER ID
    const enrollment = await enrollmentModel
      .findOne({ student: studentId, course: courseId })
      .populate("student") // user
      .populate("course");

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // ✅ GET STUDENT DOCUMENT (THIS IS THE LINE YOU ASKED ABOUT)
    const studentDoc = await studentModel.findOne({
      user: enrollment.student._id || enrollment.student,
    });

    if (!studentDoc) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // ✅ check if lesson already completed
    const alreadyCompleted = enrollment.completedLessons.some(
      (id) => id.toString() === lessonId
    );

    if (!alreadyCompleted) {
      enrollment.completedLessons.push(lessonId);
    }

    enrollment.lastLessonId = lessonId;

    // progress calculation
    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await examModel.countDocuments({ course: courseId });

    const completedLessonsCount = enrollment.completedLessons.length;
    const completedExamsCount = enrollment.examProgress.filter(e => e.isCompleted).length;

    const totalItems = totalLessons + totalExams;
    const totalCompleted = completedLessonsCount + completedExamsCount;

    enrollment.progress = totalItems === 0
      ? 0
      : Math.min(100, Math.round((totalCompleted / totalItems) * 100));

    const wasCourseCompleted = enrollment.status === "completed";
    const isCourseCompletedNow = enrollment.progress >= 100 && !wasCourseCompleted;

    // 🎮 XP AWARDS
    const xpAwards = [];

    // ✅ Lesson XP (only once)
    if (!alreadyCompleted) {
      const xpRes = await awardXpOnce({
        studentId: studentDoc._id,
        courseId,
        event: "LESSON_COMPLETE",
        refId: lessonId,
        xp: 10,
      });
      if (xpRes.awarded) xpAwards.push(xpRes);
    }

    // ✅ Course completion XP (only once)
    if (isCourseCompletedNow) {
      const xpRes = await awardXpOnce({
        studentId: studentDoc._id,
        courseId,
        event: "COURSE_COMPLETE",
        refId: courseId,
        xp: 100,
      });
      if (xpRes.awarded) xpAwards.push(xpRes);

      enrollment.status = "completed";

      // certificate
      const course = await courseModel
        .findById(courseId)
        .populate("instructor", "name");

      const certId = uuidv4();
      const certPath = await generateCertificate(
        enrollment.student.name,
        course.title,
        course.instructor?.name || "Instructor",
        certId
      );

      enrollment.certificate = `/uploads/certificates/${certId}.pdf`;
      await sendCompletionEmail(enrollment.student, course, certPath);
    }

    await enrollment.save();

    return res.json({
      message: "Lesson marked as watched",
      progress: enrollment.progress,
      status: enrollment.status,
      xpAwards,
    });

  } catch (err) {
    console.error("markLessonAsWatched error:", err);
    res.status(500).json({ message: "Server error" });
  }
}; */

exports.markLessonAsWatched = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { courseId } = req.params;
    const userId = req.user?._id;

    // ✅ enrollment exists OR auto-created for subscription
    const { enrollment } = await getOrCreateEnrollmentForAccess({ userId, courseId });
    if (!enrollment) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ student profile
    const studentDoc = await studentModel.findOne({ user: userId });
    if (!studentDoc) return res.status(404).json({ message: "Student profile not found" });

    // ✅ check if lesson already completed
    const alreadyCompleted = enrollment.completedLessons.some((id) => String(id) === String(lessonId));
    if (!alreadyCompleted) enrollment.completedLessons.push(lessonId);

    enrollment.lastLessonId = lessonId;

    // progress calculation
    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await examModel.countDocuments({ course: courseId });

    const completedLessonsCount = enrollment.completedLessons.length;
    const completedExamsCount = (enrollment.examProgress || []).filter((e) => e.isCompleted).length;

    const totalItems = totalLessons + totalExams;
    const totalCompleted = completedLessonsCount + completedExamsCount;

    enrollment.progress =
      totalItems === 0 ? 0 : Math.min(100, Math.round((totalCompleted / totalItems) * 100));

    const wasCourseCompleted = enrollment.status === "completed";
    const isCourseCompletedNow = enrollment.progress >= 100 && !wasCourseCompleted;

    // 🎮 XP AWARDS
    const xpAwards = [];

    if (!alreadyCompleted) {
      const xpRes = await awardXpOnce({
        studentId: studentDoc._id,
        courseId,
        event: "LESSON_COMPLETE",
        refId: lessonId,
        xp: 10,
      });
      if (xpRes.awarded) xpAwards.push(xpRes);
    }

    if (isCourseCompletedNow) {
      const xpRes = await awardXpOnce({
        studentId: studentDoc._id,
        courseId,
        event: "COURSE_COMPLETE",
        refId: courseId,
        xp: 100,
      });
      if (xpRes.awarded) xpAwards.push(xpRes);

      enrollment.status = "completed";

      const course = await courseModel.findById(courseId).populate("instructor", "name");
      const certId = uuidv4();
      const certPath = await generateCertificate(
        req.user?.name || "Student",
        course.title,
        course.instructor?.name || "Instructor",
        certId
      );

      enrollment.certificate = `/uploads/certificates/${certId}.pdf`;
      await sendCompletionEmail(req.user, course, certPath);
    }

    await enrollment.save();

    return res.json({
      message: "Lesson marked as watched",
      progress: enrollment.progress,
      status: enrollment.status,
      xpAwards,
    });
  } catch (err) {
    console.error("markLessonAsWatched error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
