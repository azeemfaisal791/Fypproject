// Visual Search (Vision 5.3) — search the catalog by uploading a product photo.
//
// Flow:  image upload (multer, in memory)
//        → resize/compress with sharp (keeps us under Groq's 4MB base64 limit)
//        → Llama 4 Scout (vision) extracts { category, keywords } as JSON
//        → normal MongoDB query against the live catalog
//        → ranked product results
//
// The AI never invents products — it only produces search terms that are
// matched against the real database, same guarantee as the chatbot.
const express = require("express");
const multer = require("multer");
const Product = require("../models/Product");
const { visionCompletion } = require("../utils/openai");

// sharp is optional: if it failed to install, we still work by rejecting
// oversized files instead of resizing them.
let sharp = null;
try {
  sharp = require("sharp");
} catch {
  console.warn("[visual-search] sharp not installed — large images will be rejected instead of resized.");
}

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB raw cap; we compress below
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Please upload an image file (JPG, PNG or WebP)"));
  },
});

// Groq rejects base64 image payloads over 4MB. Base64 inflates size by ~33%,
// so the encoded buffer must stay under ~3MB.
const MAX_ENCODED_BYTES = 3 * 1024 * 1024;

async function prepareImage(file) {
  if (sharp) {
    // Downscale + recompress: a 768px JPEG is plenty for garment recognition
    // and encodes to ~100-200KB, far below the provider limit.
    const buffer = await sharp(file.buffer)
      .rotate() // respect EXIF orientation from phone photos
      .resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { base64: buffer.toString("base64"), mimeType: "image/jpeg" };
  }
  // No sharp: send the original if it's small enough
  if (file.buffer.length > MAX_ENCODED_BYTES) {
    const err = new Error("Image is too large. Please upload an image under 3MB.");
    err.status = 400;
    throw err;
  }
  return { base64: file.buffer.toString("base64"), mimeType: file.mimetype };
}

const escapeRegex = (s) => String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /api/search/visual   (multipart/form-data, field name: "image")
router.post("/visual", (req, res) => {
  // Wrap multer manually so its errors (e.g. file too large) become clean JSON
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

      const { base64, mimeType } = await prepareImage(req.file);

      // Live category list keeps the prompt in sync with whatever admins add
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

      let analysis;
      try {
        const content = await visionCompletion(prompt, base64, mimeType, { json: true, maxTokens: 200 });
        analysis = JSON.parse(content);
      } catch (aiErr) {
        // AI provider down / quota / bad key → friendly degradation, not a crash
        console.error("[visual-search] AI analysis failed:", aiErr.message);
        return res.status(aiErr.status || 502).json({
          message: "Visual search is temporarily unavailable. Please try text search instead.",
        });
      }

      if (!analysis || analysis.is_clothing === false) {
        return res.json({
          products: [],
          analysis: null,
          message: "We couldn't find a clothing item in that image. Try a photo of a garment.",
        });
      }

      const category = categories.includes(analysis.category) ? analysis.category : null;
      const keywords = (Array.isArray(analysis.keywords) ? analysis.keywords : [])
        .map((k) => String(k).trim())
        .filter(Boolean)
        .slice(0, 5);

      // Keyword regexes over name + description (same pattern as text search)
      const keywordOr = keywords.map((k) => {
        const re = new RegExp(escapeRegex(k), "i");
        return { $or: [{ name: re }, { description: re }] };
      });

      const LIMIT = 12;
      let products = [];

      // 1) Strictest: right category AND at least one keyword
      if (category && keywordOr.length) {
        products = await Product.find({
          isActive: true,
          category,
          $or: keywordOr.map((c) => c.$or).flat(),
        }).limit(LIMIT);
      }
      // 2) Relax: whole category (a plain photo of jeans should show all jeans)
      if (products.length === 0 && category) {
        products = await Product.find({ isActive: true, category }).limit(LIMIT);
      }
      // 3) No category recognized: keywords across the whole catalog
      if (products.length === 0 && keywordOr.length) {
        products = await Product.find({
          isActive: true,
          $or: keywordOr.map((c) => c.$or).flat(),
        }).limit(LIMIT);
      }

      res.json({
        products,
        analysis: { category: category || "Unknown", keywords },
        message: products.length === 0 ? "No similar products found in our catalog." : undefined,
      });
    } catch (err) {
      console.error("[visual-search] failed:", err.message);
      res.status(err.status || 500).json({ message: err.status ? err.message : "Visual search failed. Please try again." });
    }
  });
});

module.exports = router;