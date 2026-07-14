const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"], trim: true },
    description: { type: String, required: [true, "Description is required"] },
    price: { type: Number, required: [true, "Price is required"], min: [1, "Price must be positive"] },
    category: { type: String, required: [true, "Category is required"], trim: true },
    image: { type: String, default: "" },
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