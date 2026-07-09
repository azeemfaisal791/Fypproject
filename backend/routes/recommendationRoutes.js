// AI Product Recommendations (Vision 5.1) — powered by the OpenAI API.
// Uses the user's browsing history (recorded on product views) and asks the
// model to pick the best matches. Falls back to category-based / newest
// products if the user is a guest or the AI call fails.
const express = require("express");
const Product = require("../models/Product");
const { optionalAuth } = require("../middleware/auth");
const { chatCompletion } = require("../utils/openai");

const router = express.Router();

// GET /api/recommendations?limit=4
router.get("/", optionalAuth, async (req, res) => {
  const limit = Math.min(8, parseInt(req.query.limit) || 4);

  const newest = () => Product.find({ isActive: true }).sort("-createdAt").limit(limit);

  try {
    // Guest or empty history → popular/newest
    if (!req.user || !req.user.browsingHistory?.length) {
      return res.json({ products: await newest(), source: "popular" });
    }

    const historyIds = req.user.browsingHistory.slice(-10);
    const [viewed, candidates] = await Promise.all([
      Product.find({ _id: { $in: historyIds } }).select("name category price"),
      Product.find({ isActive: true, stock: { $gt: 0 }, _id: { $nin: historyIds } })
        .select("name category price")
        .limit(50),
    ]);

    if (candidates.length === 0) return res.json({ products: await newest(), source: "popular" });

    // Ask OpenAI to rank candidates against the browsing history
    let picked = [];
    try {
      const content = await chatCompletion(
        [
          {
            role: "system",
            content:
              'You are a product recommendation engine for a men\'s fashion store. Given products a customer recently VIEWED and a list of CANDIDATES, choose the candidates the customer is most likely to buy next (similar categories, complementary items, similar price range). Respond ONLY with JSON: {"ids": ["id1", "id2", ...]}',
          },
          {
            role: "user",
            content:
              `VIEWED:\n${viewed.map((p) => `${p.name} | ${p.category} | Rs ${p.price}`).join("\n")}\n\n` +
              `CANDIDATES:\n${candidates.map((p) => `${p._id} | ${p.name} | ${p.category} | Rs ${p.price}`).join("\n")}\n\n` +
              `Pick the best ${limit}.`,
          },
        ],
        { json: true, maxTokens: 200 }
      );
      const ids = (JSON.parse(content).ids || []).map(String);
      const byId = new Map(candidates.map((c) => [String(c._id), c]));
      picked = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, limit);
    } catch {
      picked = []; // AI unavailable → fall through to category fallback
    }

    // Fallback / top-up: same categories as browsing history, then newest
    if (picked.length < limit) {
      const cats = [...new Set(viewed.map((p) => p.category))];
      const pickedIds = picked.map((p) => String(p._id));
      const fill = candidates.filter(
        (c) => cats.includes(c.category) && !pickedIds.includes(String(c._id))
      );
      picked = [...picked, ...fill].slice(0, limit);
    }
    if (picked.length < limit) {
      const pickedIds = picked.map((p) => String(p._id));
      picked = [...picked, ...candidates.filter((c) => !pickedIds.includes(String(c._id)))].slice(0, limit);
    }

    // Return full product docs for the cards
    const full = await Product.find({ _id: { $in: picked.map((p) => p._id) } });
    // preserve ranking order
    const order = picked.map((p) => String(p._id));
    full.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));

    res.json({ products: full, source: "ai" });
  } catch {
    res.json({ products: await newest(), source: "popular" });
  }
});

module.exports = router;