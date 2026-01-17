const Exam = require("../models/examModel");
const Result = require("../models/resultModel");
const Enrollment = require("../models/enrollmentModel");
const mongoose = require("mongoose");
const courseModel = require("../models/courseModel");
const resultModel = require("../models/resultModel");

const { generateCertificate, sendCompletionEmail } = require("../utils/sendCompletionEmail");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const lessonModel = require("../models/lessonModel");
const examModel = require("../models/examModel");

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

exports.getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId).populate("course", "title");
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        res.json(exam);
    } catch (err) {
        console.error("Error fetching exam:", err);
        res.status(500).json({ message: "Server error fetching exam" });
    }
};

exports.getExamResult = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    const attempts = await Result.find({ exam: examId, student: studentId })
      .sort({ attemptNumber: -1 });

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
    const bestScore = Math.max(...attempts.map(a => a.score));
    const isCompleted = bestScore >= 60;

    return res.json({
      message: "Result fetched successfully",
      score: latest.score,
      attemptNumber: latest.attemptNumber,
      bestScore,
      isCompleted,          
    });

  } catch (err) {
    console.error("Error fetching result:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getExamProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (!enrollment) return res.json([]);

    const progress = enrollment.examProgress.map((p) => ({
      examId: p.examId.toString(),
      isCompleted: p.isCompleted,
      bestScore: p.bestScore || 0,
      attempts: p.attempts || 0,
    }));

    res.json(progress);
  } catch (err) {
    console.error("Error fetching exam progress:", err);
    res.status(500).json({ message: "Error fetching exam progress" });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const { studentId, courseId, examId, score, answers } = req.body;

    if (!studentId || !courseId || !examId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    })
      .populate("student")
      .populate("course");

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const isPassed = score >= 60;

    let examProgress = enrollment.examProgress.find(
      (p) => p.examId.toString() === examId
    );

    if (!examProgress) {
      examProgress = {
        examId,
        attempts: 1,
        bestScore: score,
        lastAttemptAt: new Date(),
        isCompleted: isPassed,
      };
      enrollment.examProgress.push(examProgress);
    } else {
      if (examProgress.attempts >= 3) {
        return res.status(400).json({ message: "Maximum exam attempts reached." });
      }
      examProgress.attempts += 1;
      examProgress.bestScore = Math.max(examProgress.bestScore || 0, score);
      examProgress.lastAttemptAt = new Date();
      examProgress.isCompleted = isPassed;
    }

    const newResult = new Result({
      exam: examId,
      student: studentId,
      answers: answers || [],
      score,
      attemptNumber: examProgress.attempts,
    });
    await newResult.save();

    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await Exam.countDocuments({ course: courseId });
    const totalItems = totalLessons + totalExams;

    const completedLessonsCount = enrollment.completedLessons.length;
    const completedExamsCount = (enrollment.examProgress || []).filter(
      (e) => e.isCompleted
    ).length;
    const totalCompleted = completedLessonsCount + completedExamsCount;

    if (totalItems === 0) {
      enrollment.progress = 0;
    } else {
      enrollment.progress = Math.min(
        100,
        Math.round((totalCompleted / totalItems) * 100)
      );
    }

    if (enrollment.progress >= 100 && enrollment.status !== "completed") {
      enrollment.status = "completed";

      const course = await courseModel.findById(courseId).populate("instructor");
      const certId = uuidv4();
      const instructorName = course?.instructor?.name || "Instructor";

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
      message: isPassed ? "Exam passed successfully!" : "Exam submitted, not passed yet.",
      score,
      progress: enrollment.progress,
      status: enrollment.status,
      certificate: enrollment.certificate || null,
      attemptNumber: examProgress.attempts,
    });
  } catch (error) {
    console.error("Submit Exam Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};