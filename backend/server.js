require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// GLOBAL: every schema serializes with virtuals, so all API responses
// include a string `id` alongside `_id`. The frontend relies on `id` —
// without this, product/order links break (/products/undefined).
mongoose.set("toJSON", { virtuals: true });

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const chatRoutes = require("./routes/chatRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const visualSearchRoutes = require("./routes/visualSearchRoutes");
const voiceSearchRoutes = require("./routes/voiceSearchRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/search", visualSearchRoutes); // Visual Search (Vision 5.3)
app.use("/api/search", voiceSearchRoutes); // Voice Search (Vision 5.4)

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI E-Commerce backend running" });
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