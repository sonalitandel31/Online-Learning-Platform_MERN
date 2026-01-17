const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { addLesson, getLessonsByCourse, updateLesson, deleteLesson, getCompletedLessons, markLessonAsWatched, saveLessonProgress } = require("../controller/lessonController");

router.post( "/courses/:courseId/lessons", upload.single("file"), addLesson);
router.get("/courses/:courseId/lessons", getLessonsByCourse);
router.put("/lessons/:lessonId", upload.single("file"), updateLesson);
router.delete("/lessons/:lessonId", deleteLesson);
router.post("/lessons/:lessonId/markWatched", markLessonAsWatched);
router.get("/:studentId/completedLessons", getCompletedLessons);
router.put("/:lessonId/progress", saveLessonProgress);

module.exports = router;


