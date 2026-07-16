import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Cart() {
  const { items, updateQty, removeItem, total, syncItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [synced, setSynced] = useState(false);

  // On opening the cart, verify every item against the live catalog.
  useEffect(() => {
    if (items.length === 0) {
      setSynced(true);
      return;
    }
    apiRequest("/products/check", {
      method: "POST",
      body: { ids: items.map((i) => i.id) },
      auth: false,
    })
      .then((d) => {
        const removed = syncItems(d.products);
        if (removed.length) {
          setNotice(
            `Removed from your cart (no longer available): ${removed.join(", ")}`
          );
        }
      })
      .catch(() => {})
      .finally(() => setSynced(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkout = () => {
    if (!user) navigate("/login", { state: { from: "/checkout" } });
    else navigate("/checkout");
  };

  if (!synced) {
    return (
      <div className="container page">
        <h1>Your cart</h1>
        <p className="muted" style={{ marginTop: 10 }}>Checking availability...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container page">
        <h1>Your cart</h1>
        {notice && <div className="info-msg" style={{ marginTop: 10 }}>{notice}</div>}
        <p className="muted" style={{ marginTop: 10 }}>
          Your cart is empty. <Link to="/products">Browse products</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Your cart</h1>
      {notice && <div className="info-msg" style={{ marginTop: 10 }}>{notice}</div>}
      <div style={{ marginTop: 16 }}>
        {items.map((i) => (
          <div className="cart-row" key={i.key}>
            <img src={i.image} alt={i.name} />
            <div className="grow">
              <strong>{i.name}</strong>
              {i.size && <div className="muted">Size: {i.size}</div>}
              <div className="muted">
                Rs {i.price.toLocaleString()} each
                {i.stock <= 10 && <span> - only {i.stock} left</span>}
              </div>
            </div>
            <div className="qty-controls">
              <button onClick={() => updateQty(i.key, i.qty - 1)}>-</button>
              <span>{i.qty}</span>
              <button
                onClick={() => updateQty(i.key, Math.min(i.qty + 1, i.stock))}
                disabled={i.qty >= i.stock}
              >
                +
              </button>
            </div>
            <strong className="cart-row-price">
              Rs {(i.price * i.qty).toLocaleString()}
            </strong>
            <button className="btn btn-sm btn-outline" onClick={() => removeItem(i.key)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span>Total</span>
          <strong>Rs {total.toLocaleString()}</strong>
        </div>
        <button className="btn" style={{ width: "100%" }} onClick={checkout}>
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}