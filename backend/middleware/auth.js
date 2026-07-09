const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or deactivated" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Not authorized, token invalid or expired" });
  }
};

// Attaches req.user if a valid token is present, but never blocks the request.
// Used on public routes that personalize when logged in (product views,
// recommendations, chatbot) — Vision 5.1 / 5.2.
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) req.user = user;
    }
  } catch (err) {
    // ignore — request continues as guest
  }
  next();
};

// Role-based authorization (Vision 7.5)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Access denied: admin only" });
};

module.exports = { protect, optionalAuth, adminOnly };