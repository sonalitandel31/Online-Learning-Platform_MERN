const liveClassModel = require("../models/liveClassModel");
const liveChatMessageModel = require("../models/liveChatMessageModel");
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

exports.getChatMessages = async (req, res) => {
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

    const messages = await liveChatMessageModel
      .find({ liveClass: liveClassId, isDeleted: false })
      .populate("sender", "name email role")
      .sort({ createdAt: 1 });

    return res.json({ success: true, data: messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const liveClass = await liveClassModel.findById(liveClassId).select("course instructor status");
    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    const allowed = await canAccessLiveClass(req.user, liveClass);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const row = await liveChatMessageModel.create({
      liveClass: liveClassId,
      sender: req.user._id,
      senderRole: normalizeRole(req.user.role),
      message: String(message).trim(),
    });

    const fullRow = await liveChatMessageModel
      .findById(row._id)
      .populate("sender", "name email role");

    // CRITICAL FIX: Aligned event name with the React frontend
    emitToLiveClass(liveClassId, "liveClass:newMessage", fullRow);

    return res.status(201).json({ success: true, data: fullRow });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};