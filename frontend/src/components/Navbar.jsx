import { Link, NavLink, useNavigate } from "react-router-dom";
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

  // Adds the "nav-active" class to whichever route is currently open.
  const navClass = ({ isActive }) => (isActive ? "nav-active" : "");

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">S</span>
          SmartShop
        </Link>
        <div className="nav-links">
          <NavLink to="/products" className={navClass}>Products</NavLink>
          {user?.role === "admin" && <NavLink to="/admin" className={navClass}>Admin Panel</NavLink>}
          {user?.role !== "admin" && (
            <NavLink to="/cart" className={navClass}>
              <span className="nav-cart">
                🛒 Cart{count > 0 && <span className="badge">{count}</span>}
              </span>
            </NavLink>
          )}
          {user ? (
            <>
              {user.role === "customer" && <NavLink to="/orders" className={navClass}>My Orders</NavLink>}
              <NavLink to="/profile" className={navClass}>{user.name.split(" ")[0]}</NavLink>
              <button className="btn btn-sm btn-outline" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>Log in</NavLink>
              <Link to="/register" className="btn btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
