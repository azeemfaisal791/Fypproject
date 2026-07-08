import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api";
import mockProducts from "../../data/mockProducts.js";

export default function Dashboard() {
  const [userCount, setUserCount] = useState("-");

  useEffect(() => {
    // Real data: user count from backend. Other stats are placeholders
    // until products/orders backend modules exist.
    apiRequest("/auth/users")
      .then((d) => setUserCount(d.users.length))
      .catch(() => setUserCount("-"));
  }, []);

  const lowStock = mockProducts.filter((p) => p.stock < 15);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat">
          <div className="label">Registered users</div>
          <div className="value">{userCount}</div>
        </div>
        <div className="stat">
          <div className="label">Products (demo)</div>
          <div className="value">{mockProducts.length}</div>
        </div>
        <div className="stat">
          <div className="label">Orders today (demo)</div>
          <div className="value">7</div>
        </div>
        <div className="stat">
          <div className="label">Revenue this week (demo)</div>
          <div className="value">Rs 84,500</div>
        </div>
      </div>

      <h2 className="section-title">Low stock alerts</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        Products below 15 units (Vision 5.11 - inventory alerts). Demo data.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Stock</th></tr></thead>
          <tbody>
            {lowStock.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td><span className="pill red">{p.stock} left</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 18 }}>
        Manage <Link to="/admin/products">products</Link>, review{" "}
        <Link to="/admin/orders">orders</Link>, or view{" "}
        <Link to="/admin/analytics">analytics</Link>.
      </p>
    </div>
  );
}
