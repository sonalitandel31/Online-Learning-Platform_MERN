const express = require("express");
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getCourseCategory, createCategory, getRecommendedCourses, getTrendingCourses,} = require("../controller/courseController");
const attachUserIfExists = require("../middleware/attachUserIfExists");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/categories", getCourseCategory);
router.post("/addCategory", createCategory);
router.get("/recommended", authMiddleware, getRecommendedCourses);
router.get("/trending", getTrendingCourses);

router.get("/", getCourses);
router.get("/:id", attachUserIfExists, getCourseById);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

module.exports = router;
