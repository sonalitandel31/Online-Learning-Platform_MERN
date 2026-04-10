const mongoose = require('mongoose');
const CompanyModel = require("../models/CompanyModel");
const userModel = require("../models/userModel");
const CourseRequest = require('../models/courseRequestModel');
const Enrollment = require('../models/enrollmentModel');
const Category = require('../models/categoryModel');

const bcrypt = require('bcryptjs');

exports.getCompanyEmployees = async (req, res) => {
    try {
        // Sirf usi company ke users find karo jo middleware ne verify kiye hain
        const employees = await userModel.find({ companyId: req.companyId });

        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching employees." });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        // Ye ID tenantAuth middleware se aayi hai. No need to trust the frontend!
        const currentCompanyId = req.companyId;

        // A. Total Employees enrolled from this company
        const totalEmployees = await userModel.countDocuments({
            companyId: currentCompanyId,
            role: 'student'
        });

        // B. Active Learners (e.g., active in the last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeLearners = await userModel.countDocuments({
            companyId: currentCompanyId,
            role: 'student',
            lastActiveAt: { $gte: sevenDaysAgo }
        });

        // C. (Optional) You can add logic here to calculate total course completions 
        // by querying the Enrollment or ExamResult models using the same companyId.

        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                activeLearners,
                engagementRate: totalEmployees > 0 ? ((activeLearners / totalEmployees) * 100).toFixed(1) + '%' : '0%'
            }
        });

    } catch (error) {
        console.error("HR Dashboard Stats Error:", error);
        res.status(500).json({ success: false, message: "Failed to load dashboard statistics." });
    }
};

exports.getEmployeeList = async (req, res) => {
    try {
        const currentCompanyId = req.companyId;

        // Fetch all students belonging to this company
        // .select() ensures we don't send passwords or unnecessary data to the HR frontend
        const employees = await userModel.find({
            companyId: currentCompanyId,
            role: 'student'
        })
            .select('name email employeeId profilePic lastActiveAt isBlocked')
            .sort({ lastActiveAt: -1 }); // Sort by most recently active

        res.status(200).json({
            success: true,
            count: employees.length,
            data: employees
        });

    } catch (error) {
        console.error("HR Employee List Error:", error);
        res.status(500).json({ success: false, message: "Failed to load employee data." });
    }
};

exports.addSingleEmployee = async (req, res) => {
    try {
        // --- ADD THIS SECURITY CHECK ---
        if (req.user.role !== 'hr_manager') {
            return res.status(403).json({ success: false, message: "Access Denied: Only HR Managers can add employees." });
        }
        // -------------------------------

        const { name, email, employeeId, password } = req.body;
        const hrCompanyId = req.user.companyId;

        // Logic inside Controller
        const company = await CompanyModel.findById(hrCompanyId);
        const currentEmployeeCount = await userModel.countDocuments({ companyId: hrCompanyId, role: 'student' });

        if (currentEmployeeCount >= company.subscription.activeLicenses) {
            return res.status(400).json({
                success: false,
                message: "License limit reached! Please upgrade your plan to add more employees."
            });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new student linked to this company
        const newEmployee = await userModel.create({
            name,
            email,
            employeeId,
            password: hashedPassword,
            role: 'student',
            companyId: hrCompanyId
        });

        await CompanyModel.findByIdAndUpdate(
            hrCompanyId,
            { $inc: { 'subscription.usedLicenses': 1 } }
        );

        res.status(201).json({ success: true, message: "Employee added successfully!", data: newEmployee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        // SECURITY CHECK
        if (req.user.role !== 'hr_manager') {
            return res.status(403).json({ success: false, message: "Access Denied: Only HR Managers can delete employees." });
        }

        const employeeId = req.params.id; // URL se ID aayegi (e.g., /hr/employee/:id)
        const hrCompanyId = req.user.companyId;

        // Step 1: Employee ko delete karo (Make sure wo usi company ka student ho)
        const deletedUser = await userModel.findOneAndDelete({
            _id: employeeId,
            companyId: hrCompanyId,
            role: 'student'
        });

        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        // Step 2: Company table mein usedLicenses ko -1 kar do
        await CompanyModel.findByIdAndUpdate(
            hrCompanyId,
            { $inc: { 'subscription.usedLicenses': -1 } }
        );

        res.status(200).json({ success: true, message: "Employee removed successfully. 1 License restored." });
    } catch (error) {
        console.error("Delete Employee Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCourseRequest = async (req, res) => {
    try {
        const { topic, category, customCategory, targetAudience, expectedEmployees, requirements } = req.body;
        
        let finalCategoryId = category;

        // ✅ LOGIC: Agar HR ne "Other" select kiya hai
        if (category === 'other' && customCategory) {
            const cleanName = customCategory.trim();
            
            // Database mein check karo (Case-insensitive)
            let existingCat = await Category.findOne({ 
                name: { $regex: new RegExp(`^${cleanName}$`, 'i') } 
            });

            if (!existingCat) {
                // Agar nahi milti, toh Admin ke liye "pending" entry banao
                existingCat = await Category.create({
                    name: cleanName,
                    status: 'pending',
                    suggestedBy: req.user._id
                });
            }
            finalCategoryId = existingCat._id;
        }

        const newRequest = await CourseRequest.create({
            companyId: req.companyId,
            hrId: req.user._id, 
            topic,
            category: finalCategoryId, // Store the Object ID
            customCategory: category === 'other' ? customCategory : null,
            targetAudience,
            expectedEmployees,
            requirements,
            status: 'pending' 
        });

        res.status(201).json({ success: true, message: "Custom request sent!", data: newRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyCourseRequests = async (req, res) => {
    try {
        const requests = await CourseRequest.find({ companyId: req.companyId })
            .populate('category', 'name') 
            .sort({ createdAt: -1 })
            .lean();

        const formattedRequests = requests.map(reqObj => {
            let finalName = "General Training";

            // Case 1: Agar category successfully populate ho gayi (Object mila)
            if (reqObj.category && typeof reqObj.category === 'object' && reqObj.category.name) {
                finalName = reqObj.category.name;
            } 
            // Case 2: Agar category null hai ya "other" string hai, toh customCategory uthao
            else if (reqObj.customCategory) {
                finalName = reqObj.customCategory;
            }

            return {
                ...reqObj,
                categoryName: finalName
            };
        });

        res.status(200).json({ success: true, data: formattedRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: "History fetch fail ho gayi." });
    }
};

exports.getHRAnalytics = async (req, res) => {
  try {
    const companyId = req.user.companyId; // Auth middleware se milega
    if (!companyId) {
      return res.status(403).json({ success: false, message: "Company ID missing" });
    }

    const { range } = req.query; // '7d', '30d' etc.
    const daysToLookBack = range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);

    // 1. TOP STATS: Completion Rate, Active Learners, XP
    const stats = await Enrollment.aggregate([
      // Sirf is company ke students ke enrollment uthao
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      { $unwind: "$studentDetails" },
      { $match: { "studentDetails.companyId": new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          avgProgress: { $avg: "$progress" },
          activeNow: { 
            $sum: { 
              $cond: [
                { $gt: ["$studentDetails.lastActiveAt", new Date(Date.now() - 24 * 60 * 60 * 1000)] }, 
                1, 0
              ] 
            } 
          },
        },
      },
    ]);

    // 2. WEEKLY TREND: Lesson Completion Trend
    // Hum check karenge ki pichle 7 dino mein roz kitne lessons complete hue
    const trend = await Enrollment.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      { $unwind: "$studentDetails" },
      { 
        $match: { 
          "studentDetails.companyId": new mongoose.Types.ObjectId(companyId),
          updatedAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          lessonsDone: { $sum: { $size: "$completedLessons" } }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 3. LEADERBOARD: Top 5 Employees
    const leaderboard = await Enrollment.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "student",
            foreignField: "_id",
            as: "studentInfo",
          },
        },
        { $unwind: "$studentInfo" },
        { $match: { "studentInfo.companyId": new mongoose.Types.ObjectId(companyId) } },
        {
          $group: {
            _id: "$student",
            name: { $first: "$studentInfo.name" },
            email: { $first: "$studentInfo.email" },
            coursesDone: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            avgScore: { $avg: "$progress" }
          }
        },
        { $sort: { coursesDone: -1, avgScore: -1 } },
        { $limit: 5 }
    ]);

    // 4. AT RISK: Students who haven't logged in for 15 days OR have 0 progress
    const atRisk = await userModel.find({
        companyId: companyId,
        role: "student",
        $or: [
            { lastActiveAt: { $lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
            { lastActiveAt: null }
        ]
    }).select("name email lastActiveAt").limit(5);

    // Final Response mapping for your Frontend
    res.json({
      success: true,
      data: {
        summary: {
            completionRate: stats[0] ? Math.round((stats[0].completedCount / stats[0].totalEnrollments) * 100) : 0,
            activeLearners: stats[0]?.activeNow || 0,
            avgProgress: Math.round(stats[0]?.avgProgress || 0),
            totalAtRisk: atRisk.length
        },
        trend: trend, // Frontend will map this to the Line Chart
        leaderboard: leaderboard, // Frontend table
        atRisk: atRisk
      },
    });
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};