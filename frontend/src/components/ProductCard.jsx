import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
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
        {/* Sizes are chosen on the product page, so the card links there
            instead of adding to the cart directly. */}
        {outOfStock ? (
          <button className="btn btn-sm" disabled>Out of stock</button>
        ) : (
          <Link className="btn btn-sm" to={`/products/${pid}`}>Select size</Link>
        )}
      </div>
    </div>
  );
}
