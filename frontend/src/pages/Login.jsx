import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { validateEmail, validateOtp } from "../validators.js";

export default function Login() {
  const { login, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const goAfterLogin = (user) => {
    if (user.role === "admin") navigate("/admin");
    else navigate(location.state?.from || "/");
  };

  const submitCredentials = async (e) => {
    e.preventDefault();
    setError("");
    const invalid = validateEmail(email);
    if (invalid) return setError(invalid);
    setBusy(true);
    try {
      const result = await login(email, password);
      if (result.requiresOtp) {
        setStep("otp");
        setInfo("We sent a 6-digit code to your email. (In dev mode it appears in the backend console.)");
      } else {
        goAfterLogin(result.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError("");
    const invalid = validateOtp(otp);
    if (invalid) return setError(invalid);
    setBusy(true);
    try {
      const user = await verifyLoginOtp(email, otp);
      goAfterLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="container">
        <form className="form-card" onSubmit={submitOtp}>
          <h1>Enter verification code</h1>
          {info && <p className="muted" style={{ marginBottom: 14 }}>{info}</p>}
          {error && <div className="error-msg">{error}</div>}
          <div className="field">
            <label>6-digit code sent to {email}</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </div>
          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Verifying..." : "Verify and log in"}
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            Wrong account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setStep("credentials"); setOtp(""); setError(""); }}>
              Go back
            </a>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <form className="form-card" onSubmit={submitCredentials}>
        <h1>Log in</h1>
        {error && <div className="error-msg">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Logging in..." : "Log in"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p className="muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
