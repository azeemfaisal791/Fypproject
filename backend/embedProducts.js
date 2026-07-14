// One-time indexing script for CNN visual search (like seedProducts.js).
//
// For every active product: downloads its image, runs it through the
// MobileNetV2 feature extractor, and stores the embedding vector on the
// product document. Run it after seeding (and re-run after reseeding):
//
//   cd backend
//   node embedProducts.js            # embed products that don't have one yet
//   node embedProducts.js --force    # re-embed everything (e.g. images changed)
//
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const { isAvailable, embedProductImage } = require("./utils/imageEmbedding");

const FORCE = process.argv.includes("--force");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce";

(async () => {
  if (!isAvailable()) {
    console.error("TensorFlow packages not found. Install them first:");
    console.error("  npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  // select('+imageEmbedding') because the field is hidden by default
  const products = await Product.find({ isActive: true }).select("+imageEmbedding");
  const todo = FORCE ? products : products.filter((p) => !p.imageEmbedding || p.imageEmbedding.length === 0);

  console.log(`${products.length} active products | ${todo.length} to embed${FORCE ? " (forced)" : ""}\n`);

  let ok = 0, failed = 0;
  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    const success = await embedProductImage(p); // downloads image + embeds + saves
    if (success) {
      ok++;
      console.log(`[${i + 1}/${todo.length}] OK    ${p.category.padEnd(24)} ${p.name}`);
    } else {
      failed++;
      console.log(`[${i + 1}/${todo.length}] FAIL  ${p.category.padEnd(24)} ${p.name}`);
    }
  }

  console.log(`\nDone: ${ok} embedded, ${failed} failed, ${products.length - todo.length} skipped (already embedded).`);
  if (failed > 0) console.log("Failures are usually dead image URLs — re-run to retry, or fix the product's image.");
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error("Indexing failed:", err.message);
  process.exit(1);
});