const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

// Update lastActiveAt at most once every 5 minutes per user
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account is blocked. Contact support.",
      });
    }

    const now = Date.now();
    const last = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;

    if (!last || now - last > ACTIVITY_THROTTLE_MS) {
      user.lastActiveAt = new Date();
      // save without validating other fields; tiny update
      await user.save({ validateBeforeSave: false });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = authMiddleware;
