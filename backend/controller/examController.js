const mongoose = require("mongoose");
const Exam = require("../models/examModel");
const Result = require("../models/resultModel");
const Enrollment = require("../models/enrollmentModel");
const courseModel = require("../models/courseModel");
const resultModel = require("../models/resultModel");
const lessonModel = require("../models/lessonModel");
const examModel = require("../models/examModel");

const path = require("path");
const fs = require("fs");
const { generateCertificate, sendCompletionEmail } = require("../utils/sendCompletionEmail");
const { v4: uuidv4 } = require("uuid");

const studentModel = require("../models/studentModel");
const { awardXpOnce } = require("../services/gamificationService");

const { checkSubscriptionForCourse } = require("../utils/subscriptionAccess");
const { getOrCreateEnrollmentForAccess } = require("../utils/getOrCreateEnrollment");

exports.getExamsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const exams = await Exam.find({ course: courseId })
      .select("title duration createdAt")
      .sort({ createdAt: -1 });

    if (!exams || exams.length === 0)
      return res.status(404).json({ message: "No exams found for this course" });

    res.json(exams);
  } catch (err) {
    console.error("Error fetching exams by course:", err);
    res.status(500).json({ message: "Server error fetching exams" });
  }
};

// helper: remove correct answers
const sanitizeExam = (examDoc) => {
  const obj = examDoc?.toObject ? examDoc.toObject() : examDoc;
  if (!obj) return obj;

  if (Array.isArray(obj.questions)) {
    obj.questions = obj.questions.map((q) => {
      const qq = { ...q };
      delete qq.correctAnswer;
      delete qq.correctOption;
      delete qq.answer;
      delete qq.solution; // if you store solution
      return qq;
    });
  }
  return obj;
};

exports.getExamById = async (req, res) => {
  try {
    const userId = req.user?._id;

    const exam = await Exam.findById(req.params.examId).populate("course", "title price status");
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const course = exam.course;
    if (!course || course.status !== "approved") {
      return res.status(404).json({ message: "Course not available" });
    }

    // ✅ Free course => allow
    if (!course.price || Number(course.price) === 0) {
      return res.json(sanitizeExam(exam));
    }

    // ✅ Enrollment check
    const now = new Date();
    const enrollment = await Enrollment.findOne({ student: userId, course: course._id }).lean();
    const enrollmentOk =
      enrollment &&
      enrollment.status !== "cancelled" &&
      (!enrollment.expiryDate || new Date(enrollment.expiryDate) >= now);

    if (enrollmentOk) return res.json(sanitizeExam(exam));

    // ✅ Subscription check
    const subCheck = await checkSubscriptionForCourse({ userId, courseId: course._id });
    if (subCheck.ok) return res.json(sanitizeExam(exam));

    return res.status(403).json({ message: "Access denied. Please enroll or subscribe." });
  } catch (err) {
    console.error("Error fetching exam:", err);
    return res.status(500).json({ message: "Server error fetching exam" });
  }
};

exports.getExamResult = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    // ✅ security: only self (or admin if you want)
    if (String(req.user?._id) !== String(studentId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const attempts = await resultModel.find({ exam: examId, student: studentId }).sort({ attemptNumber: -1 });

    if (attempts.length === 0) {
      return res.json({
        message: "No result yet",
        score: null,
        attemptNumber: 0,
        bestScore: 0,
        isCompleted: false,
      });
    }

    const latest = attempts[0];
    const bestScore = Math.max(...attempts.map((a) => a.score));
    const isCompleted = bestScore >= 60;

    return res.json({
      message: "Result fetched successfully",
      score: latest.score,
      attemptNumber: latest.attemptNumber,
      bestScore,
      isCompleted,
      remainingAttempts: Math.max(0, 3 - latest.attemptNumber),
    });
  } catch (err) {
    console.error("Error fetching result:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getExamProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // ✅ security: only self
    if (String(req.user?._id) !== String(studentId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const enrollment = await Enrollment.findOne({ student: studentId, course: courseId }).lean();
    if (!enrollment) return res.json([]);

    const progress = (enrollment.examProgress || []).map((p) => ({
      examId: String(p.examId),
      isCompleted: Boolean(p.isCompleted),
      bestScore: Number(p.bestScore || 0),
      attempts: Number(p.attempts || 0),
    }));

    return res.json(progress);
  } catch (err) {
    console.error("Error fetching exam progress:", err);
    return res.status(500).json({ message: "Error fetching exam progress" });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const userId = req.user?._id;
    const courseId = req.params.courseId || req.body.courseId;
    const examId = req.params.examId || req.body.examId;
    const { answers } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!courseId || !examId) return res.status(400).json({ message: "courseId and examId required" });
    if (!answers || typeof answers !== "object") return res.status(400).json({ message: "answers required" });

    // verify exam belongs to this course + get correct answers for scoring
    const exam = await examModel.findById(examId).select("course questions");
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (String(exam.course) !== String(courseId)) {
      return res.status(400).json({ message: "Exam does not belong to this course" });
    }

    // compute score on backend
    let correct = 0;
    for (const q of exam.questions || []) {
      const selected = answers[String(q._id)];
      if (selected && selected === q.correctAnswer) correct++;
    }
    const total = (exam.questions || []).length || 0;
    const score = total === 0 ? 0 : Math.round((correct / total) * 100);
    const isPassed = score >= 60;

    // access via enrollment or subscription
    let enrollment;
    try {
      const accessRes = await getOrCreateEnrollmentForAccess({ userId, courseId });
      enrollment = accessRes?.enrollment;
    } catch (e) {
      console.error("getOrCreateEnrollmentForAccess failed:", e);
      return res.status(500).json({ message: "Enrollment access check failed" });
    }

    if (!enrollment) return res.status(403).json({ message: "Access denied" });

    // Get student profile
    const studentDoc = await studentModel.findOne({ user: userId });
    if (!studentDoc) return res.status(404).json({ message: "Student profile not found" });

    // attempts/progress update
    let examProgress = (enrollment.examProgress || []).find((e) => String(e.examId) === String(examId));
    const wasPassedBefore = examProgress?.isCompleted || false;

    if (!examProgress) {
      examProgress = {
        examId,
        attempts: 1,
        bestScore: score,
        isCompleted: isPassed,
        lastAttemptAt: new Date(),
      };
      enrollment.examProgress = enrollment.examProgress || [];
      enrollment.examProgress.push(examProgress);
    } else {
      if (examProgress.attempts >= 3) return res.status(400).json({ message: "Max attempts reached" });
      examProgress.attempts += 1;
      examProgress.bestScore = Math.max(Number(examProgress.bestScore || 0), score);
      examProgress.isCompleted = examProgress.bestScore >= 60;
      examProgress.lastAttemptAt = new Date();
    }

    const becamePassedNow = !wasPassedBefore && examProgress.isCompleted;

    // store result
    await new Result({
      exam: examId,
      student: userId,
      score,
      answers,
      attemptNumber: examProgress.attempts,
    }).save();

    // overall progress (lessons + exams)
    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await examModel.countDocuments({ course: courseId });

    const completedLessons = (enrollment.completedLessons || []).length;
    const completedExams = (enrollment.examProgress || []).filter((e) => e.isCompleted).length;

    const totalItems = totalLessons + totalExams;
    const totalCompleted = completedLessons + completedExams;

    enrollment.progress = totalItems === 0 ? 0 : Math.min(100, Math.round((totalCompleted / totalItems) * 100));

    const wasCourseCompleted = enrollment.status === "completed";
    const isCourseCompletedNow = enrollment.progress >= 100 && !wasCourseCompleted;

    // XP
    const xpAwards = [];

    if (becamePassedNow) {
      const xpRes = await awardXpOnce({
        studentId: studentDoc._id,
        courseId,
        event: "EXAM_PASS",
        refId: examId,
        xp: 30,
      });
      if (xpRes?.awarded) xpAwards.push(xpRes);
    }

    if (isCourseCompletedNow) {
      const xpRes = await awardXpOnce({
        studentId: studentDoc._id,
        courseId,
        event: "COURSE_COMPLETE",
        refId: courseId,
        xp: 100,
      });
      if (xpRes?.awarded) xpAwards.push(xpRes);

      enrollment.status = "completed";

      // certificate/email should NOT crash submit
      try {
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
      } catch (e) {
        console.error("Certificate/email failed:", e);
      }
    }

    await enrollment.save();

    return res.json({
      message: examProgress.isCompleted ? "Exam passed" : "Exam submitted",
      score,
      correct,
      total,
      attemptNumber: examProgress.attempts,
      bestScore: examProgress.bestScore,
      isCompleted: examProgress.isCompleted,
      progress: enrollment.progress,
      xpAwards,
    });
  } catch (err) {
    console.error("submitExam error:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};
