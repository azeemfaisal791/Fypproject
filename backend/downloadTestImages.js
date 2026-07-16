// Populates backend/test-images/ with a labeled test set for testVisualSearch.js
// — one subfolder per product category, each holding sample garment photos, plus
// a "_not-clothing" folder of negatives.
//
// IMPORTANT: these images come from loremflickr (Creative-Commons Flickr photos),
// a DIFFERENT source than the product catalog (which uses Unsplash/Pexels). That
// keeps the test set a proper HELD-OUT set — completely different images from the
// ones shown in the web app — so visual-search accuracy is measured honestly.
//
// Usage:
//   node downloadTestImages.js                 # 10 images per category
//   node downloadTestImages.js --per=8         # N per category
//   node downloadTestImages.js --keep          # don't clear existing files first
//
// Requires Node 18+ (global fetch).
const fs = require("fs");
const path = require("path");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};
const PER_CATEGORY = parseInt(arg("per", "10"), 10);
const KEEP = process.argv.includes("--keep"); // keep existing files (default: clean)
const OUT_DIR = path.join(__dirname, "test-images");

// Folder name (= product category, must match EXACTLY) -> loremflickr search tag.
const CATEGORY_TAGS = {
  "T-Shirts": "tshirt",
  "Polo Shirts": "polo,shirt",
  "Casual Shirts": "shirt",
  "Trousers": "trousers",
  "Jeans": "jeans",
  "Shorts": "shorts",
  "Hoodies & Sweatshirts": "hoodie",
  "Jackets": "jacket",
  "Sleeping Suits": "pajamas",
};

// Negatives (non-clothing) so the harness can measure rejection accuracy.
const NEGATIVE_TAGS = ["car", "food", "mountain", "laptop", "building"];

const IMG_EXT = ".jpg";
const MIN_BYTES = 2000; // guard against tiny error/placeholder responses

// loremflickr returns a deterministic image per (tag, lock); different locks =
// different photos. width/height fixed so files are comparable.
const url = (tag, lock) => `https://loremflickr.com/600/450/${encodeURIComponent(tag)}?lock=${lock}`;

async function download(tag, lock, dest) {
  const res = await fetch(url(tag, lock), { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) throw new Error(`too small (${buf.length}b)`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function clearFolder(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (/\.(jpe?g|png|webp)$/i.test(f)) fs.unlinkSync(path.join(dir, f));
  }
}

// Small concurrency pool so ~100 downloads don't run one-at-a-time.
async function pool(tasks, size = 6) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]().catch((e) => ({ error: e.message }));
    }
  });
  await Promise.all(workers);
  return results;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Build one download job per (folder, index). Each uses a unique lock so every
  // image in the whole set is different. A per-folder lock offset keeps images
  // in different categories from colliding.
  const jobs = [];
  const folders = [...Object.entries(CATEGORY_TAGS), ["_not-clothing", null]];
  folders.forEach(([folder, tag], folderIdx) => {
    const dir = path.join(OUT_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    if (!KEEP) clearFolder(dir);

    const isNeg = folder === "_not-clothing";
    const count = isNeg ? NEGATIVE_TAGS.length : PER_CATEGORY;
    for (let n = 0; n < count; n++) {
      const useTag = isNeg ? NEGATIVE_TAGS[n] : tag;
      // Unique lock per image across the entire set.
      const lock = 1000 + folderIdx * 100 + n;
      const dest = path.join(dir, `${String(n + 1).padStart(2, "0")}${IMG_EXT}`);
      jobs.push(() =>
        download(useTag, lock, dest).then(
          (bytes) => ({ folder, dest, bytes }),
          (e) => ({ folder, dest, error: e.message })
        )
      );
    }
  });

  console.log(`Downloading ${jobs.length} images into ${OUT_DIR}`);
  console.log(`Source: loremflickr (CC Flickr) — different from the catalog's Unsplash/Pexels images.\n`);

  const results = await pool(jobs);
  let ok = 0,
    fail = 0;
  const byFolder = {};
  for (const r of results) {
    byFolder[r.folder] = byFolder[r.folder] || { ok: 0, fail: 0 };
    if (r.error) {
      fail++;
      byFolder[r.folder].fail++;
      console.warn(`  FAIL ${path.basename(path.dirname(r.dest))}/${path.basename(r.dest)}: ${r.error}`);
    } else {
      ok++;
      byFolder[r.folder].ok++;
    }
  }

  console.log("\nPer-folder counts:");
  for (const [folder, c] of Object.entries(byFolder)) {
    console.log(`  ${folder.padEnd(24)} ${c.ok} images${c.fail ? `  (${c.fail} failed)` : ""}`);
  }
  console.log(`\nDone. ${ok} downloaded, ${fail} failed.`);
  console.log("Next:  node server.js   then   node testVisualSearch.js");
  if (fail) process.exitCode = 1;
}

run().catch((e) => {
  console.error("downloadTestImages failed:", e.message);
  process.exit(1);
});
