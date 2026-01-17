const express = require("express");
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getCourseCategory, createCategory,} = require("../controller/courseController");
const router = express.Router();

router.get("/categories", getCourseCategory);
router.post("/addCategory", createCategory);

router.get("/", getCourses);
router.get("/:id", getCourseById);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

module.exports = router;
