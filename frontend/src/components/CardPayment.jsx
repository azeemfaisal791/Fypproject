import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "../api";

// Inner form — only rendered once Stripe Elements has a clientSecret. Confirms
// the card, then tells the backend to verify + mark the order paid.
function PaymentForm({ orderId, total, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");

    // Confirm the payment without a full-page redirect where possible.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please check your card details.");
      setBusy(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        // Server-side verification is the source of truth for "paid".
        await apiRequest(`/payments/${orderId}/confirm`, { method: "POST" });
        onSuccess();
      } catch (err) {
        setError(err.message || "Payment went through but we couldn't confirm it. Please check My Orders.");
        setBusy(false);
      }
    } else {
      setError(`Payment status: ${paymentIntent ? paymentIntent.status : "unknown"}. Please try again.`);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <PaymentElement />
      {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
      <button className="btn" disabled={!stripe || busy} style={{ width: "100%", marginTop: 16 }}>
        {busy ? "Processing..." : `Pay Rs ${total.toLocaleString()}`}
      </button>
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        Test mode — use card <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC and ZIP.
      </p>
    </form>
  );
}

// Loads the publishable key + creates a PaymentIntent for the (already-created)
// order, then mounts the Payment Element.
export default function CardPayment({ orderId, total, onSuccess }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await apiRequest("/payments/config", { auth: false });
        if (!cfg.enabled || !cfg.publishableKey) {
          throw new Error("Card payments are not configured on the server. Please use Cash on Delivery.");
        }
        if (cancelled) return;
        setStripePromise(loadStripe(cfg.publishableKey));

        const { clientSecret: secret } = await apiRequest(`/payments/${orderId}/intent`, { method: "POST" });
        if (cancelled) return;
        setClientSecret(secret);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!stripePromise || !clientSecret) return <p className="muted">Loading secure payment form...</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <PaymentForm orderId={orderId} total={total} onSuccess={onSuccess} />
    </Elements>
  );
}
