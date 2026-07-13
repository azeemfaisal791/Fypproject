// AI chat helper — works with ANY OpenAI-compatible API via .env config.
//
//   OpenAI:  OPENAI_BASE_URL not set (default)   OPENAI_MODEL=gpt-4o-mini
//   Groq:    OPENAI_BASE_URL=https://api.groq.com/openai/v1
//            OPENAI_MODEL=llama-3.3-70b-versatile
//            OPENAI_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
//
// Requires Node 18+ (global fetch).
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// Vision model for image search (Vision 5.3). llama-3.3-70b is text-only,
// so image requests go to a separate multimodal model on the same provider.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

// Shared request/error handling for both text and vision calls
async function callProvider(body) {
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
      body: JSON.stringify(body),
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
    console.error(`[AI] model: ${body.model} | code: ${data.error?.code} | message: ${data.error?.message}`);
    if (res.status === 401) console.error("[AI] FIX: Invalid/revoked key for this provider.");
    if (data.error?.code === "insufficient_quota") console.error("[AI] FIX: Account has no credits.");
    if (data.error?.code === "model_not_found" || res.status === 404)
      console.error(`[AI] FIX: Model "${body.model}" not available on this provider — check .env.`);
    console.error("=====================================================");
    const err = new Error(data.error?.message || "AI request failed");
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  return data.choices?.[0]?.message?.content || "";
}

// Text-only completion (chatbot, recommendations)
async function chatCompletion(messages, { json = false, maxTokens = 400 } = {}) {
  return callProvider({
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.4,
    ...(json && { response_format: { type: "json_object" } }),
  });
}

// Vision completion (visual search, Vision 5.3).
// Sends one image (base64) + a text prompt to the multimodal model.
async function visionCompletion(prompt, imageBase64, mimeType = "image/jpeg", { json = false, maxTokens = 300 } = {}) {
  return callProvider({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    max_tokens: maxTokens,
    temperature: 0.2, // low temp → consistent structured output
    ...(json && { response_format: { type: "json_object" } }),
  });
}

module.exports = { chatCompletion, visionCompletion };