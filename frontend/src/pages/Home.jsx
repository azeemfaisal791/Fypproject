import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import ProductCard from "../components/ProductCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState([]);
  const [recSource, setRecSource] = useState("popular");
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    // AI recommendations (Vision 5.1) — personalized when logged in,
    // popular items for guests. `auth: true` sends the token if present.
    apiRequest("/recommendations?limit=4")
      .then((d) => { setRecommended(d.products); setRecSource(d.source); })
      .catch(() => {});
    apiRequest("/products?sort=newest&limit=4", { auth: false })
      .then((d) => setLatest(d.products))
      .catch(() => {});
  }, [user]);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="hero">
        <div className="container">
          <span className="hero-eyebrow">✨ AI-powered shopping</span>
          <h1>Men's fashion, made smarter</h1>
          <p>
            T-shirts, trousers, jeans and sleepwear - with AI recommendations,
            voice and image search, and a 24/7 assistant.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn">Browse products</Link>
            <Link to="/products" className="btn btn-outline">Try voice &amp; image search</Link>
          </div>
          <div className="hero-features">
            <span className="hero-feature">🤖 AI recommendations</span>
            <span className="hero-feature">🎙️ Voice &amp; image search</span>
            <span className="hero-feature">💬 24/7 assistant</span>
          </div>
        </div>
      </div>

      <div className="container">
        <h2 className="section-title">
          {user && recSource === "ai"
            ? `Recommended for you, ${user.name.split(" ")[0]}`
            : "Popular right now"}
        </h2>
        {user && recSource === "ai" && (
          <p className="muted" style={{ marginBottom: 14 }}>
            Picked by AI based on products you've viewed.
          </p>
        )}
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