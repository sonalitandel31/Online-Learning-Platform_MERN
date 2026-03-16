const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const liveClassController = require("../controller/liveClassController");

// CREATE LIVE CLASS
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.createLiveClass
);

// COURSE LIVE CLASSES
router.get(
  "/course/:courseId",
  authMiddleware,
  liveClassController.getCourseLiveClasses
);

// MY LIVE CLASSES (student/instructor/admin)
router.get(
  "/me/upcoming",
  authMiddleware,
  roleMiddleware(["student", "instructor", "admin"]),
  liveClassController.getMyUpcomingLiveClasses
);

// INSTRUCTOR / ADMIN ALL LIVE CLASSES
router.get(
  "/me/all",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.getMyAllLiveClasses
);

// ADMIN ALL LIVE CLASSES
router.get(
  "/admin/all",
  authMiddleware,
  roleMiddleware(["admin"]),
  liveClassController.getAllLiveClassesForAdmin
);

// JOIN LIVE CLASS
router.post(
  "/:liveClassId/join",
  authMiddleware,
  liveClassController.joinLiveClass
);

// LEAVE LIVE CLASS
router.post(
  "/:liveClassId/leave",
  authMiddleware,
  roleMiddleware(["student"]),
  liveClassController.leaveLiveClass
);

// ATTENDANCE
router.get(
  "/:liveClassId/attendance",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.getLiveClassAttendance
);

// RESCHEDULE LIVE CLASS
router.patch(
  "/:liveClassId/reschedule",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.rescheduleLiveClass
);

// CANCEL LIVE CLASS
router.patch(
  "/:liveClassId/cancel",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.cancelLiveClass
);

// SAVE RECORDING
router.patch(
  "/:liveClassId/recording",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.saveRecordingLink
);

module.exports = router;