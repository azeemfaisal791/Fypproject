// CNN feature extraction for Visual Search (Vision 5.3).
//
// Uses MobileNetV2 — a convolutional neural network pre-trained on ImageNet —
// as a FROZEN FEATURE EXTRACTOR (transfer learning, no training needed):
// the classification head is discarded and the final activation layer gives a
// ~1280-dimension "embedding" vector describing what the image looks like.
// Visually similar garments produce nearby vectors, so catalog search becomes
// cosine similarity between the query embedding and stored product embeddings.
//
// TENSORFLOW RUNTIME — auto-detected, fastest available first:
//   1. @tensorflow/tfjs-node  (native C++ bindings, ~200ms/image)
//      — often FAILS to install on Windows (needs Visual Studio C++)
//   2. @tensorflow/tfjs       (pure JavaScript, ~1-3s/image, installs anywhere)
//      + sharp for image decoding
//
// Install (Windows-friendly):   npm install @tensorflow/tfjs @tensorflow-models/mobilenet
// Install (Linux/deploy, faster): npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet
//
// Everything is lazy-loaded and failure-safe: if no TF runtime can load,
// isAvailable() returns false and the visual search route automatically
// falls back to the vision-LLM engine.

const fs = require("fs");
const path = require("path");

let tf = null;
let usingNative = false;
let model = null;
let loadPromise = null;
let loadFailed = false;

let sharp = null;
try {
  sharp = require("sharp");
} catch {
  /* only needed for the pure-JS decode path */
}

function requireTf() {
  if (tf) return tf;
  try {
    tf = require("@tensorflow/tfjs-node"); // native, fast — if it installed
    usingNative = true;
    return tf;
  } catch {
    /* fall through to pure JS */
  }
  tf = require("@tensorflow/tfjs"); // pure JS — installs on any machine
  usingNative = false;
  return tf;
}

async function loadModel() {
  if (model) return model;
  if (loadFailed) throw new Error("CNN model previously failed to load");
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        requireTf();
        const mobilenet = require("@tensorflow-models/mobilenet");
        console.log(
          `[cnn] Loading MobileNetV2 (${usingNative ? "native tfjs-node" : "pure-JS tfjs"} backend, first use only)...`
        );
        if (!usingNative) await tf.ready();
        const t0 = Date.now();
        // version 2 + alpha 1.0 = full-size MobileNetV2
        model = await mobilenet.load({ version: 2, alpha: 1.0 });
        console.log(`[cnn] MobileNetV2 ready in ${Date.now() - t0}ms`);
        return model;
      } catch (err) {
        loadFailed = true;
        loadPromise = null;
        console.error("[cnn] Could not load TensorFlow/MobileNet:", err.message);
        console.error("[cnn] Visual search will use the vision-LLM fallback engine.");
        throw err;
      }
    })();
  }
  return loadPromise;
}

// Cheap check the route uses to decide which engine to try first
function isAvailable() {
  if (loadFailed) return false;
  try {
    require.resolve("@tensorflow-models/mobilenet");
  } catch {
    return false;
  }
  try {
    require.resolve("@tensorflow/tfjs-node");
    return true; // native runtime present
  } catch {
    /* check pure-JS runtime */
  }
  try {
    require.resolve("@tensorflow/tfjs");
    return !!sharp; // pure-JS path needs sharp to decode images
  } catch {
    return false;
  }
}

// image buffer (jpg/png/webp) -> input tensor [224,224,3]
async function bufferToTensor(buffer) {
  if (usingNative && tf.node) {
    // Native path: TF decodes + we resize on the TF side
    const decoded = tf.node.decodeImage(buffer, 3); // force 3 channels
    const resized = tf.image.resizeBilinear(decoded, [224, 224]);
    decoded.dispose();
    return resized;
  }
  // Pure-JS path: sharp decodes straight to raw 224x224 RGB pixels
  const { data, info } = await sharp(buffer)
    .rotate() // respect EXIF orientation
    .removeAlpha()
    .resize(224, 224, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
}

// image buffer -> L2-normalized FROZEN MobileNet features (1280-d). This is the
// "feature extraction" style of transfer learning: the pretrained base is used
// as-is. trainVisualModel.js consumes these to train the fine-tuned head.
async function frozenFeatures(buffer) {
  const m = await loadModel();
  let input, activation;
  try {
    input = await bufferToTensor(buffer);
    // infer(x, true) -> internal embedding instead of class probabilities
    activation = m.infer(input, true);
    const raw = await activation.data();
    return l2normalize(Array.from(raw));
  } finally {
    // tfjs tensors are manual-memory — always dispose or the process leaks RAM
    input && input.dispose();
    activation && activation.dispose();
  }
}

// ------------------------------------------------------- fine-tuned head
// The "fine-tuning" style of transfer learning. trainVisualModel.js freezes
// MobileNet and trains a small head (1280 -> EMB -> categories) on the product
// catalog; its hidden layer is a fashion-AWARE embedding that clusters by
// garment type far better than the raw ImageNet features. If the head hasn't
// been trained yet, embedImage() transparently falls back to frozen features.
let head = null; // { inDim, outDim, W1:Float32Array, b1:Float32Array, categories }
let headTried = false;

function loadHead() {
  if (headTried) return head;
  headTried = true;
  try {
    const j = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "model", "visual-head.json"), "utf8")
    );
    head = {
      inDim: j.inDim,
      outDim: j.outDim,
      W1: Float32Array.from(j.W1), // row-major [inDim][outDim]
      b1: Float32Array.from(j.b1),
      categories: j.categories,
    };
    console.log(
      `[cnn] Fine-tuned head loaded (${j.inDim}->${j.outDim}, ${j.categories.length} classes) — using learned embedding.`
    );
  } catch {
    head = null; // not trained yet -> frozen-feature fallback
  }
  return head;
}

// frozen features -> learned embedding:  L2normalize( ReLU(features · W1 + b1) )
function projectHead(features) {
  const { W1, b1, inDim, outDim } = head;
  const out = new Array(outDim);
  for (let j = 0; j < outDim; j++) {
    let s = b1[j];
    for (let i = 0; i < inDim; i++) s += features[i] * W1[i * outDim + j];
    out[j] = s > 0 ? s : 0; // ReLU
  }
  return l2normalize(out);
}

// image buffer -> L2-normalized embedding used for similarity search. Uses the
// fine-tuned head when available, otherwise the frozen features.
async function embedImage(buffer) {
  const features = await frozenFeatures(buffer);
  const h = loadHead();
  return h ? projectHead(features) : features;
}

function l2normalize(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

// Both vectors are already L2-normalized, so cosine similarity = dot product
function cosineSimilarity(a, b) {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

// Embed a product's image URL and persist it. Used by embedProducts.js and
// (fire-and-forget) by product create/update so new images stay searchable.
async function embedProductImage(product) {
  try {
    if (!product?.image) return false;
    const res = await fetch(product.image);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching image`);
    const buffer = Buffer.from(await res.arrayBuffer());
    product.imageEmbedding = await embedImage(buffer);
    await product.save();
    return true;
  } catch (err) {
    console.error(`[cnn] Failed to embed product "${product?.name}":`, err.message);
    return false;
  }
}

module.exports = { isAvailable, embedImage, frozenFeatures, cosineSimilarity, embedProductImage };