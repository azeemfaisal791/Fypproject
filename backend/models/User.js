const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },

    // Two-factor authentication (login OTP via email)
    twoFactorEnabled: { type: Boolean, default: false },

    // One-time code storage (hashed) for 2FA login + password reset
    otpHash: { type: String, select: false },
    otpExpires: Date,
    otpPurpose: { type: String, enum: ["login", "reset"], default: undefined },
    otpAttempts: { type: Number, default: 0 },
    otpLastSentAt: Date,

    // Used later by the AI recommendation engine (Vision 5.1)
    browsingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
