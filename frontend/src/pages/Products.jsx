import { useState } from "react";
import mockProducts from "../data/mockProducts.js";
import ProductCard from "../components/ProductCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

export default function Products() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = ["All", ...new Set(mockProducts.map((p) => p.category))];

  const filtered = mockProducts.filter((p) => {
    const matchesText =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category === "All" || p.category === category;
    return matchesText && matchesCat;
  });

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
      {filtered.length === 0 ? (
        <p className="muted">No products match your search. Try a different keyword.</p>
      ) : (
        <div className="grid">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
