import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

// Product CRUD (Vision 5.11) — now persists to MongoDB via /api/products.
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [form, setForm] = useState({ name: "", price: "", category: "", stock: "", image: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiRequest("/products/admin/all")
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setForm({ name: "", price: "", category: "", stock: "", image: "", description: "" });
    setEditing("new");
    setError("");
  };

  const openEdit = (p) => {
    setForm({ name: p.name, price: String(p.price), category: p.category, stock: String(p.stock), image: p.image, description: p.description });
    setEditing(p);
    setError("");
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      if (editing === "new") await apiRequest("/products", { method: "POST", body: payload });
      else await apiRequest(`/products/${editing.id}`, { method: "PUT", body: payload });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this product? It will be hidden from the store (order history is kept).")) return;
    try {
      await apiRequest(`/products/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div><h1>Products</h1><p className="muted">Loading...</p></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ marginBottom: 0 }}>Products</h1>
        <button className="btn" onClick={openNew}>Add product</button>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        Live data — changes persist to the database.
      </p>
      {error && <div className="error-msg">{error}</div>}

      {editing !== null && (
        <form onSubmit={save} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 18, marginBottom: 22, maxWidth: 520 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            {editing === "new" ? "Add product" : "Edit product"}
          </h2>
          <div className="field"><label>Name</label><input value={form.name} onChange={set("name")} required /></div>
          <div className="field"><label>Price (Rs)</label><input type="number" min="1" value={form.price} onChange={set("price")} required /></div>
          <div className="field"><label>Category</label><input value={form.category} onChange={set("category")} required /></div>
          <div className="field"><label>Stock</label><input type="number" min="0" value={form.stock} onChange={set("stock")} required /></div>
          <div className="field"><label>Image URL (optional)</label><input value={form.image} onChange={set("image")} /></div>
          <div className="field"><label>Description</label><textarea rows="3" value={form.description} onChange={set("description")} required /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" disabled={saving}>{saving ? "Saving..." : "Save product"}</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>Rs {p.price.toLocaleString()}</td>
                <td>
                  {p.stock < 15
                    ? <span className="pill red">{p.stock}</span>
                    : <span className="pill green">{p.stock}</span>}
                </td>
                <td>
                  {p.isActive
                    ? <span className="pill green">Active</span>
                    : <span className="pill gray">Hidden</span>}
                </td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)} style={{ marginRight: 6 }}>Edit</button>
                  {p.isActive && (
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}