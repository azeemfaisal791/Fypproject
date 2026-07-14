// Empties the product catalog — run this before rebuilding a fresh catalog.
// Only touches the products collection; orders keep their own price/name
// snapshots, so order history stays intact.
//
//   cd backend
//   node clearProducts.js
//
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce";

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    const before = await Product.countDocuments();
    const { deletedCount } = await Product.deleteMany({});
    console.log(`Removed ${deletedCount} of ${before} product(s). Store is now empty.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Failed to clear products:", err.message);
    process.exit(1);
  }
})();
