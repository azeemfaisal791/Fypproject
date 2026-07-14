// Seeds the men's-fashion catalog with ~50 curated products.
//
//   node seedProducts.js           -> adds products only if the DB is empty
//   node seedProducts.js --reset   -> deletes ALL products, then seeds fresh
//
// Every product has a UNIQUE, hand-verified image that actually matches its
// category (each URL was visually checked, not just tag-matched). Images come
// from Unsplash and Pexels (free-to-use licenses) as stable direct CDN links.
// After seeding, run `node embedProducts.js` to (re)build CNN visual-search
// vectors, since product IDs change on every reseed.
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

// Stable direct-CDN image helpers.
const UNS = (id) => `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`;
const PEX = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------- Curated catalog (name, category, price Rs, image, description) ----------------
const catalog = [
  // ---- T-Shirts ----
  ["White Crew Neck T-Shirt", "T-Shirts", 1299, UNS("1521572163474-6864f9cf17ab"),
    "Plain white crew-neck tee in soft combed cotton. Pre-shrunk everyday essential with a clean regular fit."],
  ["Black Minimal Print T-Shirt", "T-Shirts", 1499, UNS("1583743814966-8936f5b7be1a"),
    "Black cotton tee with a subtle minimal chest print. Breathable regular fit that holds shape wash after wash."],
  ["Sand Graphic Print T-Shirt", "T-Shirts", 1699, UNS("1576566588028-4147f3842f27"),
    "Sand-toned cotton tee with a bold front graphic print. Relaxed streetwear cut."],
  ["Black Chest-Logo T-Shirt", "T-Shirts", 1599, UNS("1618354691373-d851c5c3a990"),
    "Classic black tee with a small embroidered chest logo. Soft-washed cotton, regular fit."],
  ["Black Statement Graphic T-Shirt", "T-Shirts", 1799, UNS("1503341504253-dff4815485f1"),
    "Black cotton tee with a standout front graphic. Reinforced shoulder seams and an easy everyday fit."],

  // ---- Polo Shirts ----
  ["Black Classic Polo Shirt", "Polo Shirts", 1999, UNS("1625910513520-bed0389ce32f"),
    "Black pique-knit polo with a ribbed collar and two-button placket. Timeless smart-casual staple."],
  ["Red Pique Polo Shirt", "Polo Shirts", 2099, PEX(8068701),
    "Rich red pique polo with a tipped collar and embroidered logo. Tailored comfortable fit."],
  ["Sky Blue Polo Shirt", "Polo Shirts", 1999, PEX(17987935),
    "Soft sky-blue cotton polo with a clean ribbed collar. Lightweight and breathable for warm days."],
  ["Navy Colour-Block Polo Shirt", "Polo Shirts", 2299, PEX(10962177),
    "Navy polo with a bold vertical colour-block stripe. Stretch cotton with a modern slim cut."],
  ["Grey Palm-Print Polo Shirt", "Polo Shirts", 2199, PEX(9880321),
    "Grey marl polo with an all-over palm print and contrast tipping. Relaxed holiday-ready style."],
  ["Maroon Printed Polo Shirt", "Polo Shirts", 2199, PEX(9301162),
    "Maroon pique polo with a fine all-over micro-print. Smart-casual fit with a ribbed collar."],

  // ---- Casual Shirts ----
  ["Chambray Print Casual Shirt", "Casual Shirts", 2699, UNS("1596755094514-f87e34085b2c"),
    "Chambray button-down with a subtle all-over print. Brushed cotton that works for office and weekends."],
  ["Cotton Button-Down Shirt", "Casual Shirts", 2799, UNS("1602810318383-e386cc2a3ccf"),
    "Crisp cotton button-down shirt with a clean tailored cut. An everyday smart-casual essential."],
  ["Flannel Check Shirt", "Casual Shirts", 2999, UNS("1607345366928-199ea26cfe3e"),
    "Warm flannel shirt in a classic check pattern. Soft-washed for instant comfort, great as a layer."],
  ["Blue Striped Formal Shirt", "Casual Shirts", 2899, UNS("1620012253295-c15cc3e65df4"),
    "Light-blue fine-stripe shirt in wrinkle-resistant cotton. Sharp enough for the office, easy off the clock."],
  ["White Floral Print Shirt", "Casual Shirts", 2799, PEX(14941607),
    "White long-sleeve shirt with a bold red floral print. Standout piece for parties and summer evenings."],
  ["Red Textured Casual Shirt", "Casual Shirts", 2699, PEX(11100293),
    "Red slim-fit shirt with a fine textured weave. Sharp everyday styling with a chest pocket."],

  // ---- Trousers ----
  ["Slim-Fit Dress Trousers", "Trousers", 3199, UNS("1624378439575-d8705ad7ae80"),
    "Dark slim-fit trousers with a flat front and clean drape. A versatile smart-casual staple."],
  ["Khaki Chino Trousers", "Trousers", 2999, UNS("1473966968600-fa801b869a1a"),
    "Slim-fit khaki chinos with two-way stretch for all-day comfort. Everyday go-to trousers."],
  ["Black Slim Trousers", "Trousers", 3299, UNS("1584865288642-42078afe6942"),
    "Black slim-cut trousers with a tailored finish. Pairs easily with shirts and tees alike."],
  ["Grey Checked Trousers", "Trousers", 3399, PEX(2897539),
    "Grey Prince-of-Wales checked trousers with a smart tapered leg. A refined seasonal favourite."],
  ["Stone Chino Trousers", "Trousers", 2999, PEX(8350481),
    "Stone-beige cotton chinos with a relaxed straight cut. Lightweight and easy for warm weather."],
  ["Black Formal Dress Trousers", "Trousers", 3499, PEX(13339846),
    "Black formal trousers with a permanent crease and clean flat front. Wrinkle-resistant fabric."],

  // ---- Jeans ----
  ["Slim Fit Blue Jeans", "Jeans", 3499, UNS("1542272604-787c3835535d"),
    "Mid-wash slim-fit jeans with a touch of stretch. Five-pocket styling and durable stitching."],
  ["Dark Wash Jeans", "Jeans", 3699, UNS("1604176354204-9268737828e4"),
    "Dark-wash denim with a clean modern cut. Sturdy five-pocket build that ages beautifully."],
  ["Classic Blue Jeans", "Jeans", 3299, UNS("1565084888279-aca607ecce0c"),
    "Classic blue denim in a straight, everyday cut. A reliable wardrobe workhorse."],
  ["Stonewash Denim Jeans", "Jeans", 3599, PEX(10133278),
    "Stonewashed blue jeans with contrast top-stitching and a slight stretch. Comfortable regular fit."],
  ["Distressed Ripped Jeans", "Jeans", 3899, PEX(4258605),
    "On-trend ripped jeans in a faded blue wash. Slim tapered leg for a modern street look."],
  ["Grey Slim Jeans", "Jeans", 3499, PEX(27348257),
    "Grey slim-fit jeans with a soft hand-feel and slight stretch. Easy to dress up or down."],

  // ---- Shorts ----
  ["Denim Shorts", "Shorts", 1799, UNS("1591195853828-11db59a44f6b"),
    "Light-wash denim shorts with turn-up cuffs. Casual summer staple with a clean regular fit."],
  ["Navy Chino Shorts", "Shorts", 1699, PEX(25315887),
    "Navy chino shorts hitting just above the knee. Tailored look with a comfortable stretch waist."],
  ["Grey Jersey Shorts", "Shorts", 1599, PEX(15451651),
    "Soft grey jersey shorts with side pockets and a drawcord waist. Lounge or gym ready."],
  ["White Chino Shorts", "Shorts", 1799, PEX(24244688),
    "Crisp white chino shorts with a clean tailored cut. A sharp warm-weather choice."],
  ["Black Jersey Shorts", "Shorts", 1599, PEX(28038671),
    "Black jersey shorts with a tapered fit and elastic drawstring waist. Everyday casual comfort."],

  // ---- Hoodies & Sweatshirts ----
  ["Grey Pullover Hoodie", "Hoodies & Sweatshirts", 3199, UNS("1556821840-3a63f95609a7"),
    "Grey fleece pullover hoodie with a kangaroo pocket and lined hood. Soft and warm for daily wear."],
  ["Orange Pullover Hoodie", "Hoodies & Sweatshirts", 3299, UNS("1509942774463-acf339cf87d5"),
    "Bright orange pullover hoodie in mid-weight fleece. Bold everyday layering piece."],
  ["Charcoal Shawl-Neck Sweatshirt", "Hoodies & Sweatshirts", 3399, UNS("1506794778202-cad84cf45f1d"),
    "Charcoal shawl-collar knit sweatshirt with button detail. A smart alternative to the classic hoodie."],
  ["Cream Henley Hoodie", "Hoodies & Sweatshirts", 3299, PEX(5840463),
    "Cream open-collar henley hoodie in soft brushed cotton. Relaxed minimalist style."],
  ["Black Graphic Hoodie", "Hoodies & Sweatshirts", 3499, PEX(14241847),
    "Black pullover hoodie with a bold front graphic print. Streetwear-ready mid-weight fleece."],
  ["Stone Marl Hoodie", "Hoodies & Sweatshirts", 3199, PEX(7903989),
    "Stone marl pullover hoodie with a drawstring hood. Soft, breathable and easy to layer."],

  // ---- Jackets ----
  ["Black Leather Biker Jacket", "Jackets", 6999, UNS("1520975954732-35dd22299614"),
    "Biker-style black leather-look jacket with an asymmetric zip. A rugged statement layer."],
  ["Tan Bomber Jacket", "Jackets", 4999, UNS("1591047139829-d91aecb6caea"),
    "Lightweight tan bomber with a ribbed collar, cuffs and hem. Everyday layering essential."],
  ["Brown Sherpa Trucker Jacket", "Jackets", 5499, PEX(13132721),
    "Brown cotton trucker jacket with a cosy sherpa-lined collar. Warm, classic and hard-wearing."],
  ["Navy Puffer Jacket", "Jackets", 5999, PEX(11124833),
    "Quilted navy puffer with a hood and zip pockets. Warm without the bulk, water-repellent shell."],
  ["Red Check Flannel Shacket", "Jackets", 3999, PEX(14158219),
    "Red check flannel overshirt-jacket with a sherpa collar. The perfect mid-season shacket."],
  ["Teal Bomber Jacket", "Jackets", 4799, PEX(6461703),
    "Teal bomber jacket with a hooded liner and full zip. Casual everyday warmth with a pop of colour."],

  // ---- Sleeping Suits ----
  ["Black Pajama Set", "Sleeping Suits", 2499, PEX(20364765),
    "Two-piece black pajama set in soft satin-touch fabric with contrast piping. Long-sleeve top and full pants."],
  ["Striped Cotton Pajama Set", "Sleeping Suits", 2199, PEX(5904039),
    "Classic striped cotton pajama set with an elastic drawstring waist. Breathable for a comfortable night's sleep."],
  ["Teal Linen Night Suit", "Sleeping Suits", 2699, PEX(7191739),
    "Teal linen-blend night suit with a relaxed button-up top and easy pants. Airy and soft against the skin."],
  ["Lilac Loungewear Set", "Sleeping Suits", 2599, PEX(8053509),
    "Lilac cotton loungewear set with a cosy sweatshirt and matching joggers. Made for lazy days in."],
  ["Sage Loungewear Set", "Sleeping Suits", 2599, PEX(7191750),
    "Sage-green loungewear set in soft brushed cotton. Relaxed top and tapered lounge pants."],
];

const products = catalog.map(([name, category, price, image, description]) => ({
  name,
  category,
  price,
  image,
  description,
  stock: rand(8, 50),
}));

// ---------- optional image liveness check (warn only; never swaps images) ----------
async function verifyImages() {
  const urls = products.map((p) => p.image);
  console.log(`Verifying ${urls.length} image URLs...`);
  let dead = 0;
  await Promise.all(
    urls.map(async (url, i) => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (!res.ok) {
          dead++;
          console.warn(`  [WARN] ${res.status} -> ${products[i].name}: ${url}`);
        }
      } catch (e) {
        dead++;
        console.warn(`  [WARN] unreachable -> ${products[i].name}: ${url}`);
      }
    })
  );
  console.log(dead === 0 ? "All images reachable." : `${dead} image(s) need attention (see warnings above).`);
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
    console.log("\nDone. Next: run `node embedProducts.js` to build visual-search vectors.");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
})();
