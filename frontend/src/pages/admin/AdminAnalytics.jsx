// Sales analytics (Vision 5.9). Simple bar chart with demo data;
// will read real aggregations from the orders API in a later phase.
const weekly = [
  { day: "Mon", sales: 12400 },
  { day: "Tue", sales: 9800 },
  { day: "Wed", sales: 15200 },
  { day: "Thu", sales: 11000 },
  { day: "Fri", sales: 18700 },
  { day: "Sat", sales: 22100 },
  { day: "Sun", sales: 16900 },
];

const topProducts = [
  { name: "Smart Watch", units: 34 },
  { name: "Wireless Headphones", units: 29 },
  { name: "Running Shoes", units: 21 },
  { name: "Bluetooth Speaker", units: 17 },
];

export default function AdminAnalytics() {
  const max = Math.max(...weekly.map((w) => w.sales));
  return (
    <div>
      <h1>Sales analytics</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Demo data - live analytics will come from order aggregations later.
      </p>

      <h2 className="section-title" style={{ marginTop: 0 }}>Sales this week</h2>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180, maxWidth: 560, marginBottom: 30 }}>
        {weekly.map((w) => (
          <div key={w.day} style={{ flex: 1, textAlign: "center" }}>
            <div
              title={`Rs ${w.sales.toLocaleString()}`}
              style={{
                height: `${(w.sales / max) * 140}px`,
                background: "var(--accent)",
                borderRadius: "3px 3px 0 0",
              }}
            />
            <div className="muted" style={{ marginTop: 6 }}>{w.day}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Top products</h2>
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
    </div>
  );
}
