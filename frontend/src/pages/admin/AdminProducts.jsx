import { useState } from "react";
import mockProducts from "../../data/mockProducts.js";

// Full product CRUD UI (Vision 5.11). Works on local state for now;
// each handler will switch to /api/products calls when that module is built.
export default function AdminProducts() {
  const [products, setProducts] = useState(mockProducts);
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [form, setForm] = useState({ name: "", price: "", category: "", stock: "", image: "", description: "" });

  const openNew = () => {
    setForm({ name: "", price: "", category: "", stock: "", image: "", description: "" });
    setEditing("new");
  };

  const openEdit = (p) => {
    setForm({ ...p, price: String(p.price), stock: String(p.stock) });
    setEditing(p);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image || `https://picsum.photos/seed/${encodeURIComponent(form.name)}/400/300`,
    };
    if (editing === "new") {
      setProducts((prev) => [{ ...payload, id: `p${Date.now()}` }, ...prev]);
    } else {
      setProducts((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...payload } : p)));
    }
    setEditing(null);
  };

  const remove = (id) => {
    if (confirm("Delete this product?")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ marginBottom: 0 }}>Products</h1>
        <button className="btn" onClick={openNew}>Add product</button>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        Changes are local for now - will persist to the database when the products API is built.
      </p>

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
            <button className="btn">Save product</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
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
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)} style={{ marginRight: 6 }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
