const mongoose = require("mongoose");

const userSkillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  skillName: { type: String, required: true }, // e.g., "React Hooks"
  level: { type: Number, default: 0, min: 0, max: 100 }, // 0 to 100%
  totalQuestionsAttempted: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

// Unique index taaki ek user ki ek skill ki ek hi entry ho
userSkillSchema.index({ userId: 1, skillName: 1 }, { unique: true });

module.exports = mongoose.model("userSkill", userSkillSchema);