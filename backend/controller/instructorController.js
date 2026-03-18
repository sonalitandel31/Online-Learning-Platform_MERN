const mongoose = require("mongoose");

const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const Exam = require("../models/examModel");
const Enrollment = require("../models/enrollmentModel");
const User = require("../models/userModel");
const InstructorProfile = require("../models/instructorModel");
const ExamResult = require("../models/resultModel");
const Payment = require("../models/paymentModel");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const { checkSubscriptionForCourse } = require("../utils/subscriptionAccess");

const getMediaDurationSeconds = (filePath) =>
  new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return resolve(0);
      const sec = metadata?.format?.duration;
      resolve(Number.isFinite(sec) ? Math.round(sec) : 0);
    });
  });

const recalcCourseTotalDuration = async (courseId) => {
  // always convert to ObjectId
  const cid = mongoose.Types.ObjectId.isValid(courseId)
    ? new mongoose.Types.ObjectId(courseId)
    : courseId; // (fallback)

  // Sum lesson durations (seconds)
  const lessonAgg = await Lesson.aggregate([
    { $match: { course: cid } },
    { $group: { _id: "$course", total: { $sum: { $ifNull: ["$duration", 0] } } } },
  ]);

  // Sum exam durations (minutes -> seconds)
  const examAgg = await Exam.aggregate([
    { $match: { course: cid } },
    { $group: { _id: "$course", totalMins: { $sum: { $ifNull: ["$duration", 0] } } } },
  ]);

  const lessonSeconds = lessonAgg?.[0]?.total || 0;
  const examSeconds = (examAgg?.[0]?.totalMins || 0) * 60;

  const total = lessonSeconds + examSeconds;

  await Course.findByIdAndUpdate(cid, { totalDuration: total });
};

const getFixedLessonDurationSeconds = (contentType) => {
  if (contentType === "pdf") return 15 * 60;  // 15 min = 900 sec
  if (contentType === "text") return 10 * 60; // 10 min = 600 sec
  return 0;
};

const lessonStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/lessons/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-lesson" + ext);
  },
});
const uploadLessonFile = multer({ storage: lessonStorage });

const uploadLesson = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Full URL for client
    const fullUrl = `${req.protocol}://${req.get("host")}/uploads/lessons/${req.file.filename}`;

    // Absolute path for ffprobe
    const absPath = path.join(process.cwd(), "uploads", "lessons", req.file.filename);

    // Detect file type by extension
    const ext = path.extname(req.file.originalname).toLowerCase();

    let duration = 0;

    // If video => calculate real duration
    const videoExts = [".mp4", ".mkv", ".mov", ".avi", ".webm"];
    if (videoExts.includes(ext)) {
      duration = await getMediaDurationSeconds(absPath);
    }

    // If pdf => fixed 15 mins (optional, your rule)
    if (ext === ".pdf") {
      duration = 15 * 60;
    }

    // If text file uploaded (optional) => fixed 10 mins
    const textExts = [".txt", ".md", ".doc", ".docx"];
    if (textExts.includes(ext)) {
      duration = 10 * 60;
    }

    return res.json({
      fileUrl: fullUrl,
      duration, // seconds
    });
  } catch (error) {
    console.error("uploadLesson error:", error);
    return res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

const thumbnailStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/thumbnails/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-thumbnail" + ext);
  },
});

const uploadThumbnailFile = multer({ storage: thumbnailStorage });

const uploadThumbnail = (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filePath = `/uploads/thumbnails/${req.file.filename}`;

    console.log("Thumbnail uploaded:", filePath);
    res.json({ fileUrl: filePath });
  } catch (error) {
    console.error("Thumbnail upload failed:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const dashboard = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const activeCourses = await Course.find({ instructor: instructorId, status: "approved" });
    const pendingApprovals = await Course.find({ instructor: instructorId, status: "pendingApproval" });

    const myCoursesIds = activeCourses.map(c => c._id);
    const activeStudents = await Enrollment.find({ course: { $in: myCoursesIds }, status: "active" });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const enrollments = await Enrollment.aggregate([
      { $match: { course: { $in: myCoursesIds }, status: "active", createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { "_id": 1 } },
    ]);

    const months = [];
    const counts = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - 5 + i);
      months.push(date.toLocaleString("default", { month: "short" }));
      const monthData = enrollments.find(e => e._id === date.getMonth() + 1);
      counts.push(monthData ? monthData.count : 0);
    }

    const profile = await InstructorProfile.findOne({ user: instructorId }).populate("user", "name email profilePic");

    res.json({
      myCourses: activeCourses,
      pendingApprovals,
      newStudents: activeStudents.length,
      profile: {
        name: profile?.user?.name || "Instructor",
        email: profile?.user?.email || "",
        image: profile?.user?.profilePic || profile?.profilePic || null,
      },
      chartData: { labels: months, data: counts },
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    res.status(500).json({ message: "Dashboard fetch failed", error });
  }
};

/* const courses = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const filter = { instructor: instructorId };
    if (req.query.status) filter.status = req.query.status;

    const coursesData = await Course.find(filter)
      .populate("category", "name")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        select: "title duration questions",
      });

    const coursesWithCounts = coursesData.map((c) => ({
      ...c.toObject(),
      lessonsCount: c.lessons?.length || 0,
      examsCount: c.exams?.length || 0,
    }));

    return res.json({ courses: coursesWithCounts });
  } catch (error) {
    console.error("Fetch courses failed:", error);
    return res.status(500).json({ message: "Fetch courses failed", error });
  }
}; */

const courses = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const filter = { instructor: instructorId };
    if (req.query.status) filter.status = req.query.status;

    const coursesData = await Course.find(filter)
      .populate("category", "name")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        // Added settings and proctoring to the select string
        select: "title duration settings proctoring questions", 
      });

    const coursesWithCounts = coursesData.map((c) => ({
      ...c.toObject(),
      lessonsCount: c.lessons?.length || 0,
      examsCount: c.exams?.length || 0,
    }));

    return res.json({ courses: coursesWithCounts });
  } catch (error) {
    console.error("Fetch courses failed:", error);
    return res.status(500).json({ message: "Fetch courses failed", error });
  }
};

const createCourse = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { title, description, category, level, price, thumbnail, status } = req.body;

    const course = await Course.create({
      title,
      description,
      category,
      level,
      instructor: instructorId,
      price,
      thumbnail,
      status: status || "draft",
    });

    await InstructorProfile.findOneAndUpdate(
      { user: instructorId },
      { $push: { coursesCreated: course._id } },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: "Course created", course });
  } catch (error) {
    console.error("Course creation failed:", error);
    res.status(500).json({ message: "Course creation failed", error });
  }
};

const sanitizeExamQuestions = (exam) => {
  const obj = exam?.toObject ? exam.toObject() : exam;
  if (!obj) return obj;

  if (Array.isArray(obj.questions)) {
    obj.questions = obj.questions.map((q) => {
      const qq = { ...q };
      delete qq.correctAnswer;
      delete qq.correctOption;
      delete qq.answer;
      delete qq.solution;
      return qq;
    });
  }
  return obj;
};

const stripLessonFileUrl = (lesson) => {
  const obj = lesson?.toObject ? lesson.toObject() : lesson;
  if (!obj) return obj;
  // hide direct asset link for locked lessons
  obj.fileUrl = null;
  return obj;
};

const hasActiveEnrollment = async ({ userId, courseId }) => {
  const now = new Date();
  const enr = await Enrollment.findOne({ student: userId, course: courseId }).lean();
  return (
    enr &&
    enr.status !== "cancelled" &&
    (!enr.expiryDate || new Date(enr.expiryDate) >= now)
  );
};

/* const getCourseDetail = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const course = await Course.findById(courseId)
      .populate("category", "name")
      .populate("instructor", "name email profilePic")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        select: "title duration questions createdAt",
        options: { sort: { createdAt: 1 } },
      });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // free course: allow everything (but still sanitize exam answers)
    const isPaid = Number(course.price || 0) > 0;

    let access = { ok: true, type: "free" };

    if (isPaid) {
      const enrolled = await hasActiveEnrollment({ userId, courseId });
      if (enrolled) {
        access = { ok: true, type: "purchase" };
      } else {
        const subCheck = await checkSubscriptionForCourse({ userId, courseId });
        access = subCheck.ok
          ? { ok: true, type: "subscription" }
          : { ok: false, type: "none", reason: subCheck.reason };
      }
    }

    // ✅ build response safely
    let lessons = course.lessons || [];
    let exams = course.exams || [];

    if (!access.ok) {
      // Only preview lessons, and never expose fileUrl for locked course
      lessons = lessons
        .filter((l) => l.isPreviewFree === true)
        .map(stripLessonFileUrl);

      // For exams, show only meta (no questions)
      exams = exams.map((e) => {
        const ex = e?.toObject ? e.toObject() : e;
        delete ex.questions;
        return ex;
      });
    } else {
      // User has access → sanitize exam answers
      exams = exams.map(sanitizeExamQuestions);
    }

    // enrollment progress info (optional)
    let completedLessons = [];
    let isEnrolled = false;

    const enrollment = await Enrollment.findOne({ course: courseId, student: userId }).lean();
    if (enrollment) {
      isEnrolled = true;
      completedLessons = enrollment.completedLessons?.map((l) => String(l)) || [];
    }

    // Return "course" but replace lessons/exams with safe versions
    const courseObj = course.toObject();
    courseObj.lessons = lessons;
    courseObj.exams = exams;

    return res.json({
      course: courseObj,
      isEnrolled,
      completedLessons,
      access, // ✅ frontend can show "Subscribe to unlock"
    });
  } catch (error) {
    console.error("Fetch course detail failed:", error);
    return res.status(500).json({ message: "Failed to fetch course detail" });
  }
}; */

const getCourseDetail = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const course = await Course.findById(courseId)
      .populate("category", "name")
      .populate("instructor", "name email profilePic")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        // ✅ Added settings and proctoring
        select: "title duration settings proctoring questions createdAt", 
        options: { sort: { createdAt: 1 } },
      });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // free course: allow everything (but still sanitize exam answers)
    const isPaid = Number(course.price || 0) > 0;

    let access = { ok: true, type: "free" };

    if (isPaid) {
      const enrolled = await hasActiveEnrollment({ userId, courseId });
      if (enrolled) {
        access = { ok: true, type: "purchase" };
      } else {
        const subCheck = await checkSubscriptionForCourse({ userId, courseId });
        access = subCheck.ok
          ? { ok: true, type: "subscription" }
          : { ok: false, type: "none", reason: subCheck.reason };
      }
    }

    // ✅ build response safely
    let lessons = course.lessons || [];
    let exams = course.exams || [];

    if (!access.ok) {
      // Only preview lessons, and never expose fileUrl for locked course
      lessons = lessons
        .filter((l) => l.isPreviewFree === true)
        .map(stripLessonFileUrl);

      // For exams, show only meta (no questions)
      exams = exams.map((e) => {
        const ex = e?.toObject ? e.toObject() : e;
        delete ex.questions;
        return ex;
      });
    } else {
      // User has access → sanitize exam answers
      exams = exams.map(sanitizeExamQuestions);
    }

    // enrollment progress info (optional)
    let completedLessons = [];
    let isEnrolled = false;

    const enrollment = await Enrollment.findOne({ course: courseId, student: userId }).lean();
    if (enrollment) {
      isEnrolled = true;
      completedLessons = enrollment.completedLessons?.map((l) => String(l)) || [];
    }

    // Return "course" but replace lessons/exams with safe versions
    const courseObj = course.toObject();
    courseObj.lessons = lessons;
    courseObj.exams = exams;

    return res.json({
      course: courseObj,
      isEnrolled,
      completedLessons,
      access, // ✅ frontend can show "Subscribe to unlock"
    });
  } catch (error) {
    console.error("Fetch course detail failed:", error);
    return res.status(500).json({ message: "Failed to fetch course detail" });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;
    const { title, description, category, level, price, thumbnail, status } = req.body;

    const course = await Course.findOneAndUpdate(
      { _id: courseId, instructor: instructorId },
      { title, description, category, level, price, thumbnail, status },
      { new: true }
    ).populate("category", "name");

    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course updated", course });
  } catch (error) {
    console.error("Course update failed:", error);
    res.status(500).json({ message: "Course update failed", error });
  }
};

const updateCourseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status } = req.body;
    const instructorId = req.user._id;

    const course = await Course.findOneAndUpdate(
      { _id: courseId, instructor: instructorId },
      { status },
      { new: true }
    ).populate("category", "name");

    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course status updated", course });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update status", error });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    const course = await Course.findOneAndDelete({ _id: courseId, instructor: instructorId });
    if (!course) return res.status(404).json({ message: "Course not found" });

    await InstructorProfile.findOneAndUpdate(
      { user: instructorId },
      { $pull: { coursesCreated: course._id } }
    );

    await Lesson.deleteMany({ course: course._id });
    await Exam.deleteMany({ course: course._id });

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete course", error });
  }
};

const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructor: instructorId });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lessons = await Lesson.find({ course: courseId })
      .select("title contentType fileUrl description isPreviewFree duration createdAt")
      .sort({ createdAt: 1 });
      
    return res.json({
      lessons,
      lessonsCount: lessons.length,
    });
  } catch (error) {
    console.error("Fetch course lessons failed:", error);
    return res.status(500).json({ message: "Fetch course lessons failed", error });
  }
};

const addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, contentType, fileUrl, description, isPreviewFree, duration } = req.body;

    if (!title || !contentType)
      return res.status(400).json({ message: "Title and contentType are required" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if ((contentType === "video" || contentType === "pdf") && !fileUrl)
      return res.status(400).json({ message: "fileUrl is required for video/pdf lessons" });

    // duration in seconds
    let lessonDuration = 0;

    if (contentType === "video") {
      lessonDuration = Number(duration || 0); // from uploadLesson response
    } else {
      lessonDuration = getFixedLessonDurationSeconds(contentType); // pdf/text fixed
    }

    const lesson = await Lesson.create({
      course: courseId,
      title,
      contentType,
      fileUrl: contentType === "text" ? null : (fileUrl || null),
      description,
      isPreviewFree: !!isPreviewFree,
      duration: lessonDuration,
    });

    await Course.findByIdAndUpdate(courseId, { $push: { lessons: lesson._id } });

    // recalc course total duration (lessons + exams)
    await recalcCourseTotalDuration(courseId);

    res.status(201).json({ message: "Lesson added", lesson });
  } catch (error) {
    console.error("Lesson creation failed:", error);
    res.status(500).json({ message: "Lesson creation failed", error: error.message });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, contentType, fileUrl, description, isPreviewFree, duration } = req.body;

    const oldLesson = await Lesson.findById(lessonId);
    if (!oldLesson) return res.status(404).json({ message: "Lesson not found" });

    // duration in seconds
    let lessonDuration = 0;
    if (contentType === "video") lessonDuration = Number(duration || 0);
    else lessonDuration = getFixedLessonDurationSeconds(contentType);

    const updated = await Lesson.findByIdAndUpdate(
      lessonId,
      {
        title,
        contentType,
        fileUrl: contentType === "text" ? null : (fileUrl || null),
        description,
        isPreviewFree: !!isPreviewFree,
        duration: lessonDuration,
      },
      { new: true }
    );

    await recalcCourseTotalDuration(updated.course);

    res.json({ message: "Lesson updated successfully", lesson: updated });
  } catch (error) {
    console.error("Update lesson failed:", error);
    res.status(500).json({ message: "Lesson update failed", error });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findByIdAndDelete(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    await Course.findByIdAndUpdate(lesson.course, { $pull: { lessons: lesson._id } });

    await recalcCourseTotalDuration(lesson.course);

    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Delete lesson failed:", error);
    res.status(500).json({ message: "Lesson deletion failed", error });
  }
};

const reorderLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonOrder } = req.body;
    await Course.findByIdAndUpdate(courseId, { lessons: lessonOrder });
    res.json({ message: "Lessons reordered" });
  } catch (error) {
    res.status(500).json({ message: "Reorder failed", error });
  }
};

/* const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

    const enrollments = await Enrollment.find({ "examProgress.examId": examId })
      .populate("student", "name email")
      .lean();

    const results = enrollments.map(enroll => {
      const examData = enroll.examProgress.find(ep => ep.examId.toString() === examId);
      return {
        student: enroll.student,
        attempts: examData?.attempts || 0,
        score: examData?.bestScore || 0,
        isCompleted: examData?.isCompleted || false,
        lastAttemptAt: examData?.lastAttemptAt || null,
      };
    });

    results.sort((a, b) => b.score - a.score);

    res.json({ success: true, results });
  } catch (error) {
    console.error("Fetch exam results failed:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
}; */

const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

    // We fetch directly from the Result model to get the detailed cheat logs
    const results = await ExamResult.find({ exam: examId })
      .populate("student", "name email")
      .sort({ score: -1 }) // Sort by highest score first
      .lean();

    res.json({ success: true, results });
  } catch (error) {
    console.error("Fetch exam results failed:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const enrollments = await Enrollment.find({ course: courseId, status: "active" }).populate("student");
    res.json({ students: enrollments });
  } catch (error) {
    res.status(500).json({ message: "Fetch students failed", error });
  }
};

const getEnrolledStudents = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const myCourses = await Course.find({ instructor: instructorId }).select("_id");

    const enrollments = await Enrollment.find({
      course: { $in: myCourses.map(c => c._id) },
    })
      .populate("student", "name email phoneNo")
      .populate("course", "title category")
      .sort({ createdAt: -1 });

    res.json({ students: enrollments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch enrolled students", error: error.message });
  }
};

const getStudentProgress = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const myCourses = await Course.find({ instructor: instructorId }).select("_id title lessons exams");

    if (myCourses.length === 0) {
      return res.json({ progress: [] });
    }

    const enrollments = await Enrollment.find({
      course: { $in: myCourses.map((c) => c._id) },
      status: { $in: ["active", "completed"] },
    })
      .populate("student", "name email")
      .populate("course", "title lessons exams")
      .lean();

    const progressData = enrollments.map((enroll) => {
      const completedLessons = enroll.completedLessons?.length || 0;
      const totalLessons = enroll.course?.lessons?.length || 0;

      const examProgress = enroll.examProgress || [];
      const completedExams = examProgress.filter((e) => e.isCompleted === true).length;
      const totalExams = enroll.course?.exams?.length || 0; // ✅ fixed here

      return {
        _id: enroll._id,
        student: enroll.student,
        course: enroll.course,
        completedLessons,
        totalLessons,
        completedExams,
        totalExams,
        progress: enroll.progress || 0,
        status: enroll.status,
        certificate: enroll.certificate,
      };
    });

    res.json({ progress: progressData });
  } catch (error) {
    console.error("❌ Error fetching student progress:", error);
    res.status(500).json({
      message: "Failed to fetch student progress",
      error: error.message,
    });
  }
};

const validateQuestions = (questions) => {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.questionText || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
      return `Question ${i + 1} is invalid`;
    }
    if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
      return `Question ${i + 1}: Correct answer must be one of the options`;
    }
  }
  return null;
};

/* const addExam = async (req, res) => {
  try {
    const { title, duration, questions } = req.body;
    const courseId = req.params.courseId;

    if (!title || !duration) return res.status(400).json({ message: "Title and duration are required" });
    if (!questions || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: "At least one question is required" });

    const errorMsg = validateQuestions(questions);
    if (errorMsg) return res.status(400).json({ message: errorMsg });

    const exam = await Exam.create({ course: courseId, title, duration, questions });
    await Course.findByIdAndUpdate(courseId, { $push: { exams: exam._id } });

    await recalcCourseTotalDuration(courseId);

    res.status(201).json({ message: "Exam created", exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Exam creation failed", error: error.message });
  }
}; */

const addExam = async (req, res) => {
  try {
    // ✅ Extract settings and proctoring from req.body
    const { title, duration, settings, proctoring, questions } = req.body;
    const courseId = req.params.courseId;

    if (!title || !duration) return res.status(400).json({ message: "Title and duration are required" });
    if (!questions || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: "At least one question is required" });

    const errorMsg = validateQuestions(questions);
    if (errorMsg) return res.status(400).json({ message: errorMsg });

    // ✅ Pass settings and proctoring to the Exam document creation
    const exam = await Exam.create({ 
      course: courseId, 
      title, 
      duration, 
      settings, 
      proctoring, 
      questions 
    });
    
    await Course.findByIdAndUpdate(courseId, { $push: { exams: exam._id } });

    await recalcCourseTotalDuration(courseId);

    res.status(201).json({ message: "Exam created", exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Exam creation failed", error: error.message });
  }
};

/* const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { title, duration, questions } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const course = await Course.findById(exam.course);
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (questions && Array.isArray(questions)) {
      const errorMsg = validateQuestions(questions);
      if (errorMsg) return res.status(400).json({ message: errorMsg });
      exam.questions = questions;
    }

    exam.title = title || exam.title;
    exam.duration = duration || exam.duration;

    await exam.save();

    await recalcCourseTotalDuration(exam.course);

    res.status(200).json({ message: "Exam updated", exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Exam update failed", error: error.message });
  }
}; */

const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    // ✅ Extract settings and proctoring from req.body
    const { title, duration, settings, proctoring, questions } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const course = await Course.findById(exam.course);
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (questions && Array.isArray(questions)) {
      const errorMsg = validateQuestions(questions);
      if (errorMsg) return res.status(400).json({ message: errorMsg });
      exam.questions = questions;
    }

    exam.title = title || exam.title;
    exam.duration = duration || exam.duration;
    
    // ✅ Update settings and proctoring objects
    if (settings) exam.settings = settings;
    if (proctoring) exam.proctoring = proctoring;

    await exam.save();

    await recalcCourseTotalDuration(exam.course);

    res.status(200).json({ message: "Exam updated", exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Exam update failed", error: error.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const course = await Course.findById(exam.course);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this exam" });
    }

    await Course.findByIdAndUpdate(course._id, {
      $pull: { exams: exam._id },
    });

    //remove exam from enrollment examProgress
    await Enrollment.updateMany(
      { "examProgress.examId": exam._id },
      { $pull: { examProgress: { examId: exam._id } } }
    );

    await Exam.findByIdAndDelete(exam._id);

    await recalcCourseTotalDuration(course._id);

    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Exam deletion failed:", error);
    res.status(500).json({ message: "Exam deletion failed", error: error.message });
  }
};

/* const getInstructorCourseExams = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    // Instructor ownership check
    const course = await Course.findOne({ _id: courseId, instructor: instructorId })
      .select("_id")
      .lean();

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Fetch all exams for this course
    const exams = await Exam.find({ course: courseId })
      .select("title duration questions createdAt")
      .sort({ createdAt: 1 })
      .lean();

    // optional: add questionsCount for UI
    const formatted = exams.map((e) => ({
      ...e,
      questionsCount: Array.isArray(e.questions) ? e.questions.length : 0,
    }));

    return res.json({ exams: formatted, examsCount: formatted.length });
  } catch (err) {
    console.error("getInstructorCourseExams error:", err);
    return res.status(500).json({ message: "Failed to fetch exams" });
  }
}; */

const getInstructorCourseExams = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    // Instructor ownership check
    const course = await Course.findOne({ _id: courseId, instructor: instructorId })
      .select("_id")
      .lean();

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Fetch all exams for this course
    const exams = await Exam.find({ course: courseId })
      // ✅ Added settings and proctoring
      .select("title duration settings proctoring questions createdAt") 
      .sort({ createdAt: 1 })
      .lean();

    // optional: add questionsCount for UI
    const formatted = exams.map((e) => ({
      ...e,
      questionsCount: Array.isArray(e.questions) ? e.questions.length : 0,
    }));

    return res.json({ exams: formatted, examsCount: formatted.length });
  } catch (err) {
    console.error("getInstructorCourseExams error:", err);
    return res.status(500).json({ message: "Failed to fetch exams" });
  }
};

/* const getCourseDetailForInstructor = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructor: instructorId })
      .populate("category", "name")
      .populate("instructor", "name email profilePic")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        select: "title duration questions createdAt",
        options: { sort: { createdAt: 1 } },
      });

    if (!course) return res.status(404).json({ message: "Course not found" });

    return res.json({ course: course.toObject() });
  } catch (err) {
    console.error("getCourseDetailForInstructor error:", err);
    return res.status(500).json({ message: "Failed to fetch course detail" });
  }
}; */

const getCourseDetailForInstructor = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructor: instructorId })
      .populate("category", "name")
      .populate("instructor", "name email profilePic")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        // ✅ Added settings and proctoring
        select: "title duration settings proctoring questions createdAt", 
        options: { sort: { createdAt: 1 } },
      });

    if (!course) return res.status(404).json({ message: "Course not found" });

    return res.json({ course: course.toObject() });
  } catch (err) {
    console.error("getCourseDetailForInstructor error:", err);
    return res.status(500).json({ message: "Failed to fetch course detail" });
  }
};

const getCourseAnalytics = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const courses = await Course.find({ instructor: instructorId });

    const analytics = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await Enrollment.find({ course: course._id });

        const totalStudents = enrollments.length;
        const completedStudents = enrollments.filter(e => e.status === "completed").length;
        const revenue = enrollments.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          courseTitle: course.title,
          totalStudents,
          completedStudents,
          revenue,
          completionRate: totalStudents > 0 ? ((completedStudents / totalStudents) * 100).toFixed(1) : 0,
        };
      })
    );

    res.json({ success: true, analytics });
  } catch (error) {
    console.error("Course Analytics Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getInstructorEarnings = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const payments = await Payment.find({
      instructor: instructorId,
      status: "completed",
      paymentDate: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });

    const totalEarning = payments.reduce((sum, p) => sum + (p.instructorEarning || 0), 0);

    const monthly = {};
    payments.forEach((p) => {
      const date = new Date(p.paymentDate);
      const month = date.getMonth() + 1;
      monthly[month] = (monthly[month] || 0) + (p.instructorEarning || 0);
    });

    const lastPayout = payments.length
      ? payments[payments.length - 1].instructorEarning
      : 0;

    res.json({ totalEarning, monthly, lastPayout });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    res.status(500).json({ message: "Error fetching earnings", error });
  }
};

const getPayoutHistory = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const payouts = await Payment.find({ instructor: instructorId, status: "completed" })
      .sort({ paymentDate: -1 }) //latest first
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalPayouts = await Payment.countDocuments({ instructor: instructorId, status: "completed" });

    res.json({
      payouts,
      totalPayouts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalPayouts / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching payout history", error: err });
  }
};

module.exports = {
  dashboard,
  createCourse,
  updateCourse,
  getCourseDetail,
  courses,
  updateCourseStatus,
  deleteCourse,
  getLessonsByCourse,
  addLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getExamResults,
  getStudents,
  getEnrolledStudents,
  getStudentProgress,
  validateQuestions,
  addExam,
  updateExam,
  deleteExam,
  getInstructorCourseExams,
  getCourseDetailForInstructor,
  uploadLesson,
  uploadThumbnail,
  getCourseAnalytics,
  getInstructorEarnings,
  getPayoutHistory,
  uploadLessonFile,
  uploadThumbnailFile,
};
