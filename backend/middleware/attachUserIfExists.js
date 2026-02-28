// middleware/optionalAuthMiddleware.js
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

module.exports = async function attachUserIfExists(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // no token => continue (public)
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id).select("-password");
    if (user) req.user = user;

    return next();
  } catch (err) {
    // invalid token => still continue as public (don’t block browsing)
    return next();
  }
};