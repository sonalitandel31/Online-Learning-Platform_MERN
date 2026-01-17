const User = require("../models/userModel");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const Payment = require("../models/paymentModel");
const Result = require("../models/resultModel");
const mongoose = require("mongoose");
const Instructor = require("../models/instructorModel");
const Student = require("../models/studentModel");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

exports.dashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInstructors = await User.countDocuments({ role: "instructor" });
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalCourses = await Course.countDocuments();
    const pendingApprovals = await Course.countDocuments({ status: "pendingApproval" });

    const revenueAgg = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const revenue = revenueAgg[0]?.totalRevenue || 0;

    const monthlyUsers = await User.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const monthlyEnrollments = await Enrollment.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const user = await User.findById(req.user._id).select("name email role profilePic");

    res.json({
      stats: {
        totalUsers,
        totalInstructors,
        totalStudents,
        totalCourses,
        pendingApprovals,
        revenue, 
      },
      chartData: { monthlyUsers, monthlyEnrollments },
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/profilePics";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

exports.addAdmin = [
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });

      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ error: "Email already registered" });

      const newAdmin = new User({
        name,
        email,
        password, 
        role: "admin",
        profilePic: req.file ? "/" + req.file.path : "/uploads/default.png",
      });

      await newAdmin.save();
      res.status(201).json({ message: "Admin added successfully", user: newAdmin });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
];

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(instructors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInstructorById = async (req, res) => {
  try {
    const instructor = await Instructor.findOne({ user: req.params.id })
      .populate("user", "name email role");
    if (!instructor) return res.status(404).json({ error: "Instructor not found" });
    res.json(instructor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.params.id })
      .populate("user", "name email role");
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "name email")       
      .populate("category", "name")              
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree",
      })
      .populate({
        path: "exams",
        select: "title duration questions attempts", 
      })
      .sort({ createdAt: -1 });

    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: "pendingApproval" })
      .populate("instructor", "name email")
      .populate("category", "name");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRejectedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: "rejected" })
      .populate("instructor", "name email")
      .populate("category", "name");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRevenueSummary = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "completed" }).sort({ paymentDate: -1 });

    const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalInstructorEarning = payments.reduce((s, p) => s + (p.instructorEarning || 0), 0);
    const platformCommission = totalRevenue - totalInstructorEarning;

    const monthlyData = {};
    payments.forEach(p => {
      const month = p.paymentDate ? p.paymentDate.toLocaleString("default", { month: "short", year: "numeric" }) : "Unknown";
      monthlyData[month] = (monthlyData[month] || 0) + (p.amount || 0);
    });

    res.json({ totalRevenue, totalInstructorEarning, platformCommission, monthlyData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPayouts = async (req, res) => {
  try {
    const payouts = await Payment.aggregate([
      { $match: { status: "completed" } },

      {
        $group: {
          _id: "$instructor",
          totalEarning: { $sum: "$instructorEarning" },
          coursesSold: { $sum: 1 },
          lastPayout: { $max: "$paymentDate" }
        }
      },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructorData"
        }
      },

      {
        $project: {
          instructorId: "$_id",
          instructor: { $arrayElemAt: ["$instructorData.name", 0] },
          email: { $arrayElemAt: ["$instructorData.email", 0] },
          totalEarning: 1,
          coursesSold: 1,
          lastPayout: 1
        }
      },

      { $sort: { totalEarning: -1 } }
    ]);

    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const txns = await Payment.find()
      .populate("student", "name email")
      .populate("instructor", "name email")
      .populate("course", "title")
      .sort({ paymentDate: -1 });

    res.json(txns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEnrollmentStats = async (req, res) => {
  try {
    const { start, end } = req.query;

    const matchQuery = {};
    if (start && end) {
      matchQuery.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const monthlyAgg = await Enrollment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const labels = monthlyAgg.map(m => m._id);
    const values = monthlyAgg.map(m => m.count);
    
    const totalEnrollments = await Enrollment.countDocuments(matchQuery);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = await Enrollment.countDocuments({ createdAt: { $gte: startOfMonth } });

    let growth = 0;
    if (values.length >= 2) {
      const lastMonth = values[values.length - 2];
      const thisMonth = values[values.length - 1];
      growth = lastMonth === 0 ? 100 : ((thisMonth - lastMonth) / lastMonth) * 100;
    } else if (values.length === 1) {
      growth = 100;
    }

    const topCoursesAgg = await Enrollment.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseData",
        },
      },
      { $unwind: "$courseData" },
      { $match: { "courseData.status": "approved" } },
      {
        $group: {
          _id: "$course",
          count: { $sum: 1 },
          title: { $first: "$courseData.title" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, course: "$title", count: 1 } },
    ]);

    res.json({ labels, values, totalEnrollments, newThisMonth, growth, topCourses: topCoursesAgg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCoursePerformance = async (req, res) => {
  try {
    const enrollAgg = await Enrollment.aggregate([
      { $group: { _id: "$course", enrollments: { $sum: 1 } } }
    ]);

    const enrollMap = {};
    enrollAgg.forEach(e => { enrollMap[String(e._id)] = e.enrollments; });

    const avgScoresAgg = await Result.aggregate([
      {
        $lookup: {
          from: "exams",
          localField: "exam",
          foreignField: "_id",
          as: "examData"
        }
      },
      { $unwind: "$examData" },
      { $group: { _id: "$examData.course", avgScore: { $avg: "$score" } } }
    ]);

    const avgMap = {};
    avgScoresAgg.forEach(a => { avgMap[String(a._id)] = a.avgScore; });

    const courses = await Course.find({ status: "approved" }).select("title status").lean();

    const performance = courses.map(c => ({
      _id: c._id,
      title: c.title,
      enrollments: enrollMap[String(c._id)] || 0,
      avgScore: avgMap[String(c._id)] || 0
    }));

    res.json(performance);
  } catch (err) {
    console.error("Course performance error:", err);
    res.status(500).json({ error: err.message });
  }
};
