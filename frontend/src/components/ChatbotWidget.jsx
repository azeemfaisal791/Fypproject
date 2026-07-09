import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";

// AI chatbot (Vision 5.2) — now live via POST /api/chat (OpenAI-powered).
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm your shopping assistant. Ask me about products, prices, or your orders." },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = messages.slice(-8); // context for the AI
    setMessages((m) => [...m, { from: "user", text }]);
    setBusy(true);
    try {
      // auth:true → logged-in users can ask about their own orders
      const data = await apiRequest("/chat", {
        method: "POST",
        body: { message: text, history },
      });
      setMessages((m) => [...m, { from: "bot", text: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { from: "bot", text: err.message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <span>Shopping Assistant</span>
            <button className="icon-btn btn-sm" onClick={() => setOpen(false)}>x</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>{m.text}</div>
            ))}
            {busy && <div className="msg bot">Typing...</div>}
            <div ref={endRef} />
          </div>
          <form className="chatbot-input" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
            />
            <button type="submit" disabled={busy}>Send</button>
          </form>
        </div>
      )}
      <button className="chatbot-fab" onClick={() => setOpen((o) => !o)} title="Chat with us">
        {open ? "x" : "?"}
      </button>
    </>
  );
}