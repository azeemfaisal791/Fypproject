import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useCart } from "../context/CartContext.jsx";
import { validatePhone } from "../validators.js";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ address: "", city: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const placeOrder = async (e) => {
    e.preventDefault();
    setError("");
    if (form.address.trim().length < 5) return setError("Please enter a complete delivery address");
    if (!form.city.trim()) return setError("City is required");
    const badPhone = validatePhone(form.phone);
    if (badPhone) return setError(badPhone);

    setBusy(true);
    try {
      await apiRequest("/orders", {
        method: "POST",
        body: {
          items: items.map((i) => ({ productId: i.id, qty: i.qty })),
          shipping: { address: form.address, city: form.city, phone: form.phone },
        },
      });
      clearCart();
      navigate("/orders", { state: { justOrdered: true } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

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
            <input value="Cash on Delivery" disabled />
            <p className="muted" style={{ marginTop: 6 }}>
              Pay in cash when your order arrives at your doorstep.
            </p>
          </div>
          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Placing order..." : "Place order"}
          </button>
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
            <span>Total (COD)</span>
            <strong>Rs {total.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}