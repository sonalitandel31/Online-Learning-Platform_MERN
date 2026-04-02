const LearningPath = require('../models/LearningPathModel');
const Enrollment = require('../models/enrollmentModel');

// 1. Create a new Learning Path
exports.createPath = async (req, res) => {
    try {
        const { title, description, courses } = req.body;
        const newPath = await LearningPath.create({
            companyId: req.companyId,
            title,
            description,
            courses,
            createdBy: req.user.id
        });
        res.status(201).json({ success: true, data: newPath });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get all paths for a company
exports.getCompanyPaths = async (req, res) => {
    try {
        const paths = await LearningPath.find({ companyId: req.companyId })
            .populate('courses', 'title thumbnail')
            .populate('assignedTo', 'name email');
        res.status(200).json({ success: true, data: paths });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Assign Path to Employees
exports.assignPath = async (req, res) => {
    try {
        const { pathId, employeeIds } = req.body;
        
        // 1. Verify the path belongs to the HR's company
        const path = await LearningPath.findOne({ _id: pathId, companyId: req.companyId });
        if (!path) {
            return res.status(404).json({ success: false, message: "Learning Path not found." });
        }

        // 2. We overwrite the array so HR can add or REMOVE employees easily
        path.assignedTo = employeeIds;
        await path.save();

        res.status(200).json({ success: true, message: "Path assigned successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get assigned paths for the logged-in student
exports.getStudentPaths = async (req, res) => {
    try {
        const paths = await LearningPath.find({ assignedTo: req.user.id })
            .populate('courses', 'title thumbnail category level')
            .lean(); // Lean for faster processing

        // Har course ke liye student ka actual progress calculate karein
        for (let path of paths) {
            for (let course of path.courses) {
                const enrollment = await Enrollment.findOne({ 
                    student: req.user.id, 
                    course: course._id 
                });
                
                // Agar enrollment hai toh progress dikhao, warna 0%
                course.progress = enrollment ? enrollment.progress : 0;
                course.status = course.progress === 100 ? 'completed' : 
                                course.progress > 0 ? 'in-progress' : 'locked';
            }
        }

        res.status(200).json({ success: true, data: paths });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error loading paths" });
    }
};