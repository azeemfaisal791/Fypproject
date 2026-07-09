// Seeds ~100 men's fashion products with real product images.
//
//   node seedProducts.js           -> adds products only if DB is empty
//   node seedProducts.js --reset   -> deletes ALL products, then seeds fresh
//
// Every image URL is verified with a real HTTP request before inserting.
// Dead links automatically fall back to a category-matched image, so no
// product ever ends up with a broken or irrelevant picture.
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const U = (id) => `https://images.unsplash.com/${id}?w=600&q=80&auto=format&fit=crop`;

// Real Unsplash menswear photos, grouped per category (free-to-use license)
const IMG = {
  "T-Shirts": [
    U("photo-1521572163474-6864f9cf17ab"),
    U("photo-1583743814966-8936f5b7be1a"),
    U("photo-1576566588028-4147f3842f27"),
    U("photo-1618354691373-d851c5c3a990"),
    U("photo-1503341504253-dff4815485f1"),
    U("photo-1562157873-818bc0726f68"),
  ],
  "Polo Shirts": [
    U("photo-1625910513520-bed0389ce32f"),
    U("photo-1626497764746-6dc36546b388"),
    U("photo-1553143820-6bb68bc34679"),
    U("photo-1523381210434-271e8be1f52b"),
  ],
  "Casual Shirts": [
    U("photo-1596755094514-f87e34085b2c"),
    U("photo-1602810318383-e386cc2a3ccf"),
    U("photo-1607345366928-199ea26cfe3e"),
    U("photo-1620012253295-c15cc3e65df4"),
    U("photo-1489987707025-afc232f7bdaf"),
  ],
  Trousers: [
    U("photo-1594938298603-c8148c4dae35"),
    U("photo-1624378439575-d8705ad7ae80"),
    U("photo-1473966968600-fa801b869a1a"),
    U("photo-1552374196-1ab2a1c593e8"),
  ],
  Jeans: [
    U("photo-1542272604-787c3835535d"),
    U("photo-1541099649105-f69ad21f3246"),
    U("photo-1584865288642-42078afe6942"),
    U("photo-1604176354204-9268737828e4"),
  ],
  Shorts: [
    U("photo-1591195853828-11db59a44f6b"),
    U("photo-1565084888279-aca607ecce0c"),
    U("photo-1617113930975-f9c7243ae527"),
  ],
  "Hoodies & Sweatshirts": [
    U("photo-1556821840-3a63f95609a7"),
    U("photo-1434389677669-e08b4cac3105"),
    U("photo-1509942774463-acf339cf87d5"),
    U("photo-1520975954732-35dd22299614"),
  ],
  Jackets: [
    U("photo-1551028719-00167b16eac5"),
    U("photo-1591047139829-d91aecb6caea"),
    U("photo-1548126032-079a0fb0099d"),
    U("photo-1506794778202-cad84cf45f1d"),
  ],
  "Sleeping Suits": [
    U("photo-1616627561950-9f746e330187"),
    U("photo-1631049307264-da0ec9d70304"),
    U("photo-1522771739844-6a9f6d5f14af"),
  ],
};

// If an Unsplash link is ever dead, fall back to a keyword-matched image
// so the picture stays relevant to the category.
const FALLBACK = {
  "T-Shirts": "https://loremflickr.com/600/450/tshirt,menswear",
  "Polo Shirts": "https://loremflickr.com/600/450/polo,shirt",
  "Casual Shirts": "https://loremflickr.com/600/450/shirt,menswear",
  Trousers: "https://loremflickr.com/600/450/trousers,menswear",
  Jeans: "https://loremflickr.com/600/450/jeans,denim",
  Shorts: "https://loremflickr.com/600/450/shorts,menswear",
  "Hoodies & Sweatshirts": "https://loremflickr.com/600/450/hoodie",
  Jackets: "https://loremflickr.com/600/450/jacket,menswear",
  "Sleeping Suits": "https://loremflickr.com/600/450/pajamas",
};

// ---------- product data (built combinatorially -> ~100 items) ----------
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const products = [];
let imgCounter = {};
const nextImg = (cat) => {
  imgCounter[cat] = (imgCounter[cat] || 0) + 1;
  const pool = IMG[cat];
  return pool[imgCounter[cat] % pool.length];
};
const add = (category, name, price, description) =>
  products.push({ name, category, price, description, image: nextImg(category), stock: rand(5, 50) });

// T-Shirts (16)
for (const color of ["White", "Black", "Navy", "Heather Grey"]) {
  add("T-Shirts", `${color} Crew Neck T-Shirt`, rand(1199, 1499), `Soft combed-cotton crew neck t-shirt in ${color.toLowerCase()}. Pre-shrunk, breathable, everyday regular fit.`);
  add("T-Shirts", `${color} V-Neck T-Shirt`, rand(1299, 1599), `Lightweight ${color.toLowerCase()} v-neck tee with a clean modern cut. Holds shape wash after wash.`);
}
for (const color of ["Black", "Olive", "Maroon", "Navy"]) {
  add("T-Shirts", `${color} Graphic Print T-Shirt`, rand(1499, 1899), `${color} cotton tee with a minimal chest print. Regular fit with reinforced shoulder seams.`);
  add("T-Shirts", `${color} Striped Half-Sleeve T-Shirt`, rand(1399, 1799), `Breathable striped half-sleeve tee in ${color.toLowerCase()} tones. Perfect for casual summer wear.`);
}

// Polo Shirts (12)
for (const color of ["Navy", "Black", "White", "Maroon", "Olive", "Sky Blue"]) {
  add("Polo Shirts", `${color} Classic Polo Shirt`, rand(1899, 2299), `${color} pique-knit polo with ribbed collar and two-button placket. Classic comfortable fit.`);
  add("Polo Shirts", `${color} Slim Fit Polo Shirt`, rand(1999, 2499), `Slim-fit ${color.toLowerCase()} polo in stretch cotton. Tailored through the chest and sleeves.`);
}

// Casual Shirts (12)
for (const color of ["Light Blue", "White", "Pink"])
  add("Casual Shirts", `${color} Oxford Shirt`, rand(2499, 2999), `${color} oxford button-down shirt in brushed cotton. Works for office and weekends alike.`);
for (const color of ["Red-Black", "Green-Navy", "Grey-Black"])
  add("Casual Shirts", `${color} Flannel Check Shirt`, rand(2699, 3199), `Warm flannel shirt in a ${color.toLowerCase()} check pattern. Soft-washed for instant comfort.`);
for (const color of ["Beige", "White", "Olive"])
  add("Casual Shirts", `${color} Linen Shirt`, rand(2799, 3499), `Airy ${color.toLowerCase()} linen-blend shirt, ideal for hot weather. Relaxed cut with chest pocket.`);
for (const color of ["Mid Wash", "Dark Wash", "Black"])
  add("Casual Shirts", `${color} Denim Shirt`, rand(2899, 3499), `Rugged ${color.toLowerCase()} denim shirt with snap buttons and twin chest pockets.`);

// Trousers (12)
for (const color of ["Khaki", "Navy", "Olive", "Black"])
  add("Trousers", `${color} Chino Trousers`, rand(2699, 3199), `Slim-fit ${color.toLowerCase()} chinos with two-way stretch for all-day comfort.`);
for (const color of ["Charcoal", "Black", "Grey"])
  add("Trousers", `${color} Formal Dress Trousers`, rand(3299, 3899), `${color} formal trousers with flat front and permanent crease finish. Wrinkle-resistant fabric.`);
for (const color of ["Olive", "Beige"])
  add("Trousers", `${color} Cargo Trousers`, rand(2999, 3499), `${color} cargo trousers with six pockets and drawstring cuffs. Built for utility.`);
for (const color of ["Grey", "Black", "Navy"])
  add("Trousers", `${color} Jogger Pants`, rand(2199, 2699), `${color} joggers with elastic waistband and tapered leg. Soft brushed interior.`);

// Jeans (12)
for (const fit of ["Slim Fit", "Straight", "Tapered", "Relaxed Fit"])
  for (const wash of ["Mid Blue", "Dark Blue", "Black"])
    add("Jeans", `${wash} ${fit} Jeans`, rand(3299, 4499), `${fit} jeans in ${wash.toLowerCase()} denim with slight stretch. Five-pocket styling, durable stitching.`);

// Shorts (8)
for (const color of ["Khaki", "Navy", "Grey", "Black"])
  add("Shorts", `${color} Chino Shorts`, rand(1699, 2199), `${color} chino shorts hitting just above the knee. Clean tailored look for summer.`);
for (const color of ["Black", "Grey", "Navy", "Olive"])
  add("Shorts", `${color} Jersey Shorts`, rand(1499, 1899), `Soft ${color.toLowerCase()} jersey shorts with side pockets and drawcord waist. Lounge or gym ready.`);

// Hoodies & Sweatshirts (12)
for (const color of ["Black", "Grey", "Navy", "Olive"])
  add("Hoodies & Sweatshirts", `${color} Pullover Hoodie`, rand(2999, 3699), `${color} fleece pullover hoodie with kangaroo pocket and lined hood.`);
for (const color of ["Black", "Charcoal", "Maroon", "Navy"])
  add("Hoodies & Sweatshirts", `${color} Zip-Up Hoodie`, rand(3199, 3999), `Full-zip ${color.toLowerCase()} hoodie in mid-weight fleece. Layers easily over tees.`);
for (const color of ["Grey", "Black", "Beige", "Navy"])
  add("Hoodies & Sweatshirts", `${color} Crew Sweatshirt`, rand(2799, 3399), `Classic ${color.toLowerCase()} crewneck sweatshirt with ribbed cuffs and hem.`);

// Jackets (8)
for (const [name, price, desc] of [
  ["Blue Denim Jacket", rand(4499, 5499), "Classic mid-wash denim trucker jacket with button front and chest pockets."],
  ["Black Denim Jacket", rand(4499, 5499), "Black denim jacket with a clean modern silhouette. Ages beautifully."],
  ["Black Faux Leather Jacket", rand(6499, 7999), "Biker-style faux leather jacket with asymmetric zip and quilted shoulders."],
  ["Brown Faux Leather Jacket", rand(6499, 7999), "Vintage-look brown faux leather jacket with snap collar."],
  ["Olive Bomber Jacket", rand(4999, 5999), "Lightweight olive bomber with ribbed collar, cuffs and hem."],
  ["Black Bomber Jacket", rand(4999, 5999), "All-black bomber jacket with sleeve pocket. Everyday layering piece."],
  ["Navy Puffer Jacket", rand(5999, 7499), "Quilted navy puffer with high collar and zip pockets. Warm without the bulk."],
  ["Black Puffer Jacket", rand(5999, 7499), "Matte black puffer jacket, water-repellent shell, packable design."],
]) add("Jackets", name, price, desc);

// Sleeping Suits (8)
for (const [name, price, desc] of [
  ["Printed Night Suit", rand(2299, 2699), "Two-piece printed night suit in soft jersey fabric. Half-sleeve top with full pajama."],
  ["Plain Cotton Night Suit", rand(1999, 2399), "Plain cotton sleeping suit - half-sleeve top with matching pajama."],
  ["Checkered Pajama Set", rand(2499, 2899), "Checkered flannel pajama set for a comfortable night's sleep."],
  ["Striped Pajama Set", rand(2399, 2799), "Classic striped cotton pajama set with elastic drawstring waist."],
  ["Navy Lounge Set", rand(2599, 2899), "Navy lounge tee and shorts set in breathable stretch cotton."],
  ["Grey Lounge Set", rand(2599, 2899), "Grey melange lounge set - relaxed tee with tapered lounge pants."],
  ["Black Sleep Shorts Set", rand(2199, 2599), "Black tee and sleep shorts combo in lightweight jersey."],
  ["Winter Flannel Night Suit", rand(2699, 2999), "Heavyweight flannel night suit to keep warm on cold nights."],
]) add("Sleeping Suits", name, price, desc);

// ---------- image verification ----------
async function verifyImages() {
  const unique = [...new Set(products.map((p) => p.image))];
  console.log(`Verifying ${unique.length} unique image URLs...`);
  const dead = new Set();
  await Promise.all(
    unique.map(async (url) => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (!res.ok) dead.add(url);
      } catch {
        dead.add(url);
      }
    })
  );
  if (dead.size) console.log(`${dead.size} image(s) unreachable -> using category fallback images for those.`);
  for (const p of products) {
    if (dead.has(p.image)) {
      // random=N keeps each product's fallback image distinct
      p.image = `${FALLBACK[p.category]}?random=${Math.floor(Math.random() * 1000)}`;
    }
  }
}

// ---------- run ----------
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce");
    const reset = process.argv.includes("--reset");

    if (reset) {
      const { deletedCount } = await Product.deleteMany({});
      console.log(`--reset: removed ${deletedCount} existing products.`);
    } else if (await Product.countDocuments()) {
      console.log("Products already exist. Run with --reset to wipe and reseed:");
      console.log("  node seedProducts.js --reset");
      process.exit(0);
    }

    await verifyImages();
    await Product.insertMany(products);

    const byCat = {};
    products.forEach((p) => (byCat[p.category] = (byCat[p.category] || 0) + 1));
    console.log(`\nSeeded ${products.length} products:`);
    Object.entries(byCat).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
    console.log("\nDone. NOTE: product IDs changed — clear old carts (the app now does this automatically).");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
})();