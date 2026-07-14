// Visual Search (Vision 5.3) — two engines, one endpoint.
//
//   PRIMARY  "cnn":  MobileNetV2 (TensorFlow) feature extraction + cosine
//                    similarity against precomputed product embeddings.
//                    Runs fully offline — no API key, no quota, no internet.
//                    Requires: npm i @tensorflow/tfjs-node @tensorflow-models/mobilenet
//                    and `node embedProducts.js` once after seeding.
//
//   FALLBACK "vlm":  Llama 4 Scout (vision LLM on Groq) classifies the image
//                    into {category, keywords}, matched via normal DB search.
//                    Used automatically when the CNN or embeddings are missing.
//
// Force an engine for testing/benchmarks:  POST /api/search/visual?engine=cnn|vlm
const express = require("express");
const multer = require("multer");
const Product = require("../models/Product");
const { visionCompletion } = require("../utils/openai");
const cnn = require("../utils/imageEmbedding");

// sharp is optional: used to shrink big uploads (and required only by the VLM
// engine's 4MB provider limit — the CNN engine resizes internally anyway).
let sharp = null;
try {
  sharp = require("sharp");
} catch {
  console.warn("[visual-search] sharp not installed — large images will be rejected instead of resized.");
}

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Please upload an image file (JPG, PNG or WebP)"));
  },
});

// Minimum cosine similarity to count as a match (tune with your test set)
const SIM_THRESHOLD = parseFloat(process.env.VISUAL_SIM_THRESHOLD || "0.5");
const LIMIT = 12;
const MAX_ENCODED_BYTES = 3 * 1024 * 1024; // provider base64 limit (VLM engine)

async function prepareImage(file) {
  if (sharp) {
    const buffer = await sharp(file.buffer)
      .rotate() // respect EXIF orientation from phone photos
      .resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { buffer, base64: buffer.toString("base64"), mimeType: "image/jpeg" };
  }
  if (file.buffer.length > MAX_ENCODED_BYTES) {
    const err = new Error("Image is too large. Please upload an image under 3MB.");
    err.status = 400;
    throw err;
  }
  return { buffer: file.buffer, base64: file.buffer.toString("base64"), mimeType: file.mimetype };
}

const escapeRegex = (s) => String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------- CNN engine
async function cnnSearch(imageBuffer) {
  const queryVec = await cnn.embedImage(imageBuffer);

  const products = await Product.find({
    isActive: true,
    imageEmbedding: { $exists: true, $ne: [] },
  }).select("+imageEmbedding");

  if (products.length === 0) {
    // Catalog not indexed yet -> let the caller fall back to the VLM
    const err = new Error("No product embeddings found — run `node embedProducts.js`");
    err.code = "NO_INDEX";
    throw err;
  }

  const scored = products
    .map((p) => ({ product: p, similarity: cnn.cosineSimilarity(queryVec, p.imageEmbedding) }))
    .sort((a, b) => b.similarity - a.similarity);

  const matches = scored.filter((s) => s.similarity >= SIM_THRESHOLD).slice(0, LIMIT);

  return {
    engine: "cnn",
    analysis: null,
    products: matches.map(({ product, similarity }) => {
      const obj = product.toJSON();
      delete obj.imageEmbedding; // never leak the vector to the client
      obj.similarity = Math.round(similarity * 100) / 100;
      return obj;
    }),
    bestSimilarity: scored.length ? Math.round(scored[0].similarity * 100) / 100 : 0,
    message:
      matches.length === 0
        ? "No visually similar products found in our catalog. Try a clearer photo of a garment."
        : undefined,
  };
}

// ---------------------------------------------------------------- VLM engine
async function vlmSearch(base64, mimeType) {
  const categories = await Product.distinct("category", { isActive: true });

  const prompt = `You are the visual search engine for an online MEN'S FASHION store.
Look at the image and identify the clothing item in it.

Respond ONLY with a JSON object in exactly this shape:
{"is_clothing": true, "category": "<one value from the list below, or \\"Unknown\\" if unsure>", "keywords": ["<2 to 5 short lowercase words describing color, pattern, style or fabric>"]}

Rules:
- "category" MUST be exactly one of: ${categories.join(", ")} — or "Unknown".
- If the image does not show a clothing/fashion item at all, respond with {"is_clothing": false, "category": "Unknown", "keywords": []}.
- Keywords should be words likely to appear in a product name or description (e.g. "navy", "striped", "slim fit", "denim", "flannel").
- No text outside the JSON.`;

  const content = await visionCompletion(prompt, base64, mimeType, { json: true, maxTokens: 200 });
  const analysis = JSON.parse(content);

  if (!analysis || analysis.is_clothing === false) {
    return {
      engine: "vlm",
      products: [],
      analysis: null,
      message: "We couldn't find a clothing item in that image. Try a photo of a garment.",
    };
  }

  const category = categories.includes(analysis.category) ? analysis.category : null;
  const keywords = (Array.isArray(analysis.keywords) ? analysis.keywords : [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .slice(0, 5);

  const keywordOr = keywords.flatMap((k) => {
    const re = new RegExp(escapeRegex(k), "i");
    return [{ name: re }, { description: re }];
  });

  let products = [];
  if (category && keywordOr.length)
    products = await Product.find({ isActive: true, category, $or: keywordOr }).limit(LIMIT);
  if (products.length === 0 && category)
    products = await Product.find({ isActive: true, category }).limit(LIMIT);
  if (products.length === 0 && keywordOr.length)
    products = await Product.find({ isActive: true, $or: keywordOr }).limit(LIMIT);

  return {
    engine: "vlm",
    products,
    analysis: { category: category || "Unknown", keywords },
    message: products.length === 0 ? "No similar products found in our catalog." : undefined,
  };
}

// ------------------------------------------------------------------- route
// POST /api/search/visual   (multipart/form-data, field name: "image")
router.post("/visual", (req, res) => {
  upload.single("image")(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        const msg =
          uploadErr.code === "LIMIT_FILE_SIZE"
            ? "Image is too large. Please upload an image under 8MB."
            : uploadErr.message;
        return res.status(400).json({ message: msg });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image received. Please choose an image to search with." });
      }

      const { buffer, base64, mimeType } = await prepareImage(req.file);
      const engine = String(req.query.engine || "auto").toLowerCase();

      // CNN first (unless explicitly asked for the VLM)
      if (engine !== "vlm" && cnn.isAvailable()) {
        try {
          return res.json(await cnnSearch(buffer));
        } catch (cnnErr) {
          if (engine === "cnn") {
            // Explicitly requested CNN -> report honestly instead of switching
            console.error("[visual-search] CNN engine failed:", cnnErr.message);
            return res.status(503).json({
              message:
                cnnErr.code === "NO_INDEX"
                  ? "CNN index missing. Run `node embedProducts.js` in the backend folder."
                  : "CNN engine unavailable.",
            });
          }
          console.warn(`[visual-search] CNN unavailable (${cnnErr.message}) — falling back to VLM.`);
        }
      } else if (engine === "cnn") {
        return res.status(503).json({
          message: "CNN engine not installed. Run: npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet",
        });
      }

      // VLM path (fallback, or forced with ?engine=vlm)
      try {
        return res.json(await vlmSearch(base64, mimeType));
      } catch (aiErr) {
        console.error("[visual-search] VLM analysis failed:", aiErr.message);
        return res.status(aiErr.status || 502).json({
          message: "Visual search is temporarily unavailable. Please try text search instead.",
        });
      }
    } catch (err) {
      console.error("[visual-search] failed:", err.message);
      res
        .status(err.status || 500)
        .json({ message: err.status ? err.message : "Visual search failed. Please try again." });
    }
  });
});

module.exports = router;