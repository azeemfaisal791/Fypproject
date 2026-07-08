// Client-side validation - mirrors backend rules so users get instant feedback.
export function validateName(name) {
  const n = (name || "").trim();
  if (n.length < 2) return "Name must be at least 2 characters";
  if (n.length > 50) return "Name must be under 50 characters";
  if (!/^[a-zA-Z\s.'-]+$/.test(n)) return "Name can only contain letters, spaces, and . ' -";
  return null;
}

export function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || "").trim())) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validatePassword(password) {
  if (!password || password.length < 6) return "Password must be at least 6 characters";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

export function validateOtp(otp) {
  if (!/^\d{6}$/.test((otp || "").trim())) return "Enter the 6-digit code";
  return null;
}

export function validatePhone(phone) {
  if (!/^[0-9+\-\s]{10,15}$/.test((phone || "").trim())) {
    return "Enter a valid phone number (10-15 digits)";
  }
  return null;
}
