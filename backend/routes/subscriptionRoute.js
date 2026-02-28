const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const subCtrl = require("../controller/subscriptionController");

// ✅ public/student: list active plans
router.get("/plans", authMiddleware, subCtrl.listActivePlans);

// ✅ student: get my subscription
router.get("/me", authMiddleware, roleMiddleware(["student"]), subCtrl.getMySubscription);

// ✅ student: cancel subscription (works for Razorpay + dummy)
router.post("/cancel", authMiddleware, roleMiddleware(["student"]), subCtrl.cancelMySubscription);

module.exports = router;