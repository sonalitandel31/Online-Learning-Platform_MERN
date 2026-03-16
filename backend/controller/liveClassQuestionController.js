const liveClassModel = require("../models/liveClassModel");
const liveQuestionModel = require("../models/liveQuestionModel");
const enrollmentModel = require("../models/enrollmentModel");
const { emitToLiveClass } = require("../socket/liveClassSocket");

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const activeEnrollmentQuery = (userId, courseId, now = new Date()) => ({
  student: userId,
  course: courseId,
  status: { $in: ["active", "completed"] },
  $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
});

const canAccessLiveClass = async (user, liveClass) => {
  const role = normalizeRole(user.role);

  if (role === "admin") return true;
  if (String(liveClass.instructor) === String(user._id)) return true;

  const enrolled = await enrollmentModel.exists(
    activeEnrollmentQuery(user._id, liveClass.course)
  );

  return !!enrolled;
};

const canModerateLiveClass = (user, liveClass) => {
  const role = normalizeRole(user.role);
  return role === "admin" || String(liveClass.instructor) === String(user._id);
};

exports.getQuestions = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel.findById(liveClassId).select("course instructor");
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    const allowed = await canAccessLiveClass(req.user, liveClass);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const questions = await liveQuestionModel
      .find({ liveClass: liveClassId })
      .populate("askedBy", "name email role")
      .populate("answeredBy", "name email role")
      .sort({ isPinned: -1, createdAt: -1 });

    return res.json({ success: true, data: questions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const { question } = req.body;

    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, message: "Question is required" });
    }

    const liveClass = await liveClassModel.findById(liveClassId).select("course instructor");
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    const allowed = await canAccessLiveClass(req.user, liveClass);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const row = await liveQuestionModel.create({
      liveClass: liveClassId,
      askedBy: req.user._id,
      question: String(question).trim(),
    });

    const fullRow = await liveQuestionModel
      .findById(row._id)
      .populate("askedBy", "name email role")
      .populate("answeredBy", "name email role");

    // CRITICAL FIX: Aligned event name with the React frontend
    emitToLiveClass(liveClassId, "liveClass:newQuestion", fullRow);

    return res.status(201).json({ success: true, data: fullRow });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;

    if (!answer || !String(answer).trim()) {
      return res.status(400).json({ success: false, message: "Answer is required" });
    }

    const row = await liveQuestionModel.findById(questionId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const liveClass = await liveClassModel.findById(row.liveClass).select("instructor");
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    if (!canModerateLiveClass(req.user, liveClass)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    row.answer = String(answer).trim();
    row.status = "answered";
    row.answeredBy = req.user._id;
    row.answeredAt = new Date();
    await row.save();

    const fullRow = await liveQuestionModel
      .findById(row._id)
      .populate("askedBy", "name email role")
      .populate("answeredBy", "name email role");

    // This matches the frontend correctly
    emitToLiveClass(row.liveClass, "question:updated", fullRow);

    return res.json({ success: true, data: fullRow });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.togglePinQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const row = await liveQuestionModel.findById(questionId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const liveClass = await liveClassModel.findById(row.liveClass).select("instructor");
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    if (!canModerateLiveClass(req.user, liveClass)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    row.isPinned = !row.isPinned;
    await row.save();

    const fullRow = await liveQuestionModel
      .findById(row._id)
      .populate("askedBy", "name email role")
      .populate("answeredBy", "name email role");

    // This matches the frontend correctly
    emitToLiveClass(row.liveClass, "question:updated", fullRow);

    return res.json({ success: true, data: fullRow });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};