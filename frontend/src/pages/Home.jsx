import { Link } from "react-router-dom";
import mockProducts from "../data/mockProducts.js";
import ProductCard from "../components/ProductCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();
  // Placeholder for AI recommendations (Vision 5.1): once the AI module is
  // built, this section will call GET /api/recommendations for this user.
  const recommended = mockProducts.slice(0, 4);
  const latest = mockProducts.slice(4, 8);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="hero">
        <div className="container">
          <h1>Men's fashion, made smarter</h1>
          <p>
            T-shirts, trousers, jeans and sleepwear - with AI recommendations,
            voice and image search, and a 24/7 assistant.
          </p>
          <Link to="/products" className="btn">Browse products</Link>
        </div>
      </div>

      <div className="container">
        <h2 className="section-title">
          {user ? `Recommended for you, ${user.name.split(" ")[0]}` : "Popular right now"}
        </h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          AI-powered personalization will activate in the next phase - showing popular items for now.
        </p>
        <div className="grid">
          {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        <h2 className="section-title">New arrivals</h2>
        <div className="grid">
          {latest.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
