const userModel = require("../models/userModel");

/**
 * Match Zoom participant with LMS student
 * Returns user document or null
 */
async function matchStudentFromZoomParticipant(participant) {
  try {
    if (!participant) return null;

    const email = (participant.email || "").trim().toLowerCase();
    const name = (participant.user_name || "").trim();

    let student = null;

    // 1. Match using email (Most reliable, always prefer this)
    if (email) {
      student = await userModel.findOne({
        email: email,
        role: "student",
      });

      if (student) return student;
    }

    // 2. Match using Exact Name fallback
    // Only attempt this if the name is reasonably long to avoid false positives
    // We use a case-insensitive exact match regex
    if (name && name.length >= 3) {
      student = await userModel.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        role: "student",
      });

      if (student) return student;
    }

    // Note: Partial name matching has been intentionally removed. 
    // In an LMS, it is safer to return null and handle unmatched 
    // participants via your manual reconciliation script/dashboard 
    // than to accidentally grant attendance to the wrong student.

    return null;
  } catch (err) {
    console.error("Attendance Matcher Error:", err.message);
    return null;
  }
}

module.exports = {
  matchStudentFromZoomParticipant,
};