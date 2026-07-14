import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

// Reviews & ratings for one product (Vision 5.12).
export default function ProductReviews({ productId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    apiRequest(`/products/${productId}/reviews`, { auth: false })
      .then((d) => {
        setReviews(d.reviews);
        setAverage(d.average);
        setCount(d.count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // If the logged-in user already reviewed this product, pre-fill the form
  // with their existing review so re-submitting edits it instead of confusing them.
  useEffect(() => {
    if (!user || reviews.length === 0) return;
    const mine = reviews.find((r) => String(r.user) === String(user.id));
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment);
    }
  }, [user, reviews]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await apiRequest(`/products/${productId}/reviews`, {
        method: "POST",
        body: { rating: Number(rating), comment },
      });
      setMsg("Thanks for your review!");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 36 }}>
      <h2 className="section-title">Reviews</h2>

      {!loading && (
        <p className="muted" style={{ marginBottom: 16 }}>
          {count > 0
            ? <>{stars(average)} {average} out of 5 ({count} review{count === 1 ? "" : "s"})</>
            : "No reviews yet — be the first to review this product."}
        </p>
      )}

      {user ? (
        <form
          onSubmit={submit}
          style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 16, marginBottom: 24, maxWidth: 480 }}
        >
          {error && <div className="error-msg">{error}</div>}
          {msg && <div className="success-msg">{msg}</div>}
          <div className="field">
            <label>Your rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} - {stars(n)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Your review</label>
            <textarea
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              required
            />
          </div>
          <button className="btn" disabled={busy}>{busy ? "Saving..." : "Submit review"}</button>
        </form>
      ) : (
        <p className="muted" style={{ marginBottom: 24 }}>
          <Link to="/login">Log in</Link> to leave a review.
        </p>
      )}

      {reviews.length > 0 && (
        <div>
          {reviews.map((r) => (
            <div key={r.id} style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
              <strong>{r.name}</strong>{" "}
              <span className="muted">{stars(r.rating)} · {new Date(r.createdAt).toLocaleDateString()}</span>
              <p style={{ marginTop: 4 }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}