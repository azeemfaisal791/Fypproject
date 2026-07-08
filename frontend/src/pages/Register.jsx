import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { validateName, validateEmail, validatePassword } from "../validators.js";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const invalid =
      validateName(form.name) || validateEmail(form.email) || validatePassword(form.password);
    if (invalid) return setError(invalid);
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <form className="form-card" onSubmit={submit}>
        <h1>Create account</h1>
        <p className="muted" style={{ marginBottom: 14 }}>Sign up as a customer to start shopping.</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="field">
          <label>Full name</label>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="field">
          <label>Password (min 6 chars, must include letters and numbers)</label>
          <input type="password" value={form.password} onChange={set("password")} required />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input type="password" value={form.confirm} onChange={set("confirm")} required />
        </div>
        <button className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Creating account..." : "Sign up"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
