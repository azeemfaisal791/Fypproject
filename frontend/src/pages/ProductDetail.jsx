import { useParams, Link, useNavigate } from "react-router-dom";
import mockProducts from "../data/mockProducts.js";
import ProductCard from "../components/ProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="container page">
        <h1>Product not found</h1>
        <Link to="/products">Back to products</Link>
      </div>
    );
  }

  // "Similar products" placeholder - will use AI similarity later
  const similar = mockProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

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
          <p className="muted">{product.category} - {product.stock} in stock</p>
          <p className="price" style={{ fontSize: 22, margin: "12px 0" }}>
            Rs {product.price.toLocaleString()}
          </p>
          <p style={{ marginBottom: 20 }}>{product.description}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => addItem(product)}>Add to cart</button>
            <button
              className="btn btn-outline"
              onClick={() => { addItem(product); navigate("/cart"); }}
            >
              Buy now
            </button>
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
