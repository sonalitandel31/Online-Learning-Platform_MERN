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

// CANCEL LIVE CLASS
router.patch(
  "/:liveClassId/cancel",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.cancelLiveClass
);

// RESCHEDULE LIVE CLASS
router.patch(
  "/:liveClassId/reschedule",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.rescheduleLiveClass
);

// SAVE RECORDING LINK
router.patch(
  "/:liveClassId/recording",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.saveRecordingLink
);

// COURSE LIVE CLASSES
router.get(
  "/course/:courseId",
  authMiddleware,
  liveClassController.getCourseLiveClasses
);

// MY UPCOMING LIVE CLASSES
router.get(
  "/me/upcoming",
  authMiddleware,
  roleMiddleware(["student", "instructor", "admin"]),
  liveClassController.getMyUpcomingLiveClasses
);

// MY ALL LIVE CLASSES
router.get(
  "/me/all",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.getMyAllLiveClasses
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

// ADMIN ALL LIVE CLASSES
router.get(
  "/admin/all",
  authMiddleware,
  roleMiddleware(["admin"]),
  liveClassController.getAllLiveClassesForAdmin
);

// ATTENDANCE
router.get(
  "/:liveClassId/attendance",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassController.getLiveClassAttendance
);

module.exports = router;