# `test-images/` — labeled test set for visual search

`testVisualSearch.js` uses this folder to measure the accuracy of the visual
search feature (category accuracy, retrieval Precision@K, non-clothing rejection
rate, and latency). If the folder is missing, the test aborts with
_"Test folder not found"_ — this file and its subfolders fix that.

## Structure

**One subfolder per product category**, and the folder name must match the
category **exactly** (spaces and `&` included). Each subfolder holds several
sample garment photos of that category:

```
test-images/
├── T-Shirts/                 several t-shirt photos
├── Polo Shirts/
├── Casual Shirts/
├── Trousers/
├── Jeans/
├── Shorts/
├── Hoodies & Sweatshirts/    (note: NOT just "Hoodies")
├── Jackets/
├── Sleeping Suits/
└── _not-clothing/            negatives — cars, food, scenery, etc.
```

The category names above are the live categories in the seeded catalog. Confirm
them any time with `GET /api/products/categories`. A folder whose name doesn't
match a real category will simply score as "wrong" in the confusion matrix.

`_not-clothing/` is optional but recommended: the harness reports how often the
engine correctly **rejects** images that aren't clothing.

## How to populate it

**One command.** From `backend/`:

```
node downloadTestImages.js            # 10 images per category
node downloadTestImages.js --per=8    # N per category
```

This downloads **held-out** images from loremflickr (Creative-Commons Flickr
photos) — a **different source** than the product catalog, which uses
Unsplash/Pexels. So the test images are genuinely different from the ones shown
in the web app, and visual-search accuracy is measured honestly (not against the
same images the CNN was indexed on). Re-running replaces the files; pass
`--keep` to leave existing files in place.

**Using your own photos instead.** You can also just drop your own images into
each category folder (7–8 per category is plenty) — phone photos, screenshots
from other stores, etc. Accepted formats: `.jpg`, `.jpeg`, `.png`, `.webp`.

## Running the test

```
# terminal 1
node server.js
# terminal 2
node testVisualSearch.js                 # auto engine
node testVisualSearch.js --engine=cnn    # force the CNN engine
node testVisualSearch.js --engine=vlm    # force the VLM engine
```

Results print to the console and are written to
`visual-search-results-<engine>.csv`.

> The image files themselves are intentionally **not committed to git** (see
> `.gitignore`) — only this structure and README are. Regenerate them with
> `downloadTestImages.js` or drop in your own.
