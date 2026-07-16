// Lazily-initialized Stripe client. Runs in TEST MODE using the test keys in
// .env (STRIPE_SECRET_KEY = sk_test_...). If no secret key is configured, the
// client is null and the payment routes report card payments as unavailable —
// the rest of the app (including Cash on Delivery) keeps working.
const Stripe = require("stripe");

const secretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = secretKey ? new Stripe(secretKey) : null;

if (!stripe) {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY not set — card payments are disabled (COD still works). " +
      "Add your Stripe TEST keys to backend/.env to enable them."
  );
}

// Presentment currency. Catalog prices are in PKR; override with STRIPE_CURRENCY
// if your Stripe test account doesn't support PKR (e.g. set it to "usd").
const CURRENCY = (process.env.STRIPE_CURRENCY || "pkr").toLowerCase();

// Stripe expects the amount in the currency's smallest unit. PKR/USD are
// 2-decimal currencies, so multiply by 100. (Zero-decimal currencies like JPY
// would differ, but this store doesn't use them.)
const toMinorUnits = (amount) => Math.round(Number(amount) * 100);

module.exports = { stripe, CURRENCY, toMinorUnits };
