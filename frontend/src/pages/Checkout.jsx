import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { validatePhone } from "../validators.js";

// Checkout UI is complete; actual order creation + Stripe test payment
// will connect when the orders backend module is built (Vision 5.6, 5.8).
export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ address: "", city: "", phone: "", payment: "card" });
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const placeOrder = (e) => {
    e.preventDefault();
    setError("");
    if (form.address.trim().length < 5) return setError("Please enter a complete delivery address");
    const badPhone = validatePhone(form.phone);
    if (badPhone) return setError(badPhone);
    // Placeholder: will POST /api/orders and trigger Stripe test payment
    setPlaced(true);
    clearCart();
    setTimeout(() => navigate("/orders"), 1800);
  };

  if (placed) {
    return (
      <div className="container page">
        <h1>Order placed (demo)</h1>
        <p className="muted">
          This is a placeholder confirmation. Real order storage and Stripe test
          payment will be wired in the orders phase. Redirecting to your orders...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container page">
        <h1>Checkout</h1>
        <p className="muted">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 16 }}>
        <form onSubmit={placeOrder} style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
          {error && <div className="error-msg">{error}</div>}
          <div className="field">
            <label>Delivery address</label>
            <input value={form.address} onChange={set("address")} required />
          </div>
          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={set("city")} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={set("phone")} required />
          </div>
          <div className="field">
            <label>Payment method</label>
            <select value={form.payment} onChange={set("payment")}>
              <option value="card">Card (Stripe - test mode, coming soon)</option>
              <option value="cod">Cash on delivery</option>
            </select>
          </div>
          <button className="btn" style={{ width: "100%" }}>Place order</button>
        </form>
        <div className="cart-summary" style={{ marginTop: 0 }}>
          <strong>Order summary</strong>
          {items.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, margin: "8px 0" }}>
              <span>{i.name} x {i.qty}</span>
              <span>Rs {(i.price * i.qty).toLocaleString()}</span>
            </div>
          ))}
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total</span>
            <strong>Rs {total.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
