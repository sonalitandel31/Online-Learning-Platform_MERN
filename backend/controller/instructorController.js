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

const uploadLesson = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const fullUrl = `${req.protocol}://${req.get("host")}/uploads/lessons/${req.file.filename}`;
  res.json({ fileUrl: fullUrl });
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

const courses = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const filter = { instructor: instructorId };

    if (req.query.status) filter.status = req.query.status;

    const coursesData = await Course.find(filter)
      .populate("category", "name")                
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree createdAt",
        options: { sort: { createdAt: 1 } },      
      })
      .populate({
        path: "exams",
        select: "title duration questions",
      });

    res.json({ courses: coursesData });
  } catch (error) {
    console.error("Fetch courses failed:", error);
    res.status(500).json({ message: "Fetch courses failed", error });
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

const getCourseDetail = async (req, res) => {
  try {
    const { courseId } = req.params;

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in" });
    }

    const course = await Course.findById(courseId)
      .populate("category", "name")
      .populate("instructor", "name email profilePic")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        select: "title duration questions",
      });

    if (!course) return res.status(404).json({ message: "Course not found" });

    let isEnrolled = false;
    let completedLessons = [];
    try {
      const Student = require("../models/studentModel");
      const student = await Student.findOne({ user: userId });
      if (student) {
        const enrollment = await Enrollment.findOne({ course: courseId, student: student._id });
        isEnrolled = !!enrollment;
        completedLessons = enrollment?.completedLessons?.map(l => l.toString()) || [];
      }
    } catch (err) {
      console.warn("Student fetch warning:", err.message);
    }

    res.json({ course, isEnrolled, completedLessons });

  } catch (error) {
    console.error("Fetch course detail failed:", error);
    res.status(500).json({ message: "Failed to fetch course detail", error: error.message });
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

    const lessons = await Lesson.find({ course: courseId }).sort({ createdAt: 1 });
    res.json({ lessons });
  } catch (error) {
    console.error("Fetch course lessons failed:", error);
    res.status(500).json({ message: "Fetch course lessons failed", error });
  }
};

const addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, contentType, fileUrl, description, isPreviewFree } = req.body;

    if (!title || !contentType)
      return res.status(400).json({ message: "Title and contentType are required" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if ((contentType === "video" || contentType === "pdf") && !fileUrl)
      return res.status(400).json({ message: "fileUrl is required for video/pdf lessons" });

    const lesson = await Lesson.create({
      course: courseId,
      title,
      contentType,
      fileUrl: fileUrl || null,
      description,
      isPreviewFree: !!isPreviewFree,
    });

    course.lessons.push(lesson._id);
    await course.save();

    res.status(201).json({ message: "Lesson added", lesson });
  } catch (error) {
    console.error("Lesson creation failed:", error); 
    res.status(500).json({ message: "Lesson creation failed", error: error.message });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, contentType, fileUrl, description, isPreviewFree } = req.body;

    const lesson = await Lesson.findByIdAndUpdate(
      lessonId,
      { title, contentType, fileUrl: fileUrl || null, description, isPreviewFree: !!isPreviewFree },
      { new: true }
    );

    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.json({ message: "Lesson updated successfully", lesson });
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

const getExamResults = async (req, res) => {
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

const addExam = async (req, res) => {
  try {
    const { title, duration, questions } = req.body;
    const courseId = req.params.courseId;

    if (!title || !duration) return res.status(400).json({ message: "Title and duration are required" });
    if (!questions || !Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: "At least one question is required" });

    const errorMsg = validateQuestions(questions);
    if (errorMsg) return res.status(400).json({ message: errorMsg });

    const exam = await Exam.create({ course: courseId, title, duration, questions });
    await Course.findByIdAndUpdate(courseId, { $push: { exams: exam._id } });

    res.status(201).json({ message: "Exam created", exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Exam creation failed", error: error.message });
  }
};

const updateExam = async (req, res) => {
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

    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Exam deletion failed:", error);
    res.status(500).json({ message: "Exam deletion failed", error: error.message });
  }
};

const getCourseExams = async (req, res) => {
  try {
    const { courseId } = req.params;
    const exams = await Exam.find({ course: courseId });
    res.status(200).json({ exams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Fetch exams failed", error: error.message });
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
  getCourseExams,
  updateExam,
  deleteExam,
  uploadLesson,
  uploadLessonFile,
  uploadThumbnail,
  uploadThumbnailFile,
  getCourseAnalytics, 
  getInstructorEarnings,
  getPayoutHistory,
};
