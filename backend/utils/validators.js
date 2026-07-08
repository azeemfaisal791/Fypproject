// Shared server-side validation helpers.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateName(name) {
  if (!name || typeof name !== "string") return "Name is required";
  const n = name.trim();
  if (n.length < 2) return "Name must be at least 2 characters";
  if (n.length > 50) return "Name must be under 50 characters";
  if (!/^[a-zA-Z\s.'-]+$/.test(n)) return "Name can only contain letters, spaces, and . ' -";
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return "Email is required";
  if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address";
  if (email.length > 100) return "Email is too long";
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password.length > 72) return "Password is too long";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

function validateOtp(otp) {
  if (!otp || typeof otp !== "string") return "OTP code is required";
  if (!/^\d{6}$/.test(otp.trim())) return "OTP must be a 6-digit code";
  return null;
}

module.exports = { validateName, validateEmail, validatePassword, validateOtp };
