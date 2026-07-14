import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import ProductCard from "../components/ProductCard.jsx";
import ProductReviews from "../components/ProductReviews.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setSimilar([]);

    apiRequest(`/products/${id}`, { auth: false })
      .then((data) => {
        setProduct(data);
        // "Similar products" = other items in the same category
        return apiRequest(
          `/products?category=${encodeURIComponent(data.category)}&limit=5`,
          { auth: false }
        );
      })
      .then((data) => {
        if (data) setSimilar(data.products.filter((p) => p.id !== id).slice(0, 4));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container page">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container page">
        <h1>Product not found</h1>
        <Link to="/products">Back to products</Link>
      </div>
    );
  }

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
            {product.category} - {outOfStock ? "Out of stock" : `${product.stock} in stock`}
          </p>
          <p className="price" style={{ fontSize: 22, margin: "12px 0" }}>
            Rs {product.price.toLocaleString()}
          </p>
          <p style={{ marginBottom: 20 }}>{product.description}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => addItem(product)} disabled={outOfStock}>
              {outOfStock ? "Out of stock" : "Add to cart"}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => { addItem(product); navigate("/cart"); }}
              disabled={outOfStock}
            >
              Buy now
            </button>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

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