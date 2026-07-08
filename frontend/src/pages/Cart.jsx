import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Cart() {
  const { items, updateQty, removeItem, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const checkout = () => {
    if (!user) navigate("/login", { state: { from: "/checkout" } });
    else navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="container page">
        <h1>Your cart</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Your cart is empty. <Link to="/products">Browse products</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Your cart</h1>
      <div style={{ marginTop: 16 }}>
        {items.map((i) => (
          <div className="cart-row" key={i.id}>
            <img src={i.image} alt={i.name} />
            <div className="grow">
              <strong>{i.name}</strong>
              <div className="muted">Rs {i.price.toLocaleString()} each</div>
            </div>
            <div className="qty-controls">
              <button onClick={() => updateQty(i.id, i.qty - 1)}>-</button>
              <span>{i.qty}</span>
              <button onClick={() => updateQty(i.id, i.qty + 1)}>+</button>
            </div>
            <strong style={{ width: 110, textAlign: "right" }}>
              Rs {(i.price * i.qty).toLocaleString()}
            </strong>
            <button className="btn btn-sm btn-outline" onClick={() => removeItem(i.id)}>
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
