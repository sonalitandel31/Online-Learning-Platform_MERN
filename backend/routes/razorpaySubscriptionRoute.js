const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const ctrl = require("../controller/razorpaySubscriptionController");

// Admin: create razorpay plan for a DB plan
router.post(
  "/plans/:planId/create-razorpay-plan",
  authMiddleware,
  roleMiddleware(["admin"]),
  ctrl.createRazorpayPlanForDbPlan
);

// Student: create subscription
router.post(
  "/create",
  authMiddleware,
  roleMiddleware(["student"]),
  ctrl.createRazorpaySubscription
);

router.post(
  "/verify-subscription",
  authMiddleware,
  roleMiddleware(["student"]),
  ctrl.verifySubscription
);

module.exports = router;