import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import ProductCard from "../components/ProductCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

export default function Products() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/products/categories", { auth: false })
      .then((d) => setCategories(["All", ...d.categories]))
      .catch(() => {});
  }, []);

  // Small debounce so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (query) params.set("keyword", query);
      if (category !== "All") params.set("category", category);
      apiRequest(`/products?${params.toString()}`, { auth: false })
        .then((d) => setProducts(d.products))
        .catch(() => setError("Could not load products. Is the backend running?"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, category]);

  return (
    <div className="container page">
      <h1>Products</h1>
      <p className="page-sub">Search by text or voice. Image search coming in the AI phase.</p>
      <SearchBar onSearch={setQuery} />
      <div className="search-row">
        {categories.map((c) => (
          <button
            key={c}
            className={`icon-btn ${c === category ? "btn" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {error && <div className="error-msg">{error}</div>}
      {loading ? (
        <p className="muted">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="muted">No products match your search. Try a different keyword.</p>
      ) : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}