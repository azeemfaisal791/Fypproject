const mongoose = require("mongoose");
const { PRODUCT_SIZES } = require("../utils/constants");

// Per-size inventory. Each entry is a size this product is offered in, with its
// own stock count. Orders reserve/return stock at this per-size level.
const sizeStockSchema = new mongoose.Schema(
  {
    size: { type: String, enum: PRODUCT_SIZES, required: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"], trim: true },
    description: { type: String, required: [true, "Description is required"] },
    price: { type: Number, required: [true, "Price is required"], min: [1, "Price must be positive"] },
    category: { type: String, required: [true, "Category is required"], trim: true },
    image: { type: String, default: "" },
    sizes: { type: [sizeStockSchema], default: [] },
    // Denormalized total across all sizes. Kept in sync with `sizes` on
    // create/update and on every per-size stock change, so the many existing
    // reads that use `product.stock` (cart, out-of-stock checks, admin table)
    // keep working unchanged.
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }, // soft delete keeps order history intact
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // CNN visual-search vector (Vision 5.3). Hidden by default — routes that
    // need it use .select("+imageEmbedding"). Never sent to the client
    // (visualSearchRoutes strips it before responding either way).
    imageEmbedding: { type: [Number], default: undefined, select: false },
  },
  {
    timestamps: true,
    // expose `id` (string) so the existing frontend (ProductCard, CartContext) keeps working
    toJSON: { virtuals: true },
  }
);

module.exports = mongoose.model("Product", productSchema);