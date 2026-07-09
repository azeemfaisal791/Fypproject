import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api";

const pillClass = (status) =>
  status === "Delivered" ? "green" : status === "Cancelled" ? "red" : "gray";

export default function Orders() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(location.state?.justOrdered ? "Order placed successfully!" : "");
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = params.get("session_id");
    const load = () =>
      apiRequest("/orders/my")
        .then((d) => setOrders(d.orders))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));

    if (sessionId) {
      // Returned from Stripe checkout — confirm payment first
      apiRequest(`/orders/verify-payment?session_id=${encodeURIComponent(sessionId)}`)
        .then(() => setNotice("Payment successful! Your order is confirmed."))
        .catch(() => setError("We couldn't confirm the payment. If you were charged, contact support."))
        .finally(() => { setParams({}, { replace: true }); load(); });
    } else {
      load();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="container page"><h1>My orders</h1><p className="muted">Loading...</p></div>;

  return (
    <div className="container page">
      <h1>My orders</h1>
      {notice && <div className="success-msg" style={{ marginTop: 8 }}>{notice}</div>}
      {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
      {orders.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>You haven't placed any orders yet.</p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td title={o.id}>#{o.id.slice(-6).toUpperCase()}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>{o.items.map((i) => `${i.name} x${i.qty}`).join(", ")}</td>
                  <td>Rs {o.totalPrice.toLocaleString()}</td>
                  <td>{o.isPaid ? "Paid (card)" : o.paymentMethod === "cod" ? "Cash on delivery" : "Unpaid"}</td>
                  <td><span className={`pill ${pillClass(o.status)}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}