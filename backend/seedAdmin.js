// Creates the admin account. Run once: npm run seed:admin
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

(async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce"
    );
    const email = (process.env.ADMIN_EMAIL || "admin@store.com").toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Admin already exists:", email);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || "Store Admin",
        email,
        password: process.env.ADMIN_PASSWORD || "admin123",
        role: "admin",
      });
      console.log("Admin created:", email);
    }
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
})();
