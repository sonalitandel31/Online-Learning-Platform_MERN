const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const planCtrl = require("../controller/subscriptionPlanController");

// ✅ All routes in this file are ADMIN only
router.use(authMiddleware, roleMiddleware(["admin"]));

// Create plan
router.post("/", planCtrl.createPlan);

// List all plans (active + inactive)
router.get("/", planCtrl.getAllPlansAdmin);

// Update plan
router.put("/:id", planCtrl.updatePlan);

// Toggle active/inactive
router.patch("/:id/toggle", planCtrl.togglePlanActive);

module.exports = router;