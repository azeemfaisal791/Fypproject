import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { validateName, validatePassword } from "../validators.js";

export default function Profile() {
  const { user, updateProfile, toggle2FA } = useAuth();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busy2fa, setBusy2fa] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setError("");
    const invalid = validateName(name) || (password ? validatePassword(password) : null);
    if (invalid) return setError(invalid);
    setBusy(true);
    try {
      await updateProfile(password ? { name, password } : { name });
      setMsg("Profile updated");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handle2FA = async () => {
    setMsg(""); setError("");
    setBusy2fa(true);
    try {
      const message = await toggle2FA();
      setMsg(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy2fa(false);
    }
  };

  return (
    <div className="container">
      <form className="form-card" onSubmit={submit}>
        <h1>My profile</h1>
        <p className="muted" style={{ marginBottom: 14 }}>
          Signed in as <strong>{user.email}</strong> ({user.role})
        </p>
        {msg && <div className="success-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}
        <div className="field">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>New password (leave blank to keep current)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Saving..." : "Save changes"}
        </button>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />

        <h2 style={{ fontSize: 16, marginBottom: 6 }}>Two-factor authentication</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          {user.twoFactorEnabled
            ? "Enabled - you'll be asked for an email code every time you log in."
            : "Disabled - enable to require a 6-digit email code at login."}
        </p>
        <button
          type="button"
          className={`btn ${user.twoFactorEnabled ? "btn-danger" : "btn-outline"}`}
          onClick={handle2FA}
          disabled={busy2fa}
          style={{ width: "100%" }}
        >
          {busy2fa ? "Updating..." : user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      </form>
    </div>
  );
}
