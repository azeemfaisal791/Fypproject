const mongoose = require("mongoose");
const { PRODUCT_SIZES } = require("../utils/constants");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  image: { type: String, default: "" },
  // Size snapshot at purchase time. Optional so orders placed before the sizes
  // feature (which have no size) still load and display cleanly.
  size: { type: String, enum: [...PRODUCT_SIZES, ""], default: "" },
  price: { type: Number, required: true }, // price snapshot at purchase time
  qty: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    shipping: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      phone: { type: String, required: true },
    },
    // "cod" = Cash on Delivery (paid when delivered); "card" = paid online via
    // Stripe at checkout time.
    paymentMethod: { type: String, enum: ["cod", "card"], default: "cod" },
    // Stripe fields (only set for card orders). paymentIntentId lets us verify
    // payment status with Stripe and makes the webhook idempotent.
    stripePaymentIntentId: { type: String, default: "" },
    itemsPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    // COD: marked paid automatically when the order is delivered.
    // Card: marked paid once Stripe confirms the payment succeeded.
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    // Order lifecycle. Forward flow is Pending -> Shipped -> Delivered -> Closed.
    // "Cancelled" is a terminal state: once cancelled, an order can never move to
    // any other status. Transitions are enforced in orderRoutes.js (ORDER_STATUS_FLOW).
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Closed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model("Order", orderSchema);