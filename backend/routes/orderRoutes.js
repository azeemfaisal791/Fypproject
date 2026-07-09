const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const { validatePhone } = require("../utils/validators");

const router = express.Router();

// ---------------- Customer ----------------

// POST /api/orders  { items: [{ productId, qty }], shipping: { address, city, phone } }
// Cash on Delivery only. Prices and stock are re-validated from the DB —
// client-side totals are never trusted (Vision 7.5).
router.post("/", protect, async (req, res) => {
  try {
    const { items, shipping } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }
    if (!shipping?.address || shipping.address.trim().length < 5) {
      return res.status(400).json({ message: "Please enter a complete delivery address" });
    }
    if (!shipping?.city || !shipping.city.trim()) {
      return res.status(400).json({ message: "City is required" });
    }
    const badPhone = validatePhone
      ? validatePhone(shipping.phone)
      : (!/^[0-9+\-\s]{10,15}$/.test(shipping.phone || "") ? "Enter a valid phone number" : null);
    if (badPhone) return res.status(400).json({ message: badPhone });

    const orderItems = [];
    let itemsPrice = 0;
    for (const i of items) {
      // Old carts (from the mock-data era) contain IDs like "p1" that aren't
      // valid Mongo ObjectIds — reject them with a clear, actionable message.
      if (!mongoose.isValidObjectId(i.productId)) {
        return res.status(400).json({
          message: "Your cart contains outdated items. Please clear your cart and add the products again.",
        });
      }
      const qty = Number(i.qty);
      if (!qty || qty < 1) return res.status(400).json({ message: "Invalid quantity" });

      const product = await Product.findById(i.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: "A product in your cart is no longer available. Please remove it and try again." });
      }
      if (product.stock < qty) {
        return res.status(400).json({ message: `Only ${product.stock} left of "${product.name}"` });
      }
      orderItems.push({ product: product._id, name: product.name, image: product.image, price: product.price, qty });
      itemsPrice += product.price * qty;
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shipping: { address: shipping.address.trim(), city: shipping.city.trim(), phone: shipping.phone.trim() },
      itemsPrice,
      totalPrice: itemsPrice,
    });

    // Reserve stock immediately
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
    }

    res.status(201).json({ order });
  } catch (err) {
    console.error("[orders] create failed:", err.message);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// GET /api/orders/my — logged-in user's order history (Vision 5.5)
router.get("/my", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort("-createdAt");
  res.json({ orders });
});

// ---------------- Admin ----------------

// GET /api/orders — all orders
router.get("/", protect, adminOnly, async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort("-createdAt");
  res.json({ orders });
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const previous = order.status;
    order.status = status;

    // COD: delivered means payment collected
    if (status === "Delivered" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
    // Cancelling returns the reserved stock to inventory
    if (status === "Cancelled" && previous !== "Cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
      }
    }

    await order.save();
    res.json({ order });
  } catch {
    res.status(400).json({ message: "Invalid status" });
  }
});

module.exports = router;