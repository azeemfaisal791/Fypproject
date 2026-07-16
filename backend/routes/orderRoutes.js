const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const { validatePhone } = require("../utils/validators");
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require("../utils/mailer");

const router = express.Router();

// ---------------- Order status workflow ----------------
// The only status changes an admin may make. Each key lists the statuses an
// order is allowed to move to FROM that state. Forward flow:
//   Pending -> Shipped -> Delivered -> Closed
// An order can be Cancelled while it is still Pending or Shipped (stock is
// returned to inventory). Once an order is Delivered, Closed or Cancelled it is
// in a terminal state and cannot transition anywhere — in particular, a
// Cancelled order can never become Shipped or Delivered again.
const ORDER_STATUS_FLOW = {
  Pending: ["Shipped", "Cancelled"],
  Shipped: ["Delivered", "Cancelled"],
  Delivered: ["Closed"],
  Closed: [],
  Cancelled: [],
  // Legacy alias: orders created before the status rename used "Processing" as
  // the initial state. Treat it exactly like "Pending" so old orders can still
  // be progressed. New orders never use it.
  Processing: ["Shipped", "Cancelled"],
};

// ---------------- Customer ----------------

// POST /api/orders  { items: [{ productId, qty }], shipping: { address, city, phone } }
// Cash on Delivery only. Prices and stock are re-validated from the DB —
// client-side totals are never trusted (Vision 7.5).
router.post("/", protect, async (req, res) => {
  try {
    const { items, shipping } = req.body;
    // Payment method: "cod" (default) or "card" (paid online via Stripe).
    const paymentMethod = req.body.paymentMethod === "card" ? "card" : "cod";
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

      // A size must be chosen, and it must be one this product is offered in.
      const size = String(i.size || "").trim().toUpperCase();
      const sizeEntry = product.sizes.find((s) => s.size === size);
      if (!size || !sizeEntry) {
        return res.status(400).json({ message: `Please choose a valid size for "${product.name}".` });
      }
      if (sizeEntry.stock < qty) {
        return res.status(400).json({ message: `Only ${sizeEntry.stock} left of "${product.name}" in size ${size}` });
      }
      orderItems.push({ product: product._id, name: product.name, image: product.image, size, price: product.price, qty });
      itemsPrice += product.price * qty;
    }

    // Reserve stock atomically so two concurrent orders can't oversell the same
    // unit. The conditional decrement targets the specific size and only
    // succeeds while enough of THAT size remains; the aggregate `stock` total is
    // decremented in the same update so it stays in sync. If any item can't be
    // reserved we roll back the rest and stop.
    const reserved = [];
    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, isActive: true, sizes: { $elemMatch: { size: item.size, stock: { $gte: item.qty } } } },
        { $inc: { "sizes.$.stock": -item.qty, stock: -item.qty } }
      );
      if (!updated) {
        for (const r of reserved) {
          await Product.updateOne(
            { _id: r.product },
            { $inc: { "sizes.$[s].stock": r.qty, stock: r.qty } },
            { arrayFilters: [{ "s.size": r.size }] }
          );
        }
        const current = await Product.findById(item.product);
        const left = current?.sizes.find((s) => s.size === item.size)?.stock ?? 0;
        return res.status(400).json({ message: `Only ${left} left of "${item.name}" in size ${item.size}` });
      }
      reserved.push(item);
    }

    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        items: orderItems,
        shipping: { address: shipping.address.trim(), city: shipping.city.trim(), phone: shipping.phone.trim() },
        paymentMethod,
        itemsPrice,
        totalPrice: itemsPrice,
      });
    } catch (createErr) {
      // Order failed to persist — release the stock we just reserved
      for (const r of reserved) {
        await Product.updateOne(
          { _id: r.product },
          { $inc: { "sizes.$[s].stock": r.qty, stock: r.qty } },
          { arrayFilters: [{ "s.size": r.size }] }
        );
      }
      throw createErr;
    }

    // Order confirmation email (fire-and-forget — email issues never fail the order)
    sendOrderConfirmationEmail(req.user, order).catch((e) =>
      console.error("[orders] confirmation email failed:", e.message)
    );

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

    // No-op: setting the same status changes nothing (idempotent).
    if (status === previous) {
      await order.populate("user", "name email");
      return res.json({ order });
    }

    // Enforce the workflow. Reject any transition that isn't allowed from the
    // order's current state — e.g. a Cancelled order can never become Shipped,
    // and a Delivered order can't go back to Pending.
    const allowed = ORDER_STATUS_FLOW[previous];
    if (!allowed) {
      return res.status(400).json({ message: `Unknown current status "${previous}"` });
    }
    if (!allowed.includes(status)) {
      const options = allowed.length ? allowed.join(" or ") : "no further changes";
      return res.status(400).json({
        message: `Cannot change an order from "${previous}" to "${status}". Allowed next: ${options}.`,
      });
    }

    order.status = status;

    // COD: delivered means payment was collected on delivery. Card orders are
    // already marked paid at payment time, so this only ever flips COD orders.
    if (status === "Delivered" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
    // Cancelling (only reachable from Pending/Shipped) returns the reserved
    // stock to inventory — to the specific size when known, and always to the
    // aggregate total. Orders placed before the sizes feature have no size, so
    // we fall back to restoring only the aggregate for those.
    if (status === "Cancelled") {
      for (const item of order.items) {
        if (item.size) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { "sizes.$[s].stock": item.qty, stock: item.qty } },
            { arrayFilters: [{ "s.size": item.size }] }
          );
        } else {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
        }
      }
    }

    await order.save();
    // Populate the customer so the response matches GET /api/orders (keeps the
    // admin table's name/email columns intact) and gives the email a recipient.
    await order.populate("user", "name email");

    // Notify the customer of the new status (no-op for statuses without a
    // template). Fire-and-forget — email issues never fail the update.
    sendOrderStatusEmail(order.user, order).catch((e) =>
      console.error("[orders] status email failed:", e.message)
    );

    res.json({ order });
  } catch {
    res.status(400).json({ message: "Invalid status" });
  }
});

module.exports = router;
// Exposed for tests and any tooling that needs to reason about the workflow.
module.exports.ORDER_STATUS_FLOW = ORDER_STATUS_FLOW;