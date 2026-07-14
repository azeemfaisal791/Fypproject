import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

// Rolling last 7 calendar days, oldest first, midnight-aligned for grouping.
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function AdminAnalytics() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div><h1>Sales analytics</h1><p className="muted">Loading...</p></div>;

  // Cancelled orders never completed a sale — exclude them from both charts,
  // same convention already used on the main Dashboard's revenue stat.
  const completed = orders.filter((o) => o.status !== "Cancelled");

  const weekly = last7Days().map((day) => {
    const sales = completed
      .filter((o) => new Date(o.createdAt).toDateString() === day.toDateString())
      .reduce((sum, o) => sum + o.totalPrice, 0);
    return { label: day.toLocaleDateString(undefined, { weekday: "short" }), sales };
  });
  const max = Math.max(1, ...weekly.map((w) => w.sales)); // avoid divide-by-zero when empty

  const unitsByProduct = {};
  for (const o of completed) {
    for (const item of o.items) {
      unitsByProduct[item.name] = (unitsByProduct[item.name] || 0) + item.qty;
    }
  }
  const topProducts = Object.entries(unitsByProduct)
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  return (
    <div>
      <h1>Sales analytics</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Live data from real orders (cancelled orders excluded).
      </p>
      {error && <div className="error-msg">{error}</div>}

      <h2 className="section-title" style={{ marginTop: 0 }}>Sales this week</h2>
      {completed.length === 0 ? (
        <p className="muted" style={{ marginBottom: 30 }}>No orders yet.</p>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180, maxWidth: 560, marginBottom: 30 }}>
          {weekly.map((w) => (
            <div key={w.label} style={{ flex: 1, textAlign: "center" }}>
              <div
                title={`Rs ${w.sales.toLocaleString()}`}
                style={{
                  height: `${(w.sales / max) * 140}px`,
                  background: "var(--accent)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <div className="muted" style={{ marginTop: 6 }}>{w.label}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Top products</h2>
      {topProducts.length === 0 ? (
        <p className="muted">No sales yet.</p>
      ) : (
        <div className="table-wrap" style={{ maxWidth: 480 }}>
          <table>
            <thead><tr><th>Product</th><th>Units sold</th></tr></thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.name}><td>{p.name}</td><td>{p.units}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}