const mongoose = require("mongoose");
const UserSkill = require("../models/userSkillModel");
const UserBehavior = require("../models/userBehaviorModel");
const studentModel = require("../models/studentModel");
const courseModel = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel"); 
const categoryModel = require("../models/categoryModel");

// Dhyan dein: Apna wo model import karein jisme questions save hote hain (e.g., ExamModel ya QuestionModel)
const ExamModel = require("../models/examModel"); // Aapke model ka jo bhi naam ho

exports.getSkillAnalysis = async (req, res) => {
  try {
    const skills = await UserSkill.find({ userId: req.user._id }).lean();
    
    // 100% DYNAMIC: Har skill ke liye Exam DB se courseId dhundho
    for (let skill of skills) {
      // Aisa exam/question dhundo jisme ye specific skillTag use hua ho
      const relatedExam = await ExamModel.findOne({
        "questions.skillTag": skill.skillName // skillTag dhundh rahe hain
      }).select("course"); // Sirf course ki ID chahiye

      // Agar exam mil gaya, toh uske andar jo course ID hai wo assign kar do
      if (relatedExam && relatedExam.course) {
        skill.courseId = relatedExam.course;
      } else {
        skill.courseId = null;
      }
    }

    res.json({ success: true, skills });
  } catch (error) {
    console.error("Skill Analysis Error:", error);
    res.status(500).json({ success: false, message: "Error analyzing skills" });
  }
};

exports.getProRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const weakSkillsData = await UserSkill.find({ userId, level: { $lt: 50 } });
    const weakSkillNames = weakSkillsData.map(s => s.skillName);

    const recommendations = await courseModel.find({
      $or: [
        { skillsTaught: { $in: weakSkillNames } }
      ],
      status: "approved"
    }).limit(10);

    res.json({
      success: true,
      data: {
        weakSkills: weakSkillNames,
        recommendations,
        reason: weakSkillNames.length > 0 ? "Based on your weak areas" : "General recommendations"
      }
    });
  } catch (error) {
    console.error("Pro Rec Error:", error);
    res.status(500).json({ success: false, message: "AI Engine Error" });
  }
};

exports.getLearningPath = async (req, res) => {
  try {
    const userId = req.user._id;
    const student = await studentModel.findOne({ user: userId });

    if (!student) return res.status(200).json({ success: true, roadmap: [] });

    // 1. Raw search terms nikalna (Interests ya Goals se)
    let rawTerms = [];
    if (student.targetGoals && student.targetGoals.length > 0) {
      rawTerms = student.targetGoals;
    } else if (student.interests) {
      // Agar "ai,ml" string hai toh use comma se split karke array banao
      rawTerms = typeof student.interests === 'string' 
        ? student.interests.split(',').map(s => s.trim()) 
        : student.interests;
    }

    // 2. Alag-alag karein: Valid IDs aur Plain Text Names
    const validObjectIds = [];
    const textNames = [];

    rawTerms.forEach(term => {
      if (mongoose.Types.ObjectId.isValid(term)) {
        validObjectIds.push(new mongoose.Types.ObjectId(term));
      } else {
        textNames.push(term);
      }
    });

    // 3. Jo plain text names hain (jaise "ai"), unke actual Category IDs dhoondho
    if (textNames.length > 0) {
      const matchingCategories = await categoryModel.find({
        name: { $in: textNames.map(name => new RegExp(name, 'i')) } // Case-insensitive search
      }).select("_id");
      
      matchingCategories.forEach(cat => validObjectIds.push(cat._id));
    }

    // 4. Enrollments nikalna
    const enrollments = await Enrollment.find({ student: userId }).select("course status progress");
    const enrolledCourseIds = enrollments.map(e => e.course);

    // 5. Final Query: Ab sirf Valid ObjectIds hi pass honge
    const allPathCourses = await courseModel.find({
      $or: [
        { category: { $in: validObjectIds } },
        { _id: { $in: enrolledCourseIds } }
      ],
      status: "approved"
    }).populate("category", "name").lean();

    // 6. Sorting Logic (Beginner -> Advanced)
    const levelOrder = { "beginner": 1, "intermediate": 2, "advanced": 3, "Beginner": 1, "Intermediate": 2, "Advanced": 3 };
    const sortedPath = allPathCourses.sort((a, b) => (levelOrder[a.level] || 0) - (levelOrder[b.level] || 0));

    const roadmap = sortedPath.map(course => {
      const enrollment = enrollments.find(e => String(e.course) === String(course._id));
      let status = enrollment ? (enrollment.status === "completed" ? "completed" : "in-progress") : "available";

      return {
        _id: course._id,
        title: course.title,
        level: course.level,
        category: course.category?.name || "General",
        thumbnail: course.thumbnail,
        progress: enrollment?.progress || 0,
        status: status
      };
    });

    res.json({ success: true, roadmap });
  } catch (error) {
    console.error("Learning Path Logic Error:", error);
    res.status(500).json({ success: false, message: "Server error in roadmap generation" });
  }
};