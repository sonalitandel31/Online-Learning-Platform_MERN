const User = require("../models/userModel");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const Payment = require("../models/paymentModel");
const Result = require("../models/resultModel");
const mongoose = require("mongoose");
const Instructor = require("../models/instructorModel");
const Student = require("../models/studentModel");
const SystemSettings = require("../models/SystemSettings");
const courseRequestModel = require("../models/courseRequestModel");
const Payout = require("../models/payoutModel");
const AnalyticsEvent = require("../models/analyticsEventModel");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const sendEmail = require('../utils/sendEmail');

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

exports.toggleUserBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Toggle the isBlocked boolean
        user.isBlocked = !user.isBlocked;

        if (user.isBlocked) {
            // User is being blocked
            user.blockedAt = new Date();
            user.blockReason = req.body.reason || "Administrative action"; 
        } else {
            // User is being unblocked
            user.blockedAt = null;
            user.blockReason = "";
        }

        await user.save();
        res.status(200).json({ success: true, data: user });

    } catch (error) {
        console.error("Error toggling block status:", error);
        res.status(500).json({ success: false, message: "Server error" });
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
      .populate("category", "name")
      .populate("lessons", "title contentType")
      .populate("exams", "title duration");

    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCourseContentForReview = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate("instructor", "name email")
      .populate("category", "name")
      .populate({
        path: "lessons",
        // include everything needed to display actual content
        select: "title contentType fileUrl description isPreviewFree  duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        // include questions + correctAnswer for admin review
        select: "title duration settings proctoring questions createdAt",
        options: { sort: { createdAt: 1 } },
      });

    if (!course) return res.status(404).json({ message: "Course not found" });

    return res.json({ course });
  } catch (err) {
    console.error("getCourseContentForReview error:", err);
    return res.status(500).json({ message: "Failed to fetch course content", error: err.message });
  }
};

exports.getRejectedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: "rejected" })
      .populate("instructor", "name email")
      .populate("category", "name")
      .populate("lessons", "title contentType")
      .populate("exams", "title duration");

    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    course.status = "approved";
    course.review = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      rejectionReason: null,
      reviewNote: "",
    };

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, reviewNote } = req.body;

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const settings = await SystemSettings.findOne();
    const reasons = settings?.contentApproval?.rejectionReasons || [];

    if (!rejectionReason || !reasons.includes(rejectionReason)) {
      return res.status(400).json({ error: "Invalid rejectionReason" });
    }

    const noteRequired = settings?.contentApproval?.reviewNoteRequiredOnReject ?? true;
    if (noteRequired && !String(reviewNote || "").trim()) {
      return res.status(400).json({ error: "reviewNote is required" });
    }

    course.status = "rejected";
    course.review = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      rejectionReason,
      reviewNote: String(reviewNote || "").trim(),
    };

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRevenueSummary = async (req, res) => {
  try {
    // 1. Sort ascending (1) to ensure months are processed in chronological order
    const payments = await Payment.find({ status: "completed" }).sort({ paymentDate: 1 });

    const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalInstructorEarning = payments.reduce((s, p) => s + (p.instructorEarning || 0), 0);
    const platformCommission = totalRevenue - totalInstructorEarning;

    // 2. Map data chronologically
    const monthlyMap = new Map();
    payments.forEach(p => {
      if (!p.paymentDate) return;
      const dateStr = p.paymentDate.toLocaleString("default", { month: "short", year: "numeric" });
      monthlyMap.set(dateStr, (monthlyMap.get(dateStr) || 0) + (p.amount || 0));
    });

    const monthlyData = Object.fromEntries(monthlyMap);
    const monthsArray = Array.from(monthlyMap.keys());
    const revenueArray = Array.from(monthlyMap.values());

    // ==========================================
    // 🤖 AI PREDICTION LOGIC (Linear Regression)
    // ==========================================
    const recentRevenues = revenueArray.slice(-6); // Analyze up to last 6 months
    let forecastedRevenue = 0;
    let forecastedMonth = "N/A";

    if (recentRevenues.length >= 2) {
      const n = recentRevenues.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

      // Calculate slopes and trends
      for (let i = 0; i < n; i++) {
        const x = i + 1;
        const y = recentRevenues[i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Predict for the NEXT month (x = n + 1)
      forecastedRevenue = Math.max(0, slope * (n + 1) + intercept); // Avoid negative predictions
    } else if (recentRevenues.length === 1) {
      forecastedRevenue = recentRevenues[0]; // Not enough data, assume same as this month
    }

    // Determine the name of the next month (Always based on current real-world date)
    const currentDate = new Date(); // Aaj ki date (April) uthayega
    currentDate.setMonth(currentDate.getMonth() + 1); // Usme 1 mahina add karega
    forecastedMonth = currentDate.toLocaleString("default", { month: "short", year: "numeric" }); // May 2026 banayega

    res.json({
      totalRevenue,
      totalInstructorEarning,
      platformCommission,
      monthlyData,
      forecast: {
        expectedRevenue: forecastedRevenue,
        month: forecastedMonth
      }
    });
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

exports.getPayoutHistory = async (req, res) => {
  try {
    const history = await Payout.find({ status: "completed" })
      .populate("instructor", "name email")
      .sort({ createdAt: -1 }); 

    const formattedHistory = history.map(p => ({
      instructorId: p.instructor ? p.instructor._id : null,
      name: p.instructor ? p.instructor.name : "Unknown Instructor",
      email: p.instructor ? p.instructor.email : "N/A",
      amount: p.amount,
      transactionId: p.transactionId,
      date: p.createdAt || p.month + "/" + p.year,
      month: p.month // 👈 ADD THIS LINE: Pass the exact month number to React
    }));

    res.status(200).json({ success: true, history: formattedHistory });
  } catch (error) {
    console.error("Error fetching payout history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const txns = await Payment.find({
      $or: [
        // 1. Jo direct sale hain (Jisme student ne pay kiya) wo hamesha dikhao
        { paymentMethod: { $nin: ["Subscription Bounty", "Subscription Pool"] } },
        
        // 2. Jo completion rewards (Bounty) hain, unhe tabhi dikhao jab Admin 'Pay' kar de
        { 
          paymentMethod: { $in: ["Subscription Bounty", "Subscription Pool"] }, 
          payoutStatus: "processed" 
        }
      ]
    })
    .populate("student", "name email")
    .populate("instructor", "name email")
    .populate("course", "title")
    .sort({ paymentDate: -1 });

    res.json(txns);
  } catch (err) {
    console.error("Transaction Fetch Error:", err);
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

exports.getAllCourseRequests = async (req, res) => {
  try {
    const requests = await courseRequestModel.find()
      .populate('companyId', 'companyName domain')
      .populate('hrId', 'name email')
      .populate('assignedInstructor', 'name email') // ✅ Show who is working on it
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Fetch B2B Requests Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInstructorsList = async (req, res) => {
  try {
    // Hum sirf wo users nikal rahe hain jinka role 'instructor' hai
    const instructors = await User.find({ role: 'instructor' }, 'name email profilePic')
      .lean();

    res.status(200).json({ success: true, data: instructors });
  } catch (error) {
    console.error("Get Instructors Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch instructors" });
  }
};

exports.assignInstructorToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { instructorId, adminNotes } = req.body;

    if (!instructorId) {
      return res.status(400).json({ success: false, message: "Please select an instructor" });
    }

    // 1. Update the request in database
    const updatedRequest = await courseRequestModel.findByIdAndUpdate(
      requestId,
      {
        assignedInstructor: instructorId,
        status: 'in-development',
        adminNotes: adminNotes || "Assigned to instructor for development."
      },
      { new: true }
    )
      .populate('assignedInstructor', 'name email') // Instructor ki detail
      .populate('companyId', 'companyName');        // Company ki detail

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // 2. ✉️ NAYA CODE: Instructor ko Email Bhejna ✉️
    if (updatedRequest.assignedInstructor && updatedRequest.assignedInstructor.email) {
      const subject = `New Corporate Project Assigned: ${updatedRequest.topic}`;
      const message = `
                <h3>Hello ${updatedRequest.assignedInstructor.name},</h3>
                <p>You have been assigned a new <b>Corporate Training Project</b> by the Admin.</p>
                <hr/>
                <p><b>Company:</b> ${updatedRequest.companyId?.companyName || 'Corporate Client'}</p>
                <p><b>Topic:</b> ${updatedRequest.topic}</p>
                <p><b>Expected Trainees:</b> ${updatedRequest.expectedEmployees} Users</p>
                <p><b>Admin Notes:</b> ${updatedRequest.adminNotes}</p>
                <hr/>
                <p>Please log in to your Instructor Dashboard and go to the <b>"Corporate Projects"</b> tab to view full requirements and start creating the course content.</p>
                <br/>
                <p>Best Regards,<br/>LMS Admin Team</p>
            `;

      try {
        await sendEmail({
          email: updatedRequest.assignedInstructor.email,
          subject: subject,
          message: message
        });
        console.log("Assignment email sent to instructor:", updatedRequest.assignedInstructor.email);
      } catch (emailErr) {
        console.error("Email bhejte time error aayi, par assignment ho gaya:", emailErr);
      }
    }

    // 3. Send success response to frontend
    res.status(200).json({
      success: true,
      message: `Request assigned to ${updatedRequest.assignedInstructor.name} and email sent!`,
      data: updatedRequest
    });
  } catch (error) {
    console.error("Assign Instructor Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminNotes } = req.body;

    // ✅ Sudhaar 1: 'courseRequestModel' use karein jo upar import kiya hai
    const updated = await courseRequestModel.findByIdAndUpdate(
      requestId,
      { status, adminNotes },
      { new: true }
    )
      .populate('hrId', 'email name') // ✅ Sudhaar 2: 'hrId' populate karein
      .populate('companyId', 'companyName');

    if (updated) {
      const subject = `Update on your Course Request: ${updated.topic}`;
      // ✅ Sudhaar 3: 'updated.hrId.name' use karein
      const message = `
                <h3>Hello ${updated.hrId.name},</h3>
                <p>Your request for the course <b>"${updated.topic}"</b> has been updated to: <b>${status}</b>.</p>
                <p><b>Admin Notes:</b> ${adminNotes || 'No additional notes.'}</p>
                <br/>
                <p>Regards,<br/>LMS Team</p>
            `;

      try {
        await sendEmail({
          email: updated.hrId.email,
          subject: subject,
          message: message
        });
      } catch (err) {
        console.error("Email send nahi ho paya.");
      }
    }

    res.status(200).json({ success: true, message: "Status updated!", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportRequestsToCSV = async (req, res) => {
  try {
    // ✅ Sudhaar 4: 'hrId' aur correct model use karein
    const requests = await courseRequestModel.find()
      .populate('companyId', 'companyName')
      .populate('hrId', 'name');

    let csvContent = "Company,Topic,Category,Trainees,RequestedBy,Status,Date\n";

    requests.forEach(req => {
      const date = new Date(req.createdAt).toLocaleDateString();
      // ✅ Sudhaar 5: 'req.hrId?.name' use karein
      csvContent += `"${req.companyId?.companyName}","${req.topic}","${req.category}",${req.expectedEmployees},"${req.hrId?.name}","${req.status}",${date}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=course_requests.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: "Export failed" });
  }
};

exports.getPendingPayouts = async (req, res) => {
  try {
    const pendingPayments = await Payment.aggregate([
      // 🔥 UPDATE: Sirf wahi dikhao jo abhi tak pay (processed) nahi hue hain
      { $match: { status: "completed", payoutStatus: { $ne: "processed" } } },
      {
        $group: {
          _id: "$instructor",
          totalAmount: { $sum: { 
            $cond: [
              { $in: ["$paymentMethod", ["Subscription Bounty", "Subscription Pool"]] },
              "$amount",
              "$instructorEarning"
            ] 
          }},
          paymentIds: { $push: "$_id" },
          // Pata chal sake ki isme subscription ka paisa hai ya nahi
          hasBounty: { 
            $max: { 
              $cond: [{ $eq: ["$paymentMethod", "Subscription Bounty"] }, 1, 0] 
            } 
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructorDetails"
        }
      },
      { $unwind: "$instructorDetails" }
    ]);

    const formattedPayouts = pendingPayments.map(p => ({
      instructorId: p._id,
      name: p.instructorDetails.name,
      email: p.instructorDetails.email,
      amount: p.totalAmount,
      paymentIds: p.paymentIds,
      // Frontend ke liye flag
      paymentMethod: p.hasBounty ? "Subscription Bounty" : "Direct Sale"
    }));

    res.json({ success: true, payouts: formattedPayouts });
  } catch (error) {
    console.error("Error fetching pending payouts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.processPayout = async (req, res) => {
  try {
    const { instructorId, amount, transactionId, paymentIds } = req.body;

    // 1. Ek naya receipt record (Payout) create karo
    const newPayout = await Payout.create({
      instructor: instructorId,
      amount: amount,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      transactionId: transactionId,
      status: "completed"
    });

    // 2. Un saari Payments ka status "processed" kar do taaki dobara na dikhe
    await Payment.updateMany(
      { _id: { $in: paymentIds } },
      { $set: { payoutStatus: "processed" } }
    );

    res.json({ success: true, message: "Payout successful!", payout: newPayout });
  } catch (error) {
    console.error("Error processing payout:", error);
    res.status(500).json({ success: false, message: "Failed to process payout" });
  }
};
