const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const liveClassChatController = require("../controller/liveClassChatController");

router.get("/:liveClassId/messages", authMiddleware, liveClassChatController.getChatMessages);
router.post("/:liveClassId/messages", authMiddleware, liveClassChatController.sendChatMessage);

module.exports = router;