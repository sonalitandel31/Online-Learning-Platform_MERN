module.exports = function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = (req.user?.role || "").toString().toLowerCase();
    const normalizedAllowed = (allowedRoles || []).map((r) => r.toString().toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }
    next();
  };
};
