import { useState } from "react";

// UI shell for the AI chatbot (Vision 5.2). Replies are placeholder logic
// until the OpenAI-powered /api/chat backend route is built in the AI phase.
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm your shopping assistant. Ask me about products, orders, or how to use the site." },
  ]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { from: "user", text },
      { from: "bot", text: "The AI assistant will be connected in the next phase (OpenAI API). For now, browse Products or use voice search from the search bar." },
    ]);
    setInput("");
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
          </div>
          <form className="chatbot-input" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
      <button className="chatbot-fab" onClick={() => setOpen((o) => !o)} title="Chat with us">
        {open ? "x" : "?"}
      </button>
    </>
  );
}
