// AI key checker — supports OpenAI, Groq, or any OpenAI-compatible provider.
// Run from the backend folder:  node testOpenAI.js
require("dotenv").config();

(async () => {
  const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const key = process.env.OPENAI_API_KEY;

  console.log("Node version:", process.version);
  console.log("Provider:", BASE_URL);
  console.log("Model:", MODEL);
  if (!key) return console.log("❌ OPENAI_API_KEY is not set in backend/.env");
  console.log("Key loaded:", key.slice(0, 10) + "..." + key.slice(-4), `(length ${key.length})`);
  if (key !== key.trim()) console.log("⚠️  Key has whitespace — remove it in .env");
  console.log("Testing...\n");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key.trim()}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "Say OK" }], max_tokens: 5 }),
  });
  const data = await res.json();

  if (res.ok) {
    console.log("✅ SUCCESS! Reply:", data.choices[0].message.content);
    console.log("Restart your backend server and the chatbot + recommendations will work.");
  } else {
    console.log(`❌ FAILED — HTTP ${res.status}`);
    console.log("code:", data.error?.code);
    console.log("message:", data.error?.message);
  }
})().catch((e) => console.log("❌ Network/runtime error:", e.message));