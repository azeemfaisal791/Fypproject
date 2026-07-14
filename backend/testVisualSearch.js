// Visual Search accuracy evaluator (for FYP testing & evaluation chapter).
//
// Usage:
//   1. Create a folder of labeled test images (folder name = true category):
//        backend/test-images/Jeans/photo1.jpg
//        backend/test-images/T-Shirts/tee.png
//        backend/test-images/_not-clothing/car.jpg   <- negatives
//      Folder names must EXACTLY match your product categories
//      (run:  node -e "..." or check /api/products/categories).
//
//   2. Start the backend (node server.js), then in another terminal:
//        node testVisualSearch.js
//        node testVisualSearch.js --dir=./test-images --url=http://localhost:5000
//
// Outputs: overall accuracy, per-category accuracy, confusion matrix,
// retrieval Precision@K, rejection rate for negatives, latency stats,
// and visual-search-results.csv with one row per image.
//
// Requires Node 18+ (global fetch/FormData/Blob).
const fs = require("fs");
const path = require("path");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const DIR = arg("dir", path.join(__dirname, "test-images"));
const URL_BASE = arg("url", "http://localhost:5000").replace(/\/$/, "");
const ENGINE = arg("engine", "auto"); // auto | cnn | vlm  (benchmark both engines!)
const ENDPOINT = `${URL_BASE}/api/search/visual${ENGINE !== "auto" ? `?engine=${ENGINE}` : ""}`;
const NEGATIVE_FOLDER = "_not-clothing";
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function searchImage(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fd = new FormData();
  fd.append("image", new Blob([buf], { type: MIME[ext] || "image/jpeg" }), path.basename(filePath));

  const start = Date.now();
  const res = await fetch(ENDPOINT, { method: "POST", body: fd });
  const ms = Date.now() - start;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return { data, ms };
}

const pct = (num, den) => (den === 0 ? "n/a" : ((100 * num) / den).toFixed(1) + "%");

(async () => {
  if (!fs.existsSync(DIR)) {
    console.error(`Test folder not found: ${DIR}`);
    console.error(`Create it with one subfolder per category (see comments at top of this file).`);
    process.exit(1);
  }

  const folders = fs
    .readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const cases = [];
  for (const folder of folders) {
    const files = fs
      .readdirSync(path.join(DIR, folder))
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
    for (const f of files) {
      cases.push({ trueLabel: folder, file: path.join(DIR, folder, f) });
    }
  }
  if (cases.length === 0) {
    console.error("No images found. Add .jpg/.png/.webp files inside category subfolders.");
    process.exit(1);
  }

  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Engine:   ${ENGINE}`);
  console.log(`Test set: ${cases.length} images across ${folders.length} folders\n`);

  const rows = [];
  const latencies = [];
  // confusion[true][predicted] = count
  const confusion = {};
  const bump = (t, p) => {
    confusion[t] = confusion[t] || {};
    confusion[t][p] = (confusion[t][p] || 0) + 1;
  };

  let done = 0;
  for (const c of cases) {
    let predicted, correct, precisionAtK = "", note = "";
    try {
      const { data, ms } = await searchImage(c.file);
      latencies.push(ms);

      const isNegative = c.trueLabel === NEGATIVE_FOLDER;
      const isCnn = data.engine === "cnn";
      // VLM returns analysis:null for non-clothing; CNN "rejects" by returning
      // zero products above the similarity threshold.
      const rejected = isCnn ? (data.products || []).length === 0 : !data.analysis;

      if (isNegative) {
        predicted = rejected ? NEGATIVE_FOLDER : data.analysis.category;
        correct = rejected;
      } else if (rejected) {
        predicted = "(rejected / no match)";
        correct = false;
      } else if (data.analysis) {
        // VLM engine: the model names a category directly
        predicted = data.analysis.category;
        correct = predicted === c.trueLabel;
        // Retrieval quality: of returned products, how many are the right category?
        const returned = data.products || [];
        if (returned.length > 0) {
          const relevant = returned.filter((p) => p.category === c.trueLabel).length;
          precisionAtK = (relevant / returned.length).toFixed(2);
        } else {
          precisionAtK = "0.00";
          note = "no products returned";
        }
      } else {
        // CNN engine: no category label — score by majority vote of the
        // categories among the returned (similarity-ranked) products.
        const returned = data.products || [];
        const votes = {};
        for (const p of returned) votes[p.category] = (votes[p.category] || 0) + 1;
        predicted = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || "(none)";
        correct = predicted === c.trueLabel;
        const relevant = returned.filter((p) => p.category === c.trueLabel).length;
        precisionAtK = returned.length ? (relevant / returned.length).toFixed(2) : "0.00";
        if (returned[0]?.similarity != null) note = `top sim ${returned[0].similarity}`;
      }
      bump(c.trueLabel, predicted);
      rows.push({ ...c, predicted, correct, ms, precisionAtK, note });
      done++;
      process.stdout.write(
        `[${String(done).padStart(3)}/${cases.length}] ${correct ? "OK  " : "MISS"} ` +
        `${c.trueLabel.padEnd(24)} -> ${String(predicted).padEnd(24)} ${ms}ms ` +
        `${path.basename(c.file)}\n`
      );
    } catch (err) {
      bump(c.trueLabel, "(error)");
      rows.push({ ...c, predicted: "(error)", correct: false, ms: "", precisionAtK: "", note: err.message });
      done++;
      console.log(`[${String(done).padStart(3)}/${cases.length}] ERR  ${c.trueLabel} ${path.basename(c.file)}: ${err.message}`);
    }
  }

  // ---------- Summary ----------
  const positives = rows.filter((r) => r.trueLabel !== NEGATIVE_FOLDER);
  const negatives = rows.filter((r) => r.trueLabel === NEGATIVE_FOLDER);
  const posCorrect = positives.filter((r) => r.correct).length;
  const negCorrect = negatives.filter((r) => r.correct).length;

  console.log("\n================ RESULTS ================\n");
  console.log(`Category accuracy (clothing images): ${posCorrect}/${positives.length} = ${pct(posCorrect, positives.length)}`);
  if (negatives.length)
    console.log(`Non-clothing rejection accuracy:     ${negCorrect}/${negatives.length} = ${pct(negCorrect, negatives.length)}`);

  const pk = positives.map((r) => parseFloat(r.precisionAtK)).filter((n) => !isNaN(n));
  if (pk.length)
    console.log(`Mean retrieval Precision@K:          ${(pk.reduce((a, b) => a + b, 0) / pk.length).toFixed(2)}`);

  if (latencies.length) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const max = sorted[sorted.length - 1];
    console.log(`Latency: avg ${avg}ms | p95 ${p95}ms | max ${max}ms  ` +
      `(Vision 9.4 requirement: <= 7000ms -> ${max <= 7000 ? "PASS" : "FAIL"})`);
  }

  console.log("\nPer-category accuracy:");
  for (const folder of folders.filter((f) => f !== NEGATIVE_FOLDER)) {
    const rs = rows.filter((r) => r.trueLabel === folder);
    const ok = rs.filter((r) => r.correct).length;
    console.log(`  ${folder.padEnd(26)} ${ok}/${rs.length}  (${pct(ok, rs.length)})`);
  }

  console.log("\nConfusion matrix (rows = true, columns = predicted):");
  const predictedLabels = [...new Set(rows.map((r) => String(r.predicted)))].sort();
  const colW = Math.max(8, ...predictedLabels.map((l) => l.length)) + 2;
  console.log(" ".repeat(28) + predictedLabels.map((l) => l.padEnd(colW)).join(""));
  for (const t of folders) {
    const line = predictedLabels.map((p) => String(confusion[t]?.[p] || 0).padEnd(colW)).join("");
    console.log(t.padEnd(28) + line);
  }

  // ---------- CSV for the report appendix ----------
  const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    "file,true_category,predicted_category,correct,latency_ms,precision_at_k,note",
    ...rows.map((r) =>
      [path.basename(r.file), r.trueLabel, r.predicted, r.correct, r.ms, r.precisionAtK, r.note]
        .map(csvEscape).join(",")
    ),
  ].join("\n");
  const out = path.join(__dirname, `visual-search-results-${ENGINE}.csv`);
  fs.writeFileSync(out, csv);
  console.log(`\nDetailed results saved to: ${out}`);
})();