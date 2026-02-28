const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const courseAccessMiddleware = require("../middleware/courseAccessMiddleware");

const {
  addLesson,
  getLessonsByCourse,
  updateLesson,
  deleteLesson,
  getCompletedLessons,
  markLessonAsWatched,
  saveLessonProgress
} = require("../controller/lessonController");

/* ======================================================
   Instructor / Admin Routes
   ====================================================== */

// Add lesson (should later add roleMiddleware)
router.post(
  "/courses/:courseId/lessons",
  authMiddleware,
  upload.single("file"),
  addLesson
);

router.put(
  "/lessons/:lessonId",
  authMiddleware,
  upload.single("file"),
  updateLesson
);

router.delete(
  "/lessons/:lessonId",
  authMiddleware,
  deleteLesson
);


/* ======================================================
   Student Routes (Hybrid Protected)
   ====================================================== */

// Student
router.get(
  "/courses/:courseId/lessons",
  authMiddleware,
  courseAccessMiddleware,
  getLessonsByCourse
);

router.post(
  "/courses/:courseId/lessons/:lessonId/markWatched",
  authMiddleware,
  courseAccessMiddleware,
  markLessonAsWatched
);

router.put(
  "/courses/:courseId/lessons/:lessonId/progress",
  authMiddleware,
  courseAccessMiddleware,
  saveLessonProgress
);

// safer: no studentId in url
router.get(
  "/me/completedLessons",
  authMiddleware,
  getCompletedLessons
);

module.exports = router;
