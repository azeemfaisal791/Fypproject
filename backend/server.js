require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// GLOBAL: every schema serializes with virtuals, so all API responses
// include a string `id` alongside `_id`. The frontend relies on `id` —
// without this, product/order links break (/products/undefined).
mongoose.set("toJSON", { virtuals: true });

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const orderRoutes = require("./routes/orderRoutes");
const chatRoutes = require("./routes/chatRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const visualSearchRoutes = require("./routes/visualSearchRoutes");
const voiceSearchRoutes = require("./routes/voiceSearchRoutes");

const app = express();

// Security headers (Vision 7.5 / 9.1). Safe default here: this app is a pure
// JSON API — the frontend HTML is served separately by Vite/its own static
// host, so helmet's headers on API responses don't affect how that page loads.
app.use(helmet());

// CORS: only the configured frontend origin(s) may call this API from a
// browser. FRONTEND_URL supports a comma-separated list (e.g. local +
// deployed) so this doesn't need code changes between dev and production.
// Requests with no Origin header (curl, Postman, server-to-server) are still
// allowed — CORS only ever restricts browser-initiated cross-origin calls.
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

// General API rate limit — generous enough not to interfere with normal
// browsing/searching, just there to blunt scraping and denial-of-service
// style abuse. Tighter, endpoint-specific limits (login, OTP, etc.) live in
// authRoutes.js next to the routes they protect.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again in a few minutes." },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products", reviewRoutes); // /:id/reviews (Vision 5.12)
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/search", visualSearchRoutes); // Visual Search (Vision 5.3)
app.use("/api/search", voiceSearchRoutes); // Voice Search (Vision 5.4)

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI E-Commerce backend running" });
});

// Clean JSON response for a rejected CORS origin (instead of Express's
// default HTML error page). Must be defined after the routes above.
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "This origin is not allowed to access the API" });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });