import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { validateEmail, validateOtp, validatePassword } from "../validators.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setError("");
    const invalid = validateEmail(email);
    if (invalid) return setError(invalid);
    setBusy(true);
    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      });
      setInfo(data.message + " (In dev mode the code appears in the backend console.)");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    const invalid = validateOtp(otp) || validatePassword(password);
    if (invalid) return setError(invalid);
    if (password !== confirm) return setError("Passwords do not match");
    setBusy(true);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { email, otp, password },
        auth: false,
      });
      alert("Password reset successfully. Please log in with your new password.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      {step === 1 ? (
        <form className="form-card" onSubmit={requestCode}>
          <h1>Forgot password</h1>
          <p className="muted" style={{ marginBottom: 14 }}>
            Enter your account email and we'll send you a 6-digit reset code.
          </p>
          {error && <div className="error-msg">{error}</div>}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Sending..." : "Send reset code"}
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            Remembered it? <Link to="/login">Back to login</Link>
          </p>
        </form>
      ) : (
        <form className="form-card" onSubmit={resetPassword}>
          <h1>Reset password</h1>
          {info && <p className="muted" style={{ marginBottom: 14 }}>{info}</p>}
          {error && <div className="error-msg">{error}</div>}
          <div className="field">
            <label>6-digit code sent to {email}</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>New password (min 6 chars, letters + numbers)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Resetting..." : "Reset password"}
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            Didn't get a code?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setStep(1); setError(""); }}>
              Send again
            </a>{" "}
            (wait 60 seconds between requests)
          </p>
        </form>
      )}
    </div>
  );
}
