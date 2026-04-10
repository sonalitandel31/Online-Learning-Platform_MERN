const mongoose = require("mongoose");
const Exam = require("../models/examModel");
const Result = require("../models/resultModel");
const Enrollment = require("../models/enrollmentModel");
const courseModel = require("../models/courseModel");
const resultModel = require("../models/resultModel");
const lessonModel = require("../models/lessonModel");
const examModel = require("../models/examModel");
const studentModel = require("../models/studentModel");
const UserSkill = require("../models/userSkillModel");
const userModel = require("../models/userModel");
const Payment = require("../models/paymentModel");

const path = require("path");
const fs = require("fs");
const { generateCertificate, sendCompletionEmail } = require("../utils/sendCompletionEmail");
const { v4: uuidv4 } = require("uuid");

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
    /* 
        const now = new Date();
        const enrollment = await Enrollment.findOne({ student: userId, course: course._id }).lean();
        const enrollmentOk =
          enrollment &&
          enrollment.status !== "cancelled" &&
          (!enrollment.expiryDate || new Date(enrollment.expiryDate) >= now); */

    // apply randomization BEFORE sending response
    if (exam.settings?.shuffleQuestions) {
      exam.questions.sort(() => Math.random() - 0.5);
    }

    if (exam.settings?.shuffleOptions) {
      exam.questions = exam.questions.map(q => ({
        ...q.toObject(),
        options: q.options.sort(() => Math.random() - 0.5)
      }));
    }

    // then sanitize
    const safeExam = sanitizeExam(exam);

    // access checks
    if (!course.price || Number(course.price) === 0) {
      return res.json(safeExam);
    }

    const now = new Date();
    const enrollment = await Enrollment.findOne({ student: userId, course: course._id }).lean();

    const enrollmentOk =
      enrollment &&
      enrollment.status !== "cancelled" &&
      (!enrollment.expiryDate || new Date(enrollment.expiryDate) >= now);

    if (enrollmentOk) return res.json(safeExam);

    const subCheck = await checkSubscriptionForCourse({ userId, courseId: course._id });
    if (subCheck.ok) return res.json(safeExam);

    return res.status(403).json({ message: "Access denied. Please enroll or subscribe." });
    // shuffle questions
    if (exam.settings?.shuffleQuestions) {
      exam.questions.sort(() => Math.random() - 0.5);
    }

    // shuffle options
    if (exam.settings?.shuffleOptions) {
      exam.questions = exam.questions.map(q => ({
        ...q.toObject(),
        options: q.options.sort(() => Math.random() - 0.5)
      }));
    }

    return res.status(403).json({ message: "Access denied. Please enroll or subscribe." });
  } catch (err) {
    console.error("Error fetching exam:", err);
    return res.status(500).json({ message: "Server error fetching exam" });
  }
};

exports.getExamResult = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

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
        allAttempts: []
      });
    }

    const latest = attempts[0];
    const bestScore = Math.max(...attempts.map((a) => a.score));

    const exam = await Exam.findById(examId).select("settings");
    const isCompleted = bestScore >= Number(exam?.settings?.passingScore || 60);

    const allAttempts = attempts.map(a => ({
      attemptNumber: a.attemptNumber,
      score: a.score,
      isPassed: a.score >= Number(exam?.settings?.passingScore || 60),
      tabSwitches: a.cheat?.tabSwitches || 0,
      autoSubmitted: a.cheat?.autoSubmitted || false,
      date: a.createdAt
    }));

    return res.json({
      message: "Result fetched successfully",
      score: latest.score,
      totalQuestions: latest.totalQuestions || 0,
      correctCount: latest.correctCount || 0,
      wrongCount: latest.wrongCount || 0,
      skippedCount: latest.skippedCount || 0,
      positiveMarks: latest.positiveMarks || 0,
      negativeMarks: latest.negativeMarks || 0,
      finalMarks: latest.finalMarks || 0,
      isPassed: latest.isPassed || false,
      attemptNumber: latest.attemptNumber,
      bestScore,
      isCompleted,
      allAttempts,
      remainingAttempts: Math.max(
        0,
        Number(exam?.settings?.maxAttempts || 3) - latest.attemptNumber
      ),
      passPercentage: Number(exam?.settings?.passingScore || 60),
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
    const { answers, cheatCount = 0 } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!courseId || !examId) return res.status(400).json({ message: "courseId and examId required" });
    if (!answers || typeof answers !== "object") return res.status(400).json({ message: "answers required" });

    // 1. Verify exam and get questions
    const exam = await examModel.findById(examId).select("course questions settings proctoring");
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (String(exam.course) !== String(courseId)) {
      return res.status(400).json({ message: "Exam does not belong to this course" });
    }

    let correct = 0, wrong = 0, skipped = 0, positiveMarks = 0, negativeMarks = 0;
    let weakSkills = new Set(), strongSkills = new Set(), skillPerformance = {};

    for (const q of exam.questions || []) {
      const selected = answers[String(q._id)];
      const sTag = q.skillTag || "General";

      if (!skillPerformance[sTag]) skillPerformance[sTag] = { correct: 0, total: 0 };
      skillPerformance[sTag].total += 1;

      if (!selected) {
        skipped++;
        if (q.skillTag) weakSkills.add(q.skillTag);
        continue;
      }

      if (selected === q.correctAnswer) {
        correct++;
        positiveMarks += Number(q.marks || 1);
        if (q.skillTag) {
          strongSkills.add(q.skillTag);
          skillPerformance[sTag].correct += 1;
        }
      } else {
        wrong++;
        if (exam.settings?.negativeMarking > 0) negativeMarks += Number(exam.settings.negativeMarking);
        if (q.skillTag) weakSkills.add(q.skillTag);
      }
    }

    const totalQuestions = (exam.questions || []).length || 0;
    const totalPossibleMarks = (exam.questions || []).reduce((sum, q) => sum + Number(q.marks || 1), 0);
    const finalMarks = Math.max(0, positiveMarks - negativeMarks);
    const score = totalPossibleMarks === 0 ? 0 : Math.round((finalMarks / totalPossibleMarks) * 100);
    const passPercentage = Number(exam.settings?.passingScore || 60);
    const isPassed = score >= passPercentage;

    // 2. Access control (Enrollment check)
    let enrollment;
    try {
      const accessRes = await getOrCreateEnrollmentForAccess({ userId, courseId });
      enrollment = accessRes?.enrollment;
    } catch (e) {
      return res.status(500).json({ message: "Enrollment access check failed" });
    }
    if (!enrollment) return res.status(403).json({ message: "Access denied" });

    const studentDoc = await studentModel.findOne({ user: userId });
    if (!studentDoc) return res.status(404).json({ message: "Student profile not found" });

    // Branding User model se layenge
    const userDoc = await userModel.findById(userId).populate("companyId", "branding");
    const companyBranding = userDoc?.companyId?.branding || null;

    // 3. Update attempts and best score
    let examProgress = (enrollment.examProgress || []).find((e) => String(e.examId) === String(examId));
    const wasPassedBefore = examProgress?.isCompleted || false;

    if (!examProgress) {
      examProgress = { examId, attempts: 1, bestScore: score, isCompleted: isPassed, lastAttemptAt: new Date() };
      enrollment.examProgress = enrollment.examProgress || [];
      enrollment.examProgress.push(examProgress);
    } else {
      if (examProgress.attempts >= Number(exam.settings?.maxAttempts || 3)) {
        return res.status(400).json({ message: "Max attempts reached" });
      }
      examProgress.attempts += 1;
      examProgress.bestScore = Math.max(Number(examProgress.bestScore || 0), score);
      examProgress.isCompleted = examProgress.bestScore >= Number(exam.settings?.passingScore || 60);
      examProgress.lastAttemptAt = new Date();
    }

    const becamePassedNow = !wasPassedBefore && examProgress.isCompleted;

    // --- PRO AI LOGIC: Database me UserSkill Update karna (Radar Chart Data) ---
    for (const sName in skillPerformance) {
      const { correct: cCount, total: tCount } = skillPerformance[sName];

      const existingSkill = await UserSkill.findOne({ userId, skillName: sName });
      if (existingSkill) {
        existingSkill.totalQuestionsAttempted += tCount;
        existingSkill.correctAnswers += cCount;
        // Re-calculate level accuracy percentage
        existingSkill.level = Math.round((existingSkill.correctAnswers / existingSkill.totalQuestionsAttempted) * 100);
        existingSkill.lastUpdated = new Date();
        await existingSkill.save();
      } else {
        await UserSkill.create({
          userId,
          skillName: sName,
          totalQuestionsAttempted: tCount,
          correctAnswers: cCount,
          level: Math.round((cCount / tCount) * 100)
        });
      }
    }

    // 4. Save detailed result in Result Model
    const newResult = await new resultModel({
      exam: examId,
      student: userId,
      answers,
      totalQuestions,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      positiveMarks,
      negativeMarks,
      finalMarks,
      score,
      isPassed,
      attemptNumber: examProgress.attempts,
      weakSkillsIdentified: Array.from(weakSkills),
      cheat: {
        tabSwitches: cheatCount,
        autoSubmitted: cheatCount >= (exam.settings?.tabSwitchLimit || 3)
      },
    }).save();


    // 5. Calculate overall course progress
    const totalLessons = await lessonModel.countDocuments({ course: courseId });
    const totalExams = await examModel.countDocuments({ course: courseId });
    const completedLessons = (enrollment.completedLessons || []).length;
    const completedExams = (enrollment.examProgress || []).filter((e) => e.isCompleted).length;

    const totalItems = totalLessons + totalExams;
    const totalCompleted = completedLessons + completedExams;
    enrollment.progress = totalItems === 0 ? 0 : Math.min(100, Math.round((totalCompleted / totalItems) * 100));

    const wasCourseCompleted = enrollment.status === "completed";
    const isCourseCompletedNow = enrollment.progress >= 100 && !wasCourseCompleted;

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

      // Update Proficiency in Student Profile (Keep existing logic)
      let updatedProfileSkills = false;
      strongSkills.forEach(skill => {
        let existingSkill = studentDoc.skillProficiency.find(s => s.skill === skill);
        if (existingSkill) {
          if (existingSkill.level < 10) existingSkill.level += 1;
        } else {
          studentDoc.skillProficiency.push({ skill: skill, level: 1 });
        }
        updatedProfileSkills = true;
      });
      if (updatedProfileSkills) await studentDoc.save();
    }

    if (isCourseCompletedNow) {
      // Award XP
      const xpRes = await awardXpOnce({ studentId: studentDoc._id, courseId, event: "COURSE_COMPLETE", refId: courseId, xp: 100 });
      if (xpRes?.awarded) xpAwards.push(xpRes);
      enrollment.status = "completed";

      try {
        const course = await courseModel.findById(courseId);

        if (course.price > 0 && enrollment.source !== "free") {
          const royaltyAmount = Math.round(course.price * 0.10);

          await Payment.create({
            student: userId,
            instructor: course.instructor,
            course: courseId,
            amount: royaltyAmount,
            platformCommission: 0,
            instructorEarning: royaltyAmount,
            status: "completed",
            payoutStatus: "pending",
            paymentMethod: "Subscription Bounty",
            paymentDate: new Date()
          });
          console.log(`✅ Royalties sent! ₹${royaltyAmount} credited to Instructor.`);
        }
      } catch (err) {
        console.error("❌ Failed to process Royalty Payment:", err);
      }
      // 7. Generate Certificate and Send Email with Branding
      try {
        const courseDetails = await courseModel.findById(courseId).populate("instructor", "name");
        const certId = uuidv4();

        // ✅ NAYA UPDATE: Send branding parameter
        const certPath = await generateCertificate(
          req.user?.name || "Student",
          courseDetails.title,
          courseDetails.instructor?.name || "Instructor",
          certId,
          companyBranding
        );
        enrollment.certificate = `/uploads/certificates/${certId}.pdf`;

        // ✅ NAYA UPDATE: Send branding parameter
        await sendCompletionEmail(req.user, courseDetails, certPath, companyBranding);
      } catch (e) {
        console.error("Certificate/email process failed:", e);
      }
    }

    await enrollment.save();

    // 8. Send Final Response
    return res.json({
      message: examProgress.isCompleted ? "Exam passed" : "Exam submitted",
      score,
      totalQuestions,
      correct,
      wrong,
      skipped,
      positiveMarks,
      negativeMarks,
      finalMarks,
      passPercentage,
      attemptNumber: examProgress.attempts,
      bestScore: examProgress.bestScore,
      isCompleted: examProgress.isCompleted,
      progress: enrollment.progress,
      xpAwards,
      weakSkills: Array.from(weakSkills)
    });

  } catch (err) {
    console.error("submitExam full error:", err);
    return res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
};