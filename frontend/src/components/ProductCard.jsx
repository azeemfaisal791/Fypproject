import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  return (
    <div className="card">
      <Link to={`/products/${product.id}`}>
        <img src={product.image} alt={product.name} />
      </Link>
      <div className="card-body">
        <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
        <span className="muted">{product.category}</span>
        <span className="price">Rs {product.price.toLocaleString()}</span>
        <button className="btn btn-sm" onClick={() => addItem(product)}>
          Add to cart
        </button>
      </div>
    </div>
  );
}
