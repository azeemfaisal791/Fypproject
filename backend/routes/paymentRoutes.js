// Stripe payments (TEST MODE). Card is offered alongside Cash on Delivery.
//
// Flow (embedded Payment Element on the checkout page):
//   1. Frontend creates the order via POST /api/orders with paymentMethod:"card"
//      (stock is reserved, order saved as Pending / unpaid).
//   2. POST /api/payments/:orderId/intent  -> we create a Stripe PaymentIntent
//      for the order total and return its clientSecret.
//   3. Frontend confirms the card with Stripe.js (Payment Element).
//   4. Payment is marked paid either by the Stripe webhook (preferred) or by
//      POST /api/payments/:orderId/confirm (fallback the frontend calls after a
//      successful confirmation). Both are idempotent.
const express = require("express");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");
const { stripe, CURRENCY, toMinorUnits } = require("../utils/stripe");

const router = express.Router();

const cardDisabled = () => ({
  status: 503,
  body: { message: "Card payments are not configured. Please choose Cash on Delivery." },
});

// Mark an order paid exactly once. Safe to call repeatedly (webhook + confirm).
async function markOrderPaid(order) {
  if (order.isPaid) return order;
  order.isPaid = true;
  order.paidAt = new Date();
  await order.save();
  return order;
}

// GET /api/payments/config — publishable key for Stripe.js on the frontend.
// Public: the publishable key is safe to expose (that's its purpose).
router.get("/config", (req, res) => {
  res.json({
    enabled: Boolean(stripe),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  });
});

// POST /api/payments/:orderId/intent — create (or reuse) a PaymentIntent.
router.post("/:orderId/intent", protect, async (req, res) => {
  if (!stripe) {
    const d = cardDisabled();
    return res.status(d.status).json(d.body);
  }
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    // Only the owner may pay for their own order.
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your order" });
    }
    if (order.paymentMethod !== "card") {
      return res.status(400).json({ message: "This order is not a card order" });
    }
    if (order.isPaid) {
      return res.status(400).json({ message: "This order is already paid" });
    }

    // Reuse an existing intent for this order if it's still usable, so a page
    // refresh doesn't create duplicate PaymentIntents.
    if (order.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (existing && !["canceled", "succeeded"].includes(existing.status)) {
          return res.json({ clientSecret: existing.client_secret });
        }
      } catch {
        /* fall through and create a fresh intent */
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(order.totalPrice),
      currency: CURRENCY,
      // Let Stripe present the eligible methods (card, etc.) via Payment Element.
      automatic_payment_methods: { enabled: true },
      description: `SmartShop order #${String(order._id).slice(-6).toUpperCase()}`,
      metadata: { orderId: String(order._id), userId: String(order.user) },
    });

    order.stripePaymentIntentId = intent.id;
    await order.save();

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("[payments] create intent failed:", err.message);
    res.status(502).json({ message: "Could not start the card payment. Please try again." });
  }
});

// POST /api/payments/:orderId/confirm — fallback used by the frontend right
// after Stripe.js reports success. Verifies with Stripe before marking paid.
router.post("/:orderId/confirm", protect, async (req, res) => {
  if (!stripe) {
    const d = cardDisabled();
    return res.status(d.status).json(d.body);
  }
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your order" });
    }
    if (order.isPaid) return res.json({ order });
    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ message: "No payment has been started for this order" });
    }

    const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (intent.status !== "succeeded") {
      return res.status(400).json({ message: `Payment not completed (status: ${intent.status})` });
    }

    await markOrderPaid(order);
    res.json({ order });
  } catch (err) {
    console.error("[payments] confirm failed:", err.message);
    res.status(502).json({ message: "Could not confirm the payment." });
  }
});

// POST /api/payments/webhook — Stripe -> us. Mounted with a raw body parser in
// server.js (signature verification needs the exact bytes). This is the
// authoritative way payments get marked paid in production.
async function webhookHandler(req, res) {
  if (!stripe) return res.status(503).end();

  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  let event;
  try {
    if (secret) {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
    } else {
      // No webhook secret configured (e.g. quick local demo without the Stripe
      // CLI). Fall back to parsing the raw body — the /confirm route is the
      // real safety net in that case.
      event = JSON.parse(req.body.toString("utf8"));
    }
  } catch (err) {
    console.error("[payments] webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const orderId = event.data.object.metadata?.orderId;
    try {
      const order = orderId && (await Order.findById(orderId));
      if (order) await markOrderPaid(order);
    } catch (err) {
      console.error("[payments] webhook order update failed:", err.message);
    }
  }

  res.json({ received: true });
}

module.exports = { router, webhookHandler };
