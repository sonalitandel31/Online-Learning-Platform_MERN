const router = require("express").Router();
const {
  getMyGamification,
  getLeaderboard,
  getMyBadges,
} = require("../controller/gamificationController");

// use your auth middleware name here
const auth = require("../middleware/authMiddleware");

// Student endpoints
router.get("/me", auth, getMyGamification);
router.get("/leaderboard", auth, getLeaderboard);
router.get("/badges", auth, getMyBadges);

module.exports = router;
