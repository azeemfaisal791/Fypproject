import { useState } from "react";

// Order management UI (Vision 5.7). Demo data until the orders API exists.
const initialOrders = [
  { id: "ORD-1031", customer: "Ali Raza", date: "2026-07-08", total: 4999, status: "Processing" },
  { id: "ORD-1030", customer: "Sara Khan", date: "2026-07-08", total: 15498, status: "Processing" },
  { id: "ORD-1029", customer: "Usman Tariq", date: "2026-07-07", total: 2999, status: "Shipped" },
  { id: "ORD-1024", customer: "Ali Raza", date: "2026-07-05", total: 11497, status: "Delivered" },
  { id: "ORD-1019", customer: "Hina Malik", date: "2026-07-03", total: 6499, status: "Delivered" },
];

const statuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState(initialOrders);

  const setStatus = (id, status) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  return (
    <div>
      <h1>Orders</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Demo orders - will load from the database when the orders module is connected.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customer}</td>
                <td>{o.date}</td>
                <td>Rs {o.total.toLocaleString()}</td>
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
    </div>
  );
}
