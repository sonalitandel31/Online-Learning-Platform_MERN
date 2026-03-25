const { default: mongoose } = require("mongoose");

const studentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
    },
    education: String,
    interests: [String],
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
      },
    ],

    skillProficiency: [{
        skill: { type: String, required: true },
        level: { type: Number, default: 1, min: 1, max: 10 }, // 1=Beginner, 10=Expert
        lastUpdated: { type: Date, default: Date.now }
    }],
    targetGoals: {
        type: [String],
        default: [] // Ex: ["Fullstack Developer", "MERN Stack"]
    },

    xpTotal: { type: Number, default: 0, min: 0 },
    xpByCourse: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },
        xp: { type: Number, default: 0, min: 0 },
      },
    ],
    streakCount: { type: Number, default: 0, min: 0 },
    lastStreakDate: { type: Date, default: null },

    badges: [
      {
        key: { type: String, required: true },        
        title: { type: String, required: true },     
        icon: { type: String, default: "🏅" },        
        description: { type: String, default: "" },
        course: { type: mongoose.Schema.Types.ObjectId, ref: "course", default: null }, 
        earnedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

studentSchema.index({ "xpByCourse.course": 1 });
studentSchema.index({ user: 1, "badges.key": 1, "badges.course": 1 });

const studentModel = mongoose.model("student", studentSchema);
module.exports = studentModel;
