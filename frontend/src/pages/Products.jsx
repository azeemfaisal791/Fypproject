import { useEffect, useRef, useState } from "react";
import { apiRequest, apiUpload } from "../api";
import ProductCard from "../components/ProductCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

export default function Products() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Visual search (Vision 5.3): when set, we show image matches instead of
  // the normal listing. { products, analysis, preview } — preview is an
  // object URL of the uploaded photo shown in the banner.
  const [visual, setVisual] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const previewRef = useRef(null); // tracked so we can revoke the object URL

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

  const clearVisual = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setVisual(null);
  };

  // Revoke the preview URL if the user leaves the page mid-visual-search
  useEffect(() => clearVisual, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageSelect = async (file) => {
    setError("");
    setImageBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const data = await apiUpload("/search/visual", fd);

      clearVisual();
      const preview = URL.createObjectURL(file);
      previewRef.current = preview;
      setVisual({
        products: data.products || [],
        analysis: data.analysis,
        engine: data.engine,
        message: data.message,
        preview,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setImageBusy(false);
    }
  };

  // Typing a new text query or picking a category exits visual mode
  const handleTextSearch = (q) => {
    if (visual) clearVisual();
    setQuery(q);
  };
  const handleCategory = (c) => {
    if (visual) clearVisual();
    setCategory(c);
  };

  const showingVisual = visual !== null;
  const list = showingVisual ? visual.products : products;

  return (
    <div className="container page">
      <h1>Products</h1>
      <p className="page-sub">Search by text, voice, or upload a photo of a product.</p>
      <SearchBar onSearch={handleTextSearch} onImageSelect={handleImageSelect} imageBusy={imageBusy} />
      <div className="search-row">
        {categories.map((c) => (
          <button
            key={c}
            className={`icon-btn ${c === category && !showingVisual ? "btn" : ""}`}
            onClick={() => handleCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {showingVisual && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            border: "1px solid var(--border)", borderRadius: 6,
            padding: "10px 14px", marginBottom: 20, background: "var(--bg-soft)",
          }}
        >
          <img
            src={visual.preview}
            alt="Your uploaded search image"
            style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4 }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ fontSize: 14 }}>Results for your image</strong>
            {visual.analysis ? (
              <div className="muted">
                Detected: {visual.analysis.category}
                {visual.analysis.keywords?.length > 0 && <> — {visual.analysis.keywords.join(", ")}</>}
              </div>
            ) : visual.products.length > 0 ? (
              <div className="muted">
                Ranked by visual similarity
                {typeof visual.products[0]?.similarity === "number" &&
                  <> — best match {Math.round(visual.products[0].similarity * 100)}%</>}
              </div>
            ) : null}
          </div>
          <button className="icon-btn" onClick={clearVisual} title="Back to all products">
            ✕ Clear
          </button>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {imageBusy ? (
        <p className="muted">Analyzing your image with AI...</p>
      ) : !showingVisual && loading ? (
        <p className="muted">Loading products...</p>
      ) : list.length === 0 ? (
        <p className="muted">
          {showingVisual
            ? visual.message || "No similar products found in our catalog."
            : "No products match your search. Try a different keyword."}
        </p>
      ) : (
        <div className="grid">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}