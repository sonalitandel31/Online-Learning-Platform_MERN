const mongoose = require("mongoose");
const courseModel = require("../models/courseModel");
const categoryModel = require("../models/categoryModel");
const studentModel = require("../models/studentModel");
const instructorProfileModel = require("../models/instructorModel");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Rating = require("../models/ratingModel");

const { checkSubscriptionForCourse } = require("../utils/subscriptionAccess");

/* const getCourses = async (req, res) => {
  try {
    const {
      search,
      category,
      categories,
      limit = 10,
      page = 1,
      approved,
      sort = "newest",
    } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    const filter = {};

    if (approved === "true") filter.status = "approved";

    if (search) filter.title = { $regex: search, $options: "i" };

    // CATEGORY FILTER (supports multi)
    if (categories) {
      const ids = String(categories)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      filter.category = { $in: ids };
    } else if (category) {
      filter.category = category;
    }

    let sortOption = { createdAt: -1 };
    if (sort === "priceLow") sortOption = { price: 1 };
    if (sort === "priceHigh") sortOption = { price: -1 };
    if (sort === "newest") sortOption = { createdAt: -1 };

    const total = await courseModel.countDocuments(filter);

    const courses = await courseModel
      .find(filter)
      .populate("instructor", "name email")
      .populate("category", "name")
      .populate({
        path: "lessons",
        select: "duration",
      })
      .sort(sortOption)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const totalEnrolled = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ["active", "completed"] },
        });

        const lessonDurations = (course.lessons || []).map(l => Number(l.duration || 0));
        const totalDuration = lessonDurations.reduce((sum, d) => sum + d, 0); // in minutes

        return { ...course.toObject(), totalEnrolled };
      })
    );

    return res.json({
      success: true,
      courses: coursesWithEnrollment,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    console.error("Get Courses Error:", err);
    return res.status(500).json({ error: err.message });
  }
}; */

const getCourses = async (req, res) => {
  try {
    const {
      search,
      category,
      categories,
      limit = 10,
      page = 1,
      approved,
      level,
      minDuration,
      maxDuration,
      price,
      paidOnly,
      minRating,
      sortBy = "newest",
    } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    const filter = {};

    // Only approved courses by default
    if (approved === "true") filter.status = "approved";

    // Search
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    // Category filter
    if (categories) {
      const ids = String(categories)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      filter.category = { $in: ids };
    } else if (category) {
      filter.category = category;
    }

    // Level filter
    if (level) {
      filter.level = level;
    }

    // Price filter
    if (price === "0") {
      filter.price = 0;
    }

    if (paidOnly === "true") {
      filter.price = { $gt: 0 };
    }

    // Duration filter (totalDuration stored in seconds)
    if (minDuration || maxDuration) {
      filter.totalDuration = {};
      if (minDuration) filter.totalDuration.$gte = Number(minDuration);
      if (maxDuration) filter.totalDuration.$lte = Number(maxDuration);
    }

    // Rating filter
    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    // Sorting
    let sortOption = { createdAt: -1 };

    if (sortBy === "price_low") sortOption = { price: 1 };
    if (sortBy === "price_high") sortOption = { price: -1 };
    if (sortBy === "rating") sortOption = { averageRating: -1 };
    if (sortBy === "newest") sortOption = { createdAt: -1 };

    const total = await courseModel.countDocuments(filter);

    const courses = await courseModel
      .find(filter)
      .populate("instructor", "name email")
      .populate("category", "name")
      .sort(sortOption)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean();

    // Add enrollment count
    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const totalEnrolled = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ["active", "completed"] },
        });

        return {
          ...course,
          totalEnrolled,
          enrolledCount: totalEnrolled,
        };
      })
    );

    return res.json({
      success: true,
      courses: coursesWithEnrollment,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    console.error("Get Courses Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getTrendingCourses = async (req, res) => {
  try {
    // 1. Fetch all approved courses. 
    // .lean() use karne se performance fast ho jayegi kyunki hume sirf data chahiye, complex Mongoose methods nahi.
    const courses = await courseModel.find({ status: "approved" }).populate("category", "name").lean();

    // 2. Fetch enrollment counts
    const trending = await Promise.all(
      courses.map(async (course) => {
        const enrolledCount = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ["active", "completed"] },
        });
        return {
          ...course,
          enrolledCount,
          totalEnrolled: enrolledCount
        };
      })
    );

    // 3. Sort by enrollment count and SLICE TO 8 (instead of 4)
    const sortedTrending = trending
      .sort((a, b) => b.enrolledCount - a.enrolledCount)
      .slice(0, 8); // Ab 8 courses bhej raha hai frontend ko

    res.json({ success: true, courses: sortedTrending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRecommendedCourses = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { level } = req.query;

    let filter = { status: "approved" };

    if (level) {
      filter.level = { $regex: new RegExp(`^${level}$`, "i") };
    }

    const minD = Number(req.query.minDuration);
    const maxD = Number(req.query.maxDuration);

    if (!Number.isNaN(minD) && !Number.isNaN(maxD) && minD > maxD) {
      return res.status(400).json({ success: false, message: "Invalid duration range" });
    }

    if (!Number.isNaN(minD) || !Number.isNaN(maxD)) {
      filter.totalDuration = {};
      if (!Number.isNaN(minD)) filter.totalDuration.$gte = minD;
      if (!Number.isNaN(maxD)) filter.totalDuration.$lte = maxD;
    }

    let recommended = [];

    if (userId) {
      const student = await studentModel.findOne({ user: userId });
      if (student && student.interests?.length > 0) {
        const categories = await categoryModel.find({ name: { $in: student.interests } });
        const categoryIds = categories.map(cat => cat._id);

        recommended = await courseModel.find({
          ...filter,
          category: { $in: categoryIds },
          _id: { $nin: student.enrolledCourses || [] }
        })
          .populate("category", "name")
          .limit(8) // Increased to support the 'View More' row
          .lean();
      }
    }

    // Fallback if no interests or no courses found for interests
    if (recommended.length === 0) {
      recommended = await courseModel
        .find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .limit(8) // Increased to support the 'View More' row
        .lean();
    }

    const recommendedWithEnrollment = await Promise.all(
      recommended.map(async (course) => {
        const count = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ["active", "completed"] },
        });

        return {
          ...course, // No need for .toObject() if using .lean()
          totalEnrolled: count,
          enrolledCount: count,
        };
      })
    );

    return res.json({ success: true, courses: recommendedWithEnrollment });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// remove correct answers from exam payload
const sanitizeExam = (exam) => {
  const obj = exam?.toObject ? exam.toObject() : exam;
  if (!obj) return obj;

  if (Array.isArray(obj.questions)) {
    obj.questions = obj.questions.map((q) => {
      const qq = { ...q };
      delete qq.correctAnswer;
      delete qq.correctOption;
      delete qq.answer;
      delete qq.solution;
      return qq;
    });
  }
  return obj;
};

// hide fileUrl for locked lessons
const stripLessonUrl = (lesson) => {
  const obj = lesson?.toObject ? lesson.toObject() : lesson;
  if (!obj) return obj;
  obj.fileUrl = null;
  return obj;
};

const hasActiveEnrollment = async ({ userId, courseId }) => {
  const now = new Date();
  const enr = await Enrollment.findOne({ student: userId, course: courseId }).lean();
  return (
    !!enr &&
    enr.status !== "cancelled" &&
    (!enr.expiryDate || new Date(enr.expiryDate) >= now)
  );
};

const getCourseById = async (req, res) => {
  try {
    const { id: courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    // load course with lessons/exams
    const course = await courseModel
      .findById(courseId)
      .populate("instructor", "name email")
      .populate("category", "name")
      .populate({
        path: "lessons",
        select: "title contentType fileUrl description isPreviewFree duration createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .populate({
        path: "exams",
        // do not blindly send questions
        select: "title duration questions createdAt",
        options: { sort: { createdAt: 1 } },
      });

    if (!course) return res.status(404).json({ error: "Course not found" });

    const isPaid = Number(course.price || 0) > 0;

    // Free course: allow full access, but sanitize exams
    if (!isPaid) {
      const obj = course.toObject();
      obj.exams = (obj.exams || []).map(sanitizeExam);
      return res.json({ course: obj, access: { ok: true, type: "free" } });
    }

    // Paid course: if no login -> preview only
    const userId = req.user?._id;
    if (!userId) {
      const obj = course.toObject();

      obj.totalDuration = (obj.lessons || []).reduce((sum, l) => sum + Number(l.duration || 0), 0);

      obj.lessons = (obj.lessons || [])
        .filter((l) => l.isPreviewFree === true)
        .map(stripLessonUrl);

      obj.exams = (obj.exams || []).map((e) => {
        const ex = e?.toObject ? e.toObject() : e;
        delete ex.questions;
        return ex;
      });

      return res.json({
        course: obj,
        access: { ok: false, type: "none", reason: "login_required" },
      });
    }

    // Check purchase enrollment first
    const enrolled = await hasActiveEnrollment({ userId, courseId });
    if (enrolled) {
      const obj = course.toObject();
      obj.exams = (obj.exams || []).map(sanitizeExam);
      return res.json({ course: obj, access: { ok: true, type: "purchase" } });
    }

    // Check subscription
    const subCheck = await checkSubscriptionForCourse({ userId, courseId });
    if (subCheck.ok) {
      const obj = course.toObject();
      obj.exams = (obj.exams || []).map(sanitizeExam);
      return res.json({ course: obj, access: { ok: true, type: "subscription" } });
    }

    // No access => preview only
    const obj = course.toObject();

    obj.lessons = (obj.lessons || [])
      .filter((l) => l.isPreviewFree === true)
      .map(stripLessonUrl);

    obj.exams = (obj.exams || []).map((e) => {
      const ex = e?.toObject ? e.toObject() : e;
      delete ex.questions;
      return ex;
    });

    return res.json({
      course: obj,
      access: { ok: false, type: "none", reason: subCheck.reason || "no_access" },
    });
  } catch (err) {
    console.error("Get Course Error:", err);
    return res.status(500).json({ error: err.message });
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

const getCourseRatings = async (req, res) => {
  try {
    const courseId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Rating.find({ course: courseId })
        .populate("student", "name email") // change fields if you want
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Rating.countDocuments({ course: courseId }),
    ]);

    return res.json({
      success: true,
      ratings: items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getCourseRatings error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

const getMyCourseRating = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const doc = await Rating.findOne({ course: courseId, student: userId })
      .select("rating review createdAt updatedAt")
      .lean();

    return res.json({ success: true, rating: doc || null });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const rateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?._id;
    const rating = Number(req.body.rating);
    const review = String(req.body.review || "").trim();

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be 1 to 5" });
    }

    // Only enrolled users can rate (recommended rule)
    const ok = await hasActiveEnrollment({ userId, courseId });
    if (!ok) {
      return res.status(403).json({ success: false, message: "Enroll to rate this course" });
    }

    // upsert rating
    await Rating.findOneAndUpdate(
      { course: courseId, student: userId },
      { $set: { rating, review } },
      { upsert: true, new: true }
    );

    // recompute average from Rating collection
    const agg = await Rating.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: "$course",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const avg = agg?.[0]?.avg || 0;
    const count = agg?.[0]?.count || 0;

    await Course.findByIdAndUpdate(courseId, {
      averageRating: Number(avg.toFixed(2)),
      totalRatings: count,
    });

    return res.json({
      success: true,
      message: "Rating saved",
      averageRating: Number(avg.toFixed(2)),
      totalRatings: count,
    });
  } catch (e) {
    // duplicate key etc.
    return res.status(500).json({ success: false, message: e.message });
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
  getRecommendedCourses,
  getTrendingCourses,
  rateCourse,
  getCourseRatings,
  getMyCourseRating,
  getMyCourseRating,
  rateCourse,
};
