// Product Reviews & Ratings (Vision 5.12). Mounted at /api/products
// (alongside productRoutes.js) so endpoints read naturally:
//   GET  /api/products/:id/reviews
//   POST /api/products/:id/reviews
const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/products/:id/reviews — public, anyone can read reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const reviews = await Review.find({ product: req.params.id }).sort("-createdAt");
    const count = reviews.length;
    const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    res.json({ reviews, average: Math.round(average * 10) / 10, count });
  } catch {
    res.status(500).json({ message: "Failed to load reviews" });
  }
});

// POST /api/products/:id/reviews  { rating, comment }
// Logged-in only. Submitting again updates the reviewer's existing review
// rather than creating a second one (enforced by the unique index too).
router.post("/:id/reviews", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Please choose a rating from 1 to 5" });
    }
    if (comment.length < 3) {
      return res.status(400).json({ message: "Please write a short comment (at least 3 characters)" });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ message: "Comment is too long (max 1000 characters)" });
    }

    const review = await Review.findOneAndUpdate(
      { product: product._id, user: req.user._id },
      { rating, comment, name: req.user.name },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.status(201).json({ review });
  } catch (err) {
    res.status(400).json({ message: "Failed to save your review" });
  }
});

module.exports = router;
