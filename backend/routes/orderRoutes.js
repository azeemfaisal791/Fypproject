const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const { validatePhone } = require("../utils/validators");

const router = express.Router();

// Stripe is optional — COD works without it (Stripe isn't available in every
// country; for the FYP demo COD is always available).
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
}

const decrementStock = async (order) => {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
  }
};

// ---------------- Customer ----------------

// POST /api/orders  { items: [{ productId, qty }], shipping: { address, city, phone }, paymentMethod }
// SECURITY: prices and stock are re-validated from the DB — client totals are never trusted.
router.post("/", protect, async (req, res) => {
  try {
    const { items, shipping, paymentMethod } = req.body;
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
      const qty = Number(i.qty);
      if (!qty || qty < 1) return res.status(400).json({ message: "Invalid quantity" });
      const product = await Product.findById(i.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: "A product in your cart is no longer available" });
      }
      if (product.stock < qty) {
        return res.status(400).json({ message: `Only ${product.stock} left of "${product.name}"` });
      }
      orderItems.push({ product: product._id, name: product.name, image: product.image, price: product.price, qty });
      itemsPrice += product.price * qty;
    }

    const method = paymentMethod === "card" ? "card" : "cod";
    if (method === "card" && !stripe) {
      return res.status(400).json({ message: "Card payments are not configured yet. Please use Cash on Delivery." });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shipping: { address: shipping.address.trim(), city: shipping.city.trim(), phone: shipping.phone.trim() },
      paymentMethod: method,
      itemsPrice,
      totalPrice: itemsPrice, // flat/free shipping for the prototype
      status: method === "card" ? "Pending" : "Processing",
    });

    if (method === "cod") {
      await decrementStock(order);
      return res.status(201).json({ order });
    }

    // Card: create a Stripe Checkout session (test mode)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      line_items: order.items.map((i) => ({
        price_data: {
          currency: process.env.STRIPE_CURRENCY || "usd",
          product_data: { name: i.name },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.qty,
      })),
      metadata: { orderId: order._id.toString() },
      success_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/checkout`,
    });
    order.stripeSessionId = session.id;
    await order.save();
    res.status(201).json({ order, checkoutUrl: session.url });
  } catch (err) {
    res.status(500).json({ message: "Failed to place order" });
  }
});

// GET /api/orders/verify-payment?session_id=...  (marks card order paid)
router.get("/verify-payment", protect, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ message: "Card payments are not configured" });
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }
    const order = await Order.findById(session.metadata.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.status = "Processing";
      await decrementStock(order);
      await order.save();
    }
    res.json({ order });
  } catch {
    res.status(500).json({ message: "Payment verification failed" });
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
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch {
    res.status(400).json({ message: "Invalid status" });
  }
});

module.exports = router;