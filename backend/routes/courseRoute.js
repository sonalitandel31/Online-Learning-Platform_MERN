const express = require("express");
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getCourseCategory, createCategory, getRecommendedCourses, getTrendingCourses, rateCourse, getCourseRatings, getMyCourseRating,} = require("../controller/courseController");
const attachUserIfExists = require("../middleware/attachUserIfExists");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/categories", getCourseCategory);
router.post("/addCategory", createCategory);
router.get("/recommended", authMiddleware, getRecommendedCourses);
router.get("/trending", getTrendingCourses);

// create/update rating (enrolled only)
router.post("/:id/rate", authMiddleware, rateCourse);
// fetch ratings list (public)
router.get("/:id/ratings", getCourseRatings);
// fetch my rating for this course (logged-in)
router.get("/:id/my-rating", authMiddleware, getMyCourseRating);

router.get("/", getCourses);
router.get("/:id", attachUserIfExists, getCourseById);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

module.exports = router;
