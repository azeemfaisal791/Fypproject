import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import { PRODUCT_SIZES } from "../../constants";

const emptySizes = () => Object.fromEntries(PRODUCT_SIZES.map((s) => [s, ""]));

// Product CRUD (Vision 5.11) — now persists to MongoDB via /api/products.
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | product
  // `sizeStock` holds the per-size stock inputs (e.g. { S: "5", M: "8", ... }).
  const [form, setForm] = useState({ name: "", price: "", category: "", image: "", description: "", sizeStock: emptySizes() });
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiRequest("/products/admin/all")
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setForm({ name: "", price: "", category: "", image: "", description: "", sizeStock: emptySizes() });
    setEditing("new");
    setError("");
  };

  const openEdit = (p) => {
    // Rebuild the per-size inputs from the product's sizes array.
    const sizeStock = emptySizes();
    (p.sizes || []).forEach((s) => { sizeStock[s.size] = String(s.stock); });
    setForm({ name: p.name, price: String(p.price), category: p.category, image: p.image, description: p.description, sizeStock });
    setEditing(p);
    setError("");
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setSize = (s) => (e) => setForm({ ...form, sizeStock: { ...form.sizeStock, [s]: e.target.value } });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    // Every product is offered in all four sizes; each carries its own stock
    // (blank = 0). The backend recomputes the aggregate total.
    const sizes = PRODUCT_SIZES.map((s) => ({ size: s, stock: Number(form.sizeStock[s]) || 0 }));
    const payload = {
      name: form.name,
      price: Number(form.price),
      category: form.category,
      image: form.image,
      description: form.description,
      sizes,
    };
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
          <div className="field">
            <label>Stock per size</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PRODUCT_SIZES.map((s) => (
                <div key={s} style={{ display: "flex", flexDirection: "column", width: 70 }}>
                  <span className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{s}</span>
                  <input type="number" min="0" placeholder="0" value={form.sizeStock[s]} onChange={setSize(s)} />
                </div>
              ))}
            </div>
          </div>
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
                  {p.sizes?.length > 0 && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      {p.sizes.map((s) => `${s.size}:${s.stock}`).join("  ")}
                    </div>
                  )}
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