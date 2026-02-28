const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const revenueCtrl = require("../controller/revenueController");

// ✅ Admin only
router.get(
  "/overview",
  authMiddleware,
  roleMiddleware(["admin"]),
  revenueCtrl.getRevenueOverview
);

router.get(
  "/timeseries",
  authMiddleware,
  roleMiddleware(["admin"]),
  revenueCtrl.getRevenueTimeseries
);

router.get(
  "/mrr-series",
  authMiddleware,
  roleMiddleware(["admin"]),
  revenueCtrl.getMRRTimeseries
);

module.exports = router;