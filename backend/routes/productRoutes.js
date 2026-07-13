const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { protect, adminOnly, optionalAuth } = require("../middleware/auth");

const router = express.Router();

const validateProduct = (b) => {
  if (!b.name || !String(b.name).trim()) return "Product name is required";
  if (!b.description || !String(b.description).trim()) return "Description is required";
  if (!b.category || !String(b.category).trim()) return "Category is required";
  if (!b.price || Number(b.price) <= 0) return "Price must be a positive number";
  if (b.stock !== undefined && Number(b.stock) < 0) return "Stock cannot be negative";
  return null;
};

// ---------------- Public ----------------

// GET /api/products?keyword=&category=&page=&limit=&sort=
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(120, parseInt(req.query.limit) || 24);
    const { keyword, category, sort } = req.query;

    const filter = { isActive: true };
    if (keyword) {
      const re = new RegExp(String(keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { description: re }, { category: re }];
    }
    if (category && category !== "All") filter.category = category;

    const sortMap = { "price-asc": { price: 1 }, "price-desc": { price: -1 }, newest: { createdAt: -1 } };
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortMap[sort] || { createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ products, page, pages: Math.ceil(total / limit), total });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET /api/products/categories
router.get("/categories", async (req, res) => {
  try {
    res.json({ categories: await Product.distinct("category", { isActive: true }) });
  } catch {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// POST /api/products/check  { ids: [...] }
// Cart synchronization: returns which of the given products still exist and
// are active, with their CURRENT price and stock. The cart page uses this to
// drop deleted items and refresh stale prices (e.g. after a DB reseed).
router.post("/check", async (req, res) => {
  try {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter((id) =>
      mongoose.isValidObjectId(id)
    );
    const products = await Product.find({ _id: { $in: ids }, isActive: true });
    res.json({ products });
  } catch {
    res.status(500).json({ message: "Failed to check products" });
  }
});

// GET /api/products/:id — also records browsing history for logged-in
// customers (feeds the AI recommendation engine, Vision 5.1)
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) return res.status(404).json({ message: "Product not found" });

    if (req.user && req.user.role === "customer") {
      const history = (req.user.browsingHistory || []).filter((p) => String(p) !== String(product._id));
      history.push(product._id);
      req.user.browsingHistory = history.slice(-20);
      req.user.save().catch(() => {});
    }
    res.json(product);
  } catch {
    res.status(404).json({ message: "Product not found" });
  }
});

// ---------------- Admin CRUD ----------------

// GET /api/products/admin/all — includes hidden products
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  res.json({ products: await Product.find().sort("-createdAt") });
});

// POST /api/products
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const invalid = validateProduct(req.body);
    if (invalid) return res.status(400).json({ message: invalid });
    const { name, description, price, category, image, stock } = req.body;
    const product = await Product.create({
      name: name.trim(),
      description,
      price: Number(price),
      category: category.trim(),
      image: image || `https://loremflickr.com/600/450/menswear?random=${Date.now()}`,
      stock: Number(stock) || 0,
      createdBy: req.user._id,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: "Failed to create product" });
  }
});

// PUT /api/products/:id
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const invalid = validateProduct(req.body);
    if (invalid) return res.status(400).json({ message: invalid });
    const { name, description, price, category, image, stock, isActive } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description,
        price: Number(price),
        category: category.trim(),
        ...(image !== undefined && { image }),
        stock: Number(stock) || 0,
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch {
    res.status(400).json({ message: "Failed to update product" });
  }
});

// DELETE /api/products/:id — soft delete
router.delete("/:id", protect, adminOnly, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product removed" });
});

module.exports = router;