const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const OTP_TTL_MS = 10 * 60 * 1000;      // valid 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;   // 1 request per minute
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits
}

// Creates + stores a hashed OTP on the user. Returns the plain code.
async function issueOtp(user, purpose) {
  if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000);
    const err = new Error(`Please wait ${wait} seconds before requesting another code`);
    err.status = 429;
    throw err;
  }
  const code = generateOtp();
  user.otpHash = await bcrypt.hash(code, 10);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpPurpose = purpose;
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();
  return code;
}

// Verifies a code. Throws with a friendly message on failure.
async function verifyOtp(user, code, purpose) {
  if (!user.otpHash || !user.otpExpires || user.otpPurpose !== purpose) {
    const err = new Error("No verification code was requested. Please request a new one.");
    err.status = 400;
    throw err;
  }
  if (user.otpExpires.getTime() < Date.now()) {
    const err = new Error("This code has expired. Please request a new one.");
    err.status = 400;
    throw err;
  }
  if (user.otpAttempts >= MAX_ATTEMPTS) {
    const err = new Error("Too many wrong attempts. Please request a new code.");
    err.status = 429;
    throw err;
  }
  const ok = await bcrypt.compare(String(code).trim(), user.otpHash);
  if (!ok) {
    user.otpAttempts += 1;
    await user.save();
    const err = new Error("Incorrect code. Please check and try again.");
    err.status = 400;
    throw err;
  }
  // consume the OTP so it cannot be reused
  user.otpHash = undefined;
  user.otpExpires = undefined;
  user.otpPurpose = undefined;
  user.otpAttempts = 0;
  await user.save();
}

module.exports = { issueOtp, verifyOtp };
