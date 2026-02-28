const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controller/systemSettingsController");

// Admin - full access
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware(["admin"]),
  controller.getAdminSettings
);

router.put(
  "/admin",
  authMiddleware,
  roleMiddleware(["admin"]),
  controller.updateSettings
);

// Instructor read-only page
router.get(
  "/public",
  authMiddleware,
  roleMiddleware(["admin", "instructor"]),
  controller.getPublicSettings
);

module.exports = router;