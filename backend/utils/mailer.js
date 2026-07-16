// Sends transactional emails (OTP + order notifications). If EMAIL_USER/
// EMAIL_PASS are not configured in .env, emails are printed to the backend
// console instead (localhost demo mode) — every email type uses this same
// fallback so nothing breaks in local dev without email credentials.
const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

// Shared low-level sender used by every email type below.
async function sendMail(to, subject, text) {
  if (!transporter) {
    console.log("=====================================================");
    console.log(`[DEV MODE] Email to ${to}: ${subject}`);
    console.log(text);
    console.log("Configure EMAIL_USER/EMAIL_PASS in .env to send real emails.");
    console.log("=====================================================");
    return;
  }
  await transporter.sendMail({ from: `"SmartShop" <${process.env.EMAIL_USER}>`, to, subject, text });
}

// ---------------- OTP (login / password reset) ----------------
async function sendOtpEmail(to, otp, purpose) {
  const subjectMap = {
    reset: "Your password reset code",
    login: "Your login verification code",
  };
  const subject = subjectMap[purpose] || "Your verification code";
  const text = `Your SmartShop verification code is: ${otp}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`;
  await sendMail(to, subject, text);
}

// ---------------- Orders (Vision 5.12) ----------------
const orderRef = (order) => `#${String(order._id).slice(-6).toUpperCase()}`;

const itemsList = (items) =>
  items
    .map(
      (i) =>
        `  - ${i.name}${i.size ? ` (Size: ${i.size})` : ""} x${i.qty} = Rs ${(i.price * i.qty).toLocaleString()}`
    )
    .join("\n");

// How the payment appears in emails, based on the order's method/paid state.
const paymentLabel = (order) =>
  order.paymentMethod === "card"
    ? order.isPaid
      ? "Paid by card"
      : "Card payment pending"
    : "Cash on Delivery";

async function sendOrderConfirmationEmail(user, order) {
  const subject = `Order confirmed - ${orderRef(order)}`;
  const text = `Hi ${user.name},

Thanks for your order! Here's your summary:

Order ${orderRef(order)}
${itemsList(order.items)}

Total: Rs ${order.totalPrice.toLocaleString()} (${paymentLabel(order)})
Delivering to: ${order.shipping.address}, ${order.shipping.city}

We'll email you again when your order ships. You can also track it any time from "My Orders" on the site.

Thanks for shopping with SmartShop!`;
  await sendMail(user.email, subject, text);
}

// Only these statuses are worth emailing about — the initial "Pending" state
// is already covered by the order confirmation email above.
const STATUS_NOTE = {
  Shipped: "Your order is on its way!",
  Delivered: "Your order has been delivered. We hope you enjoy it!",
  Closed: "Your order is now complete. Thanks for shopping with us!",
  Cancelled: "Your order has been cancelled. If you didn't request this, please contact us.",
};

async function sendOrderStatusEmail(user, order) {
  const note = STATUS_NOTE[order.status];
  if (!note) return;
  const subject = `Order update - ${orderRef(order)} is now ${order.status}`;
  const text = `Hi ${user.name},

${note}

Order ${orderRef(order)}
${itemsList(order.items)}

Total: Rs ${order.totalPrice.toLocaleString()} (${paymentLabel(order)})

Thanks for shopping with SmartShop!`;
  await sendMail(user.email, subject, text);
}

module.exports = { sendOtpEmail, sendOrderConfirmationEmail, sendOrderStatusEmail };