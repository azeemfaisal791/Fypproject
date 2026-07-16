import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

// Mirrors ORDER_STATUS_FLOW in backend/routes/orderRoutes.js. Each state lists
// the statuses it may transition to. Terminal states (Closed, Cancelled) have
// none, so their dropdown is locked. The server enforces this too — this is
// just so the UI never offers an invalid choice.
const STATUS_FLOW = {
  Pending: ["Shipped", "Cancelled"],
  Shipped: ["Delivered", "Cancelled"],
  Delivered: ["Closed"],
  Closed: [],
  Cancelled: [],
  // Legacy orders created before the rename; behaves like Pending.
  Processing: ["Shipped", "Cancelled"],
};

// Order management (Vision 5.7) — live data, COD payment model.
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    apiRequest("/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setStatus = async (id, status) => {
    try {
      const d = await apiRequest(`/orders/${id}/status`, { method: "PATCH", body: { status } });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...d.order } : o)));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div><h1>Orders</h1><p className="muted">Loading...</p></div>;

  return (
    <div>
      <h1>Orders</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Orders follow Pending &rarr; Shipped &rarr; Delivered &rarr; Closed. Card orders are paid at
        checkout; for Cash on Delivery, marking an order "Delivered" records it as paid.
        Cancelling (allowed before delivery) returns its stock to inventory.
      </p>
      {error && <div className="error-msg">{error}</div>}
      {orders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td title={o.id}>
                    #{o.id.slice(-6).toUpperCase()}
                    <div className="muted">{new Date(o.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    {o.user?.name || "-"}
                    <div className="muted">{o.user?.email}</div>
                  </td>
                  <td>{o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} x${i.qty}`).join(", ")}</td>
                  <td>Rs {o.totalPrice.toLocaleString()}</td>
                  <td>
                    {o.paymentMethod === "card"
                      ? o.isPaid
                        ? "Paid (Card)"
                        : "Card - unpaid"
                      : o.isPaid
                      ? "Paid (COD)"
                      : "COD - due on delivery"}
                  </td>
                  <td>
                    {(STATUS_FLOW[o.status] || []).length === 0 ? (
                      // Terminal state — no further changes allowed.
                      <span className={`pill ${o.status === "Cancelled" ? "red" : "green"}`}>{o.status}</span>
                    ) : (
                      <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                        {/* Current status first, then only the valid next states. */}
                        <option value={o.status}>{o.status}</option>
                        {STATUS_FLOW[o.status].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}