const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");
const { validateName, validateEmail, validatePassword, validateOtp } = require("../utils/validators");
const { issueOtp, verifyOtp } = require("../utils/otp");
const { sendOtpEmail } = require("../utils/mailer");

const router = express.Router();

// Stricter limit for the classic brute-force / credential-stuffing / OTP-
// guessing targets. This is IP-based and sits alongside (not instead of)
// otp.js's own per-account cooldown + max-attempts checks — the two overlap
// on purpose: this one blunts an attacker hitting many accounts from one IP,
// otp.js blunts one account being guessed from many IPs.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  twoFactorEnabled: user.twoFactorEnabled,
});

const findWithOtp = (email) =>
  User.findOne({ email: String(email || "").toLowerCase().trim() }).select("+otpHash");

// ---------------- Registration ----------------
// POST /api/auth/register (public - always creates CUSTOMER; admins are seeded)
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const invalid = validateName(name) || validateEmail(email) || validatePassword(password);
    if (invalid) return res.status(400).json({ message: invalid });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "customer",
    });
    const token = signToken(user);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ---------------- Login (step 1) ----------------
// POST /api/auth/login
// If the account has 2FA enabled, this sends an OTP and returns
// { requiresOtp: true } instead of a token.
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (validateEmail(email) || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been deactivated" });
    }

    if (user.twoFactorEnabled) {
      const code = await issueOtp(user, "login");
      await sendOtpEmail(user.email, code, "login");
      return res.json({
        requiresOtp: true,
        email: user.email,
        message: "A verification code was sent to your email",
      });
    }

    const token = signToken(user);
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ---------------- Login (step 2: verify 2FA OTP) ----------------
// POST /api/auth/login/verify-otp  { email, otp }
router.post("/login/verify-otp", authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const invalid = validateEmail(email) || validateOtp(otp);
    if (invalid) return res.status(400).json({ message: invalid });

    const user = await findWithOtp(email);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid request" });
    }
    await verifyOtp(user, otp, "login");
    const token = signToken(user);
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ---------------- Forgot password (step 1: request OTP) ----------------
// POST /api/auth/forgot-password  { email }
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const invalid = validateEmail(email);
    if (invalid) return res.status(400).json({ message: invalid });

    const user = await findWithOtp(email);
    // Generic response so attackers can't probe which emails exist
    const generic = { message: "If an account exists with this email, a reset code has been sent" };
    if (!user || !user.isActive) return res.json(generic);

    const code = await issueOtp(user, "reset");
    await sendOtpEmail(user.email, code, "reset");
    res.json(generic);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ---------------- Forgot password (step 2: verify OTP + set new password) ----------------
// POST /api/auth/reset-password  { email, otp, password }
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const invalid = validateEmail(email) || validateOtp(otp) || validatePassword(password);
    if (invalid) return res.status(400).json({ message: invalid });

    const user = await findWithOtp(email);
    if (!user || !user.isActive) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    await verifyOtp(user, otp, "reset");
    user.password = password;
    await user.save();
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ---------------- Session / profile ----------------
router.get("/me", protect, (req, res) => {
  res.json({ user: userResponse(req.user) });
});

// PUT /api/auth/profile  (update own name / password)
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, password } = req.body;
    if (name !== undefined) {
      const invalid = validateName(name);
      if (invalid) return res.status(400).json({ message: invalid });
      req.user.name = name.trim();
    }
    if (password) {
      const invalid = validatePassword(password);
      if (invalid) return res.status(400).json({ message: invalid });
      req.user.password = password;
    }
    await req.user.save();
    res.json({ user: userResponse(req.user), message: "Profile updated" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/auth/2fa/toggle  (enable/disable login OTP for own account)
router.patch("/2fa/toggle", protect, async (req, res) => {
  req.user.twoFactorEnabled = !req.user.twoFactorEnabled;
  await req.user.save();
  res.json({
    user: userResponse(req.user),
    message: req.user.twoFactorEnabled
      ? "Two-factor authentication enabled. You'll be asked for an email code at login."
      : "Two-factor authentication disabled.",
  });
});

// ---------------- Admin-only user management ----------------
router.get("/users", protect, adminOnly, async (req, res) => {
  const users = await User.find().sort("-createdAt");
  res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt,
    })),
  });
});

router.patch("/users/:id/toggle", protect, adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }
  user.isActive = !user.isActive;
  await user.save();
  res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}` });
});

module.exports = router;