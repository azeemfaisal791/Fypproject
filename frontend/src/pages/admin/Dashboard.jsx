import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api";

export default function Dashboard() {
  const [userCount, setUserCount] = useState("-");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    apiRequest("/auth/users").then((d) => setUserCount(d.users.length)).catch(() => {});
    apiRequest("/products/admin/all").then((d) => setProducts(d.products)).catch(() => {});
    apiRequest("/orders").then((d) => setOrders(d.orders)).catch(() => {});
  }, []);

  const today = new Date().toDateString();
  const ordersToday = orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const revenueWeek = orders
    .filter((o) => new Date(o.createdAt).getTime() >= weekAgo && o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const lowStock = products.filter((p) => p.isActive && p.stock < 15);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat">
          <div className="label">Registered users</div>
          <div className="value">{userCount}</div>
        </div>
        <div className="stat">
          <div className="label">Active products</div>
          <div className="value">{products.filter((p) => p.isActive).length}</div>
        </div>
        <div className="stat">
          <div className="label">Orders today</div>
          <div className="value">{ordersToday}</div>
        </div>
        <div className="stat">
          <div className="label">Revenue this week</div>
          <div className="value">Rs {revenueWeek.toLocaleString()}</div>
        </div>
      </div>

      <h2 className="section-title">Low stock alerts</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        Active products below 15 units (Vision 5.11 - inventory alerts).
      </p>
      {lowStock.length === 0 ? (
        <p className="muted">No low-stock products right now.</p>
      ) : (
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
      )}
      <p className="muted" style={{ marginTop: 18 }}>
        Manage <Link to="/admin/products">products</Link>, review{" "}
        <Link to="/admin/orders">orders</Link>, or view{" "}
        <Link to="/admin/analytics">analytics</Link>.
      </p>
    </div>
  );
}