const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const aiController = require("../controller/aiController");

router.get("/skill-analysis", authMiddleware, aiController.getSkillAnalysis);
router.get("/recommendations", authMiddleware, aiController.getProRecommendations);
router.get("/roadmap", authMiddleware, aiController.getLearningPath);

module.exports = router;