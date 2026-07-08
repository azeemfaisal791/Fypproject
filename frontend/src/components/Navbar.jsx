import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">SmartShop</Link>
        <div className="nav-links">
          <Link to="/products">Products</Link>
          {user?.role === "admin" && <Link to="/admin">Admin Panel</Link>}
          {user?.role !== "admin" && (
            <Link to="/cart">
              Cart{count > 0 && <span className="badge">{count}</span>}
            </Link>
          )}
          {user ? (
            <>
              {user.role === "customer" && <Link to="/orders">My Orders</Link>}
              <Link to="/profile">{user.name.split(" ")[0]}</Link>
              <button className="btn btn-sm btn-outline" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
