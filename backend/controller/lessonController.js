const lessonModel = require("../models/lessonModel");
const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const examModel = require("../models/examModel");
const userModel = require("../models/userModel");
const studentModel = require("../models/studentModel");
const Payment = require("../models/paymentModel");
const AnalyticsEvent = require("../models/analyticsEventModel");

const fs = require("fs");
const path = require("path");
const { generateCertificate, sendCompletionEmail } = require("../utils/sendCompletionEmail");
const { v4: uuidv4 } = require("uuid");

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
}; */

exports.markLessonAsWatched = async (req, res) => {
  try {
    const { lessonId, courseId } = req.params;
    const userId = req.user?._id;

    const { enrollment } = await getOrCreateEnrollmentForAccess({ userId, courseId });
    if (!enrollment) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NAYA LOGIC: Student aur User alag-alag fetch karenge
    const studentDoc = await studentModel.findOne({ user: userId });
    if (!studentDoc) return res.status(404).json({ message: "Student profile not found" });

    // User model se companyId populate karke branding nikalenge (Ensure userModel is required at top)
    const userDoc = await userModel.findById(userId).populate({
      path: "companyId",
      select: "branding"
    });
    const companyBranding = userDoc?.companyId?.branding || null;

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

    enrollment.progress = totalItems === 0 ? 0 : Math.min(100, Math.round((totalCompleted / totalItems) * 100));

    const wasCourseCompleted = enrollment.status === "completed";
    const isCourseCompletedNow = enrollment.progress >= 100 && !wasCourseCompleted;

    // 🎮 XP AWARDS
    const xpAwards = [];

    if (!alreadyCompleted) {
      // 1. XP Award logic (Jo pehle se hai)
      const xpRes = await awardXpOnce({ studentId: studentDoc._id, courseId, event: "LESSON_COMPLETE", refId: lessonId, xp: 10 });
      if (xpRes.awarded) xpAwards.push(xpRes);

      // Ye line aapke dashboard par "Completed" count ko 0 se 1 kar degi
      try {
        await AnalyticsEvent.create({
          event: "lesson_complete", // 🎯 Dashboard yahi dhoondh raha hai
          userId: userId,
          role: req.user?.role || "student",
          payload: { 
            courseId: courseId, 
            lessonId: lessonId 
          },
          ts: new Date()
        });
        console.log("🎯 AI Analytics: Lesson completion logged in database!");
      } catch (logErr) {
        console.error("❌ Analytics Logging Failed:", logErr);
      }
    }

    if (isCourseCompletedNow) {
      const xpRes = await awardXpOnce({ studentId: studentDoc._id, courseId, event: "COURSE_COMPLETE", refId: courseId, xp: 100 });
      if (xpRes.awarded) xpAwards.push(xpRes);

      enrollment.status = "completed";

      try {
        const course = await courseModel.findById(courseId); // Course ki details lao (Price chahiye)

        // Sirf tab paisa do jab:
        // 1. Course free nahi hai
        // 2. Baccha Subscription ya Corporate ke through aaya hai (isliye usne direct pay nahi kiya)
        // Note: Hum source ko "subscription" maan kar chal rahe hain (agar aapke enrollment model me source hai toh yahan check kar lena)

        if (course.price > 0 && enrollment.source !== "free") {
          const royaltyAmount = Math.round(course.price * 0.10); // 10% nikalo

          await Payment.create({
            student: userId,
            instructor: course.instructor,
            course: courseId,
            amount: royaltyAmount,
            platformCommission: 0,
            instructorEarning: royaltyAmount,
            status: "completed",
            payoutStatus: "pending",
            paymentMethod: "Subscription Bounty", // Ya 'Corporate Bounty'
            paymentDate: new Date()
          });
          console.log(`✅ Royalties sent! ₹${royaltyAmount} credited to Instructor.`);
        }
      } catch (err) {
        console.error("❌ Failed to process Royalty Payment:", err);
      }

      try {
        const course = await courseModel.findById(courseId).populate("instructor", "name");
        const certId = uuidv4();

        const certPath = await generateCertificate(
          req.user?.name || "Student",
          course.title,
          course.instructor?.name || "Instructor",
          certId,
          companyBranding // ✅ Sahi branding jayegi
        );

        enrollment.certificate = `/uploads/certificates/${certId}.pdf`;
        await sendCompletionEmail(req.user, course, certPath, companyBranding);
      } catch (e) {
        console.error("Certificate generation error in markLessonAsWatched:", e);
      }
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