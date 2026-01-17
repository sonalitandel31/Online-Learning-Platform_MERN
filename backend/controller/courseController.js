const mongoose = require("mongoose");
const courseModel = require("../models/courseModel");
const categoryModel = require("../models/categoryModel");
const studentModel = require("../models/studentModel");
const instructorProfileModel = require("../models/instructorModel"); 
const Enrollment = require("../models/enrollmentModel"); 

const getCourses = async (req, res) => {
  try {
    const { search, categories, limit, page } = req.query;
    let filter = {};

    if (search) filter.title = { $regex: search, $options: "i" };
    if (categories) {
      const categoryNames = categories.split(",");
      const categoryDocs = await categoryModel.find({ name: { $in: categoryNames } });
      const categoryIds = categoryDocs.map(c => c._id);
      filter.category = { $in: categoryIds };
    }

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;

    let courses = await courseModel
      .find(filter)
      .populate("instructor", "name email")
      .populate("category", "name")
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const totalEnrolled = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ["active", "completed"] },
        });
        return { ...course.toObject(), totalEnrolled };
      })
    );

    res.json(coursesWithEnrollment);
  } catch (err) {
    console.error("Get Courses Error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await courseModel
      .findById(id)
      .populate("instructor", "name email")
      .populate("category", "name")
      .populate("lessons")
      .populate("exams");

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    console.error("Get Course Error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

const getCourseCategory = async (req, res) => {
  try {
    const categories = await categoryModel
      .find({ status: "approved" })  
      .select("name _id status suggestedBy");

    res.json({ categories });
  } catch (err) {
    console.error("Get Categories Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const newCategory = new categoryModel(req.body);
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    console.error("Create Category Error:", err);
    res.status(400).json({ error: err.message });
  }
};

const createCourse = async (req, res) => {
  try {
    const { title, category, instructor, level } = req.body;

    if (!title || !category || !instructor || !level) {
      return res.status(400).json({
        error: "Title, category, instructor, and level are required",
      });
    }

    console.log("Creating Course For Instructor ID:", instructor);

    const newCourse = new courseModel(req.body);
    await newCourse.save();

    let instructorProfile = await instructorProfileModel.findOne({ user: instructor });
    console.log("Found Instructor Profile:", instructorProfile);

    if (!instructorProfile) {
      console.log("No profile found. Creating new instructor profile...");
      instructorProfile = new instructorProfileModel({
        user: instructor,
        coursesCreated: [newCourse._id],
      });
      await instructorProfile.save();
      console.log("New instructor profile created.");
    } else {
      console.log("Profile exists. Pushing new course...");
      instructorProfile.coursesCreated.push(newCourse._id);
      await instructorProfile.save();
      console.log("Course added to existing profile.");
    }

    res.status(201).json({
      message: "Course created and linked to instructor profile successfully",
      course: newCourse,
    });
  } catch (err) {
    console.error("Create Course Error:", err);
    res.status(400).json({ error: err.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const updated = await courseModel
      .findByIdAndUpdate(id, req.body, { new: true })
      .populate("instructor", "name email")
      .populate("category", "name")
      .populate("lessons");

    if (!updated) return res.status(404).json({ error: "Course not found" });

    res.json(updated);
  } catch (err) {
    console.error("Update Course Error:", err);
    res.status(400).json({ error: err.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const deleted = await courseModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Course not found" });

    //remove course from instructor profile
    await instructorProfileModel.findOneAndUpdate(
      { user: deleted.instructor },
      { $pull: { coursesCreated: deleted._id } }
    );

    res.json({ message: "Course deleted successfully and removed from instructor profile" });
  } catch (err) {
    console.error("Delete Course Error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseCategory,
  createCategory,
};
