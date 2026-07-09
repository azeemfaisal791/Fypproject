// AI Chatbot (Vision 5.2) — powered by the OpenAI API.
// Grounded with the live product catalog and, when logged in, the
// user's recent orders, so it can answer real store questions.
const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { optionalAuth } = require("../middleware/auth");
const { chatCompletion } = require("../utils/openai");

const router = express.Router();

// POST /api/chat  { message, history: [{ from: "user"|"bot", text }] }
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    if (String(message).length > 500) {
      return res.status(400).json({ message: "Message is too long" });
    }

    // Live catalog context (compact to keep token cost low)
    const products = await Product.find({ isActive: true }).select("name price category stock").limit(60);
    const catalog = products
      .map((p) => `- ${p.name} | Rs ${p.price} | ${p.category} | ${p.stock > 0 ? p.stock + " in stock" : "OUT OF STOCK"}`)
      .join("\n");

    // Logged-in customers: include their recent orders for status questions
    let orderContext = "The user is not logged in, so you cannot see any orders.";
    if (req.user) {
      const orders = await Order.find({ user: req.user._id }).sort("-createdAt").limit(5);
      orderContext = orders.length
        ? "The user's recent orders:\n" +
          orders
            .map(
              (o) =>
                `- Order ${o._id} | ${o.createdAt.toISOString().slice(0, 10)} | Rs ${o.totalPrice} | status: ${o.status} | ${o.isPaid ? "paid" : "unpaid/COD"}`
            )
            .join("\n")
        : "The user has no orders yet.";
    }

    const system = `You are the friendly shopping assistant for SmartShop, an online men's fashion store (t-shirts, trousers, jeans, sleepwear) in Pakistan. Prices are in Pakistani Rupees (Rs).

Rules:
- Only help with SmartShop topics: products, availability, prices, orders, delivery, payments (card or cash on delivery), account help, and how to use the site (search bar supports text and voice search).
- If asked anything unrelated to shopping at SmartShop, politely steer back to the store.
- Recommend only products from the catalog below. Never invent products or prices.
- Keep replies short (2-4 sentences), warm, and helpful.

CATALOG:
${catalog}

${orderContext}`;

    const past = Array.isArray(history)
      ? history.slice(-8).map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: String(m.text || "").slice(0, 500),
        }))
      : [];

    const reply = await chatCompletion([
      { role: "system", content: system },
      ...past,
      { role: "user", content: String(message).trim() },
    ]);

    res.json({ reply });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.status === 503 ? err.message : "The assistant is unavailable right now. Please try again." });
  }
});

module.exports = router;