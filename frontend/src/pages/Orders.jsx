// Order history page (Vision 5.5). Shows placeholder data until the
// orders backend module is built.
const demoOrders = [
  { id: "ORD-1024", date: "2026-07-05", items: 3, total: 11497, status: "Delivered" },
  { id: "ORD-1031", date: "2026-07-08", items: 1, total: 4999, status: "Processing" },
];

export default function Orders() {
  return (
    <div className="container page">
      <h1>My orders</h1>
      <p className="page-sub">Sample data shown - real orders will appear once the orders module is connected.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {demoOrders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.date}</td>
                <td>{o.items}</td>
                <td>Rs {o.total.toLocaleString()}</td>
                <td><span className={`pill ${o.status === "Delivered" ? "green" : "gray"}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
