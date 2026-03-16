const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const liveClassQuestionController = require("../controller/liveClassQuestionController");

router.get("/:liveClassId/questions", authMiddleware, liveClassQuestionController.getQuestions);
router.post("/:liveClassId/questions", authMiddleware, liveClassQuestionController.askQuestion);

router.patch(
  "/questions/:questionId/answer",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassQuestionController.answerQuestion
);

router.patch(
  "/questions/:questionId/pin",
  authMiddleware,
  roleMiddleware(["instructor", "admin"]),
  liveClassQuestionController.togglePinQuestion
);

module.exports = router;