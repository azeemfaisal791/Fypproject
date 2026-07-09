// Moves the men's fashion catalog into MongoDB. Run once: node seedProducts.js
// (safe to re-run — it skips if products already exist)
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  { name: "Classic White T-Shirt", price: 1299, category: "T-Shirts", stock: 45, image: "https://picsum.photos/seed/whitetee/400/300", description: "Plain white crew-neck t-shirt in soft combed cotton. Everyday essential." },
  { name: "Black Graphic T-Shirt", price: 1599, category: "T-Shirts", stock: 30, image: "https://picsum.photos/seed/blacktee/400/300", description: "Black cotton t-shirt with minimal chest print. Regular fit." },
  { name: "Polo T-Shirt Navy", price: 1999, category: "T-Shirts", stock: 12, image: "https://picsum.photos/seed/polotee/400/300", description: "Navy blue polo with ribbed collar and two-button placket." },
  { name: "Striped Half-Sleeve T-Shirt", price: 1499, category: "T-Shirts", stock: 26, image: "https://picsum.photos/seed/stripetee/400/300", description: "Breathable striped tee, perfect for casual summer wear." },
  { name: "Cotton Chino Trousers", price: 2899, category: "Trousers", stock: 20, image: "https://picsum.photos/seed/chino/400/300", description: "Slim-fit khaki chinos with stretch for all-day comfort." },
  { name: "Formal Dress Trousers", price: 3499, category: "Trousers", stock: 14, image: "https://picsum.photos/seed/formaltrouser/400/300", description: "Charcoal formal trousers with flat front and crease finish." },
  { name: "Cargo Trousers Olive", price: 3199, category: "Trousers", stock: 9, image: "https://picsum.photos/seed/cargo/400/300", description: "Olive cargo trousers with six pockets and drawstring cuffs." },
  { name: "Slim Fit Blue Jeans", price: 3999, category: "Jeans & Pants", stock: 35, image: "https://picsum.photos/seed/bluejeans/400/300", description: "Mid-wash slim-fit denim with slight stretch." },
  { name: "Black Straight Jeans", price: 3799, category: "Jeans & Pants", stock: 18, image: "https://picsum.photos/seed/blackjeans/400/300", description: "Straight-cut black jeans, rigid denim, five pockets." },
  { name: "Jogger Pants Grey", price: 2299, category: "Jeans & Pants", stock: 40, image: "https://picsum.photos/seed/jogger/400/300", description: "Heather grey joggers with elastic waistband and tapered leg." },
  { name: "Printed Sleeping Suit", price: 2499, category: "Sleeping Suits", stock: 22, image: "https://picsum.photos/seed/sleepsuit1/400/300", description: "Two-piece printed night suit in soft jersey fabric." },
  { name: "Plain Cotton Night Suit", price: 2199, category: "Sleeping Suits", stock: 11, image: "https://picsum.photos/seed/sleepsuit2/400/300", description: "Plain cotton sleeping suit - half-sleeve top with pajama." },
  { name: "Checkered Pajama Set", price: 2699, category: "Sleeping Suits", stock: 28, image: "https://picsum.photos/seed/pajamaset/400/300", description: "Checkered flannel pajama set for a comfortable night's sleep." },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_ecommerce");
    const count = await Product.countDocuments();
    if (count > 0) {
      console.log(`Products already seeded (${count} in DB). Nothing to do.`);
    } else {
      await Product.insertMany(products);
      console.log(`Seeded ${products.length} products.`);
    }
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
})();