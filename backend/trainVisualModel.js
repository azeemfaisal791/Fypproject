// Transfer-learning trainer for CNN visual search — the FINE-TUNING stage.
//
// Freezes the pretrained MobileNetV2 feature extractor and trains a small
// classification head on the PRODUCT CATALOG (augmented). The head's hidden
// layer becomes a fashion-aware embedding that clusters garments by type far
// better than the raw ImageNet features. This is textbook transfer learning
// (frozen pretrained base + trained task-specific head).
//
// Training data = catalog product images ONLY, so backend/test-images stays a
// clean held-out test set for testVisualSearch.js (no data leakage).
//
//   cd backend
//   node trainVisualModel.js
//   node embedProducts.js --force     # then re-index the catalog
//
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs");
const Product = require("./models/Product");
const { frozenFeatures } = require("./utils/imageEmbedding");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce";
const EMB_DIM = 128; // size of the learned embedding (head hidden layer)
const EPOCHS = 120;

// Data augmentation: expand each catalog image into several plausible variants
// so the tiny catalog is enough to train a stable head. Done at the IMAGE level
// (before MobileNet) so each variant produces its own feature vector.
async function augment(buffer) {
  return Promise.all([
    sharp(buffer).toBuffer(), // original
    sharp(buffer).flop().toBuffer(), // horizontal flip
    sharp(buffer).rotate(8, { background: "#ffffff" }).toBuffer(),
    sharp(buffer).rotate(-8, { background: "#ffffff" }).toBuffer(),
    sharp(buffer).modulate({ brightness: 1.15 }).toBuffer(), // brighter
    sharp(buffer).modulate({ brightness: 0.85 }).toBuffer(), // darker
  ]);
}

// Fisher-Yates shuffle so the validation split isn't biased to one category.
function shuffle(a, b) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
    [b[i], b[j]] = [b[j], b[i]];
  }
}

(async () => {
  await tf.ready();
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  const products = await Product.find({ isActive: true }).select("name category image").lean();
  const categories = [...new Set(products.map((p) => p.category))].sort();
  const catIndex = Object.fromEntries(categories.map((c, i) => [c, i]));
  console.log(`${products.length} products across ${categories.length} categories`);
  console.log("Extracting frozen features with augmentation (the slow part)...\n");

  const X = [];
  const Y = [];
  let n = 0;
  for (const p of products) {
    try {
      const res = await fetch(p.image);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const variants = await augment(buf);
      for (const v of variants) {
        X.push(await frozenFeatures(v));
        Y.push(catIndex[p.category]);
      }
      n++;
      process.stdout.write(
        `[${String(n).padStart(2)}/${products.length}] ${p.category.padEnd(22)} ${p.name}  (+${variants.length})\n`
      );
    } catch (e) {
      console.log(`SKIP ${p.name}: ${e.message}`);
    }
  }

  if (X.length === 0) {
    console.error("No features extracted — are the product image URLs reachable?");
    process.exit(1);
  }

  shuffle(X, Y);
  const inDim = X[0].length;
  console.log(`\nTraining head on ${X.length} vectors (${inDim} -> ${EMB_DIM} -> ${categories.length})...`);

  const xs = tf.tensor2d(X, [X.length, inDim]);
  const ys = tf.oneHot(tf.tensor1d(Y, "int32"), categories.length);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inDim], units: EMB_DIM, activation: "relu", name: "embedding" }));
  model.add(tf.layers.dropout({ rate: 0.4 }));
  model.add(tf.layers.dense({ units: categories.length, activation: "softmax", name: "classifier" }));
  model.compile({ optimizer: tf.train.adam(0.001), loss: "categoricalCrossentropy", metrics: ["accuracy"] });

  await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: 16,
    validationSplit: 0.2,
    shuffle: true,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 10 === 0 || epoch === 0) {
          console.log(
            `  epoch ${String(epoch + 1).padStart(2)}/${EPOCHS}  loss ${logs.loss.toFixed(3)}  ` +
              `acc ${logs.acc.toFixed(3)}  val_acc ${(logs.val_acc ?? 0).toFixed(3)}`
          );
        }
      },
    },
  });

  // Persist BOTH layers' weights (row-major) so imageEmbedding.js can, without
  // any tfjs I/O at inference: project frozen features -> learned embedding
  // (W1,b1) for similarity ranking, and predict the garment category
  // (W2,b2 -> softmax). The classifier is what the visual-search route trusts.
  const [k1, b1t] = model.getLayer("embedding").getWeights(); // [inDim][EMB_DIM], [EMB_DIM]
  const [k2, b2t] = model.getLayer("classifier").getWeights(); // [EMB_DIM][classes], [classes]
  const W1 = await k1.array(), b1 = await b1t.array();
  const W2 = await k2.array(), b2 = await b2t.array();
  const flat = (M, r, c) => { const o = []; for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) o.push(M[i][j]); return o; };

  const outDir = path.join(__dirname, "model");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "visual-head.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({
      inDim,
      outDim: EMB_DIM, // kept for back-compat with older imageEmbedding.js
      embDim: EMB_DIM,
      numClasses: categories.length,
      categories,
      W1: flat(W1, inDim, EMB_DIM),
      b1,
      W2: flat(W2, EMB_DIM, categories.length),
      b2,
    })
  );

  console.log(`\nSaved fine-tuned head (embedding + classifier) -> ${outPath}`);
  console.log("Next:  node embedProducts.js --force   (re-index the catalog with the learned embedding)");

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error("Training failed:", e);
  process.exit(1);
});
