import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  // Defensive: accept either `id` (serialized virtual) or raw `_id`,
  // so a card can never produce a /products/undefined link.
  const pid = product.id || product._id;
  const outOfStock = product.stock <= 0;

  return (
    <div className="card">
      <Link to={`/products/${pid}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="card-body">
        <h3><Link to={`/products/${pid}`}>{product.name}</Link></h3>
        <span className="muted">{product.category}</span>
        <span className="price">Rs {product.price.toLocaleString()}</span>
        <button
          className="btn btn-sm"
          onClick={() => addItem({ ...product, id: pid })}
          disabled={outOfStock}
        >
          {outOfStock ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}