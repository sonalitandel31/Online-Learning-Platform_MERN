const express = require("express");
const router = express.Router();
const { zoomWebhookHandler } = require("../controller/zoomWebhookController");

router.post("/", zoomWebhookHandler);

module.exports = router;