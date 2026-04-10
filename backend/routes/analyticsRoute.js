// routes/analyticsRoute.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const analyticsController = require("../controller/analyticsController");

router.post("/track", analyticsController.trackSingle);
router.post("/track-batch", analyticsController.trackBatch);
router.get("/ai-metrics", authMiddleware, analyticsController.getAiMetrics);

router.get("/overview", authMiddleware, analyticsController.getOverview);
router.get("/dau", authMiddleware, analyticsController.getDAU);

router.get("/student/me", authMiddleware, analyticsController.studentMe);
router.get("/instructor/me", authMiddleware, analyticsController.instructorMe);
router.get("/course/:id", authMiddleware, analyticsController.courseAnalytics);

router.get("/instructor/score/me", authMiddleware, analyticsController.instructorScoreMe);

router.post("/engagement/course/:id/compute", authMiddleware, analyticsController.computeCourseEngagement);
router.get("/engagement/course/:id", authMiddleware, analyticsController.getCourseEngagementLeaderboard);
router.get("/engagement/student/me", authMiddleware, analyticsController.studentEngagementMe);

router.get("/risk/course/:id", authMiddleware, analyticsController.getCourseDropoutRisk);
router.get("/insights/course/:id/lesson-dropoff", authMiddleware, analyticsController.getLessonDropoff);
router.get("/dropoff/course/:courseId", authMiddleware, analyticsController.getLessonDropoffInsights);

router.get("/admin/instructor-scores", authMiddleware, analyticsController.adminInstructorScores);
router.get("/admin/heatmap", authMiddleware, analyticsController.getPlatformHeatmap);
router.get("/admin/platform-risk", authMiddleware, analyticsController.getPlatformRiskOverview);

module.exports = router;
