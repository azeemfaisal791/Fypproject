import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import ProductCard from "../components/ProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    // auth:true → the view is recorded in browsingHistory when logged in,
    // which powers the AI recommendations (Vision 5.1)
    apiRequest(`/products/${id}`)
      .then((p) => {
        setProduct(p);
        return apiRequest(`/products?category=${encodeURIComponent(p.category)}&limit=5`, { auth: false });
      })
      .then((d) => d && setSimilar(d.products.filter((s) => s.id !== id).slice(0, 4)))
      .catch(() => setNotFound(true));
    window.scrollTo(0, 0);
  }, [id]);

  if (notFound) {
    return (
      <div className="container page">
        <h1>Product not found</h1>
        <Link to="/products">Back to products</Link>
      </div>
    );
  }

  if (!product) return <div className="container page"><p className="muted">Loading...</p></div>;

  const outOfStock = product.stock <= 0;

  return (
    <div className="container page">
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <img
          src={product.image}
          alt={product.name}
          style={{ width: 380, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)" }}
        />
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>{product.name}</h1>
          <p className="muted">
            {product.category} - {outOfStock ? "out of stock" : `${product.stock} in stock`}
          </p>
          <p className="price" style={{ fontSize: 22, margin: "12px 0" }}>
            Rs {product.price.toLocaleString()}
          </p>
          <p style={{ marginBottom: 20 }}>{product.description}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => addItem(product)} disabled={outOfStock}>
              {outOfStock ? "Out of stock" : "Add to cart"}
            </button>
            {!outOfStock && (
              <button
                className="btn btn-outline"
                onClick={() => { addItem(product); navigate("/cart"); }}
              >
                Buy now
              </button>
            )}
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <>
          <h2 className="section-title">Similar products</h2>
          <div className="grid">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}