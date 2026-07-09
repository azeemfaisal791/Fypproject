// Minimal OpenAI Chat Completions client (no extra npm package needed —
// uses Node 18+ global fetch). Set OPENAI_API_KEY in backend/.env.
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function chatCompletion(messages, { json = false, maxTokens = 400 } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[OpenAI] OPENAI_API_KEY is missing from .env (restart the server after adding it)");
    const err = new Error("AI is not configured yet (missing OPENAI_API_KEY)");
    err.status = 503;
    throw err;
  }

  if (typeof fetch !== "function") {
    console.error(`[OpenAI] global fetch not available — Node 18+ required. You are on ${process.version}.`);
    const err = new Error("Server Node version too old for AI features");
    err.status = 500;
    throw err;
  }

  let res, data;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
        ...(json && { response_format: { type: "json_object" } }),
      }),
    });
    data = await res.json();
  } catch (networkErr) {
    console.error("[OpenAI] Network error reaching api.openai.com:", networkErr.message);
    const err = new Error("Could not reach the AI service");
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    // Log the REAL reason to the backend console for debugging
    console.error("=====================================================");
    console.error(`[OpenAI] Request failed — HTTP ${res.status}`);
    console.error(`[OpenAI] type: ${data.error?.type} | code: ${data.error?.code}`);
    console.error(`[OpenAI] message: ${data.error?.message}`);
    if (data.error?.code === "insufficient_quota") {
      console.error("[OpenAI] FIX: Your account has no credits. Add billing at platform.openai.com -> Settings -> Billing.");
    }
    if (res.status === 401) {
      console.error("[OpenAI] FIX: The API key is invalid/revoked. Check .env for typos, quotes, or spaces.");
    }
    if (data.error?.code === "model_not_found") {
      console.error(`[OpenAI] FIX: Your key can't access "${MODEL}". Try OPENAI_MODEL=gpt-3.5-turbo in .env.`);
    }
    console.error("=====================================================");
    const err = new Error(data.error?.message || "OpenAI request failed");
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  return data.choices?.[0]?.message?.content || "";
}

module.exports = { chatCompletion };