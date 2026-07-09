// AI chat helper — works with ANY OpenAI-compatible API via .env config.
//
//   OpenAI:  OPENAI_BASE_URL not set (default)   OPENAI_MODEL=gpt-4o-mini
//   Groq:    OPENAI_BASE_URL=https://api.groq.com/openai/v1
//            OPENAI_MODEL=llama-3.3-70b-versatile
//
// Requires Node 18+ (global fetch).
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function chatCompletion(messages, { json = false, maxTokens = 400 } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[AI] OPENAI_API_KEY is missing from .env (restart the server after adding it)");
    const err = new Error("AI is not configured yet (missing OPENAI_API_KEY)");
    err.status = 503;
    throw err;
  }

  let res, data;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
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
    console.error(`[AI] Network error reaching ${BASE_URL}:`, networkErr.message);
    const err = new Error("Could not reach the AI service");
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    console.error("=====================================================");
    console.error(`[AI] Request failed — HTTP ${res.status} (provider: ${BASE_URL})`);
    console.error(`[AI] code: ${data.error?.code} | message: ${data.error?.message}`);
    if (res.status === 401) console.error("[AI] FIX: Invalid/revoked key for this provider.");
    if (data.error?.code === "insufficient_quota") console.error("[AI] FIX: Account has no credits.");
    if (data.error?.code === "model_not_found" || res.status === 404)
      console.error(`[AI] FIX: Model "${MODEL}" not available on this provider — check OPENAI_MODEL in .env.`);
    console.error("=====================================================");
    const err = new Error(data.error?.message || "AI request failed");
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  return data.choices?.[0]?.message?.content || "";
}

module.exports = { chatCompletion };