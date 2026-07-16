import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useCart } from "../context/CartContext.jsx";
import { validatePhone } from "../validators.js";
import CardPayment from "../components/CardPayment.jsx";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ address: "", city: "", phone: "" });
  const [method, setMethod] = useState("cod"); // "cod" | "card"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Once a card order is created we move to the payment step and show the
  // Stripe Payment Element for that order.
  const [cardOrderId, setCardOrderId] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const goToOrders = (paid) =>
    navigate("/orders", { state: { justOrdered: true, paid } });

  const placeOrder = async (e) => {
    e.preventDefault();
    setError("");
    if (form.address.trim().length < 5) return setError("Please enter a complete delivery address");
    if (!form.city.trim()) return setError("City is required");
    const badPhone = validatePhone(form.phone);
    if (badPhone) return setError(badPhone);

    setBusy(true);
    try {
      const { order } = await apiRequest("/orders", {
        method: "POST",
        body: {
          items: items.map((i) => ({ productId: i.id, size: i.size, qty: i.qty })),
          shipping: { address: form.address, city: form.city, phone: form.phone },
          paymentMethod: method,
        },
      });

      if (method === "card") {
        // Order is reserved but unpaid — collect the card next.
        setCardOrderId(order.id || order._id);
        setBusy(false);
      } else {
        clearCart();
        goToOrders(false);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (items.length === 0 && !cardOrderId) {
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
        <div style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
          {cardOrderId ? (
            // ---- Payment step (card) ----
            <>
              <h3 style={{ marginTop: 0 }}>Pay with card</h3>
              <p className="muted" style={{ marginBottom: 14 }}>
                Your order is reserved. Complete the payment below to confirm it.
              </p>
              <CardPayment
                orderId={cardOrderId}
                total={total}
                onSuccess={() => {
                  clearCart();
                  goToOrders(true);
                }}
              />
            </>
          ) : (
            // ---- Shipping + payment method step ----
            <form onSubmit={placeOrder}>
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
                <label className={`pay-option${method === "cod" ? " selected" : ""}`}>
                  <input type="radio" name="pay" value="cod" checked={method === "cod"} onChange={() => setMethod("cod")} />
                  <span className="pay-option-body">
                    <span className="pay-option-title">💵 Cash on Delivery</span>
                    <span className="muted">Pay in cash when your order arrives at your doorstep.</span>
                  </span>
                </label>
                <label className={`pay-option${method === "card" ? " selected" : ""}`}>
                  <input type="radio" name="pay" value="card" checked={method === "card"} onChange={() => setMethod("card")} />
                  <span className="pay-option-body">
                    <span className="pay-option-title">💳 Credit / debit card</span>
                    <span className="muted">Pay securely by card. You'll enter your card details on the next step.</span>
                  </span>
                </label>
              </div>
              <button className="btn" disabled={busy} style={{ width: "100%" }}>
                {busy
                  ? method === "card"
                    ? "Preparing payment..."
                    : "Placing order..."
                  : method === "card"
                  ? "Continue to payment"
                  : "Place order"}
              </button>
            </form>
          )}
        </div>
        <div className="cart-summary" style={{ marginTop: 0 }}>
          <strong>Order summary</strong>
          {items.map((i) => (
            <div key={i.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, margin: "8px 0" }}>
              <span>{i.name}{i.size ? ` (${i.size})` : ""} x {i.qty}</span>
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
