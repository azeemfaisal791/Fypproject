// Sends OTP emails. If EMAIL_USER/EMAIL_PASS are not configured in .env,
// the OTP is printed to the backend console instead (localhost demo mode).
const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendOtpEmail(to, otp, purpose) {
  const subjectMap = {
    reset: "Your password reset code",
    login: "Your login verification code",
  };
  const subject = subjectMap[purpose] || "Your verification code";
  const text = `Your SmartShop verification code is: ${otp}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`;

  if (!transporter) {
    console.log("=====================================================");
    console.log(`[DEV MODE] OTP for ${to} (${purpose}): ${otp}`);
    console.log("Configure EMAIL_USER/EMAIL_PASS in .env to send real emails.");
    console.log("=====================================================");
    return;
  }
  await transporter.sendMail({
    from: `"SmartShop" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

module.exports = { sendOtpEmail };
