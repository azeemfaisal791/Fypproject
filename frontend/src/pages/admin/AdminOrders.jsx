import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

// Order management (Vision 5.7) — live data from /api/orders.
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
      await apiRequest(`/orders/${id}/status`, { method: "PATCH", body: { status } });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div><h1>Orders</h1><p className="muted">Loading...</p></div>;

  return (
    <div>
      <h1>Orders</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Live orders from the database.</p>
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
                  <td>{o.items.map((i) => `${i.name} x${i.qty}`).join(", ")}</td>
                  <td>Rs {o.totalPrice.toLocaleString()}</td>
                  <td>{o.isPaid ? "Paid (card)" : o.paymentMethod === "cod" ? "COD" : "Unpaid"}</td>
                  <td>
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                      {statuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
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