import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

// Valid MongoDB ObjectId = 24 hex chars.
const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(id || "");

// A cart line is identified by product + size (so M and L of the same product
// are separate lines). This key is what the UI and updateQty/removeItem use.
const lineKey = (id, size) => `${id}|${size}`;

// Stock available for a specific size of a product.
const stockForSize = (product, size) =>
  (product.sizes || []).find((s) => s.size === size)?.stock ?? 0;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart")) || [];
      // Require a valid id AND a chosen size. Items saved before the sizes
      // feature had no size and can no longer be ordered, so we drop them.
      return saved.filter((i) => isValidId(i.id) && i.size);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  // addItem(product, qty, size) — size is required now.
  const addItem = (product, qty = 1, size) => {
    if (!isValidId(product.id) || !size) return;
    const key = lineKey(product.id, size);
    const sizeStock = stockForSize(product, size);
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) {
        // Clamp to available stock for THIS size.
        const max = typeof found.stock === "number" ? found.stock : Infinity;
        return prev.map((i) => (i.key === key ? { ...i, qty: Math.min(i.qty + qty, max) } : i));
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          size,
          stock: sizeStock, // stock of the chosen size
          qty: Math.min(qty, sizeStock || Infinity),
        },
      ];
    });
  };

  const updateQty = (key, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const clearCart = () => setItems([]);

  // Reconcile the cart with the server's current catalog:
  // - items whose product no longer exists / is hidden are removed
  // - items whose chosen size no longer exists or is sold out are removed
  // - price, name, image and per-size stock are refreshed to current values
  // - quantities are clamped to the size's available stock
  // Returns the names (with size) of removed items so the UI can tell the user.
  const syncItems = (serverProducts) => {
    const byId = new Map(serverProducts.map((p) => [String(p.id || p._id), p]));
    const removed = [];
    const next = [];
    for (const i of items) {
      const p = byId.get(String(i.id));
      const sizeStock = p ? stockForSize(p, i.size) : 0;
      if (!p || sizeStock <= 0) {
        removed.push(`${i.name}${i.size ? ` (${i.size})` : ""}`);
        continue;
      }
      next.push({
        ...i,
        name: p.name,
        price: p.price,
        image: p.image,
        stock: sizeStock,
        qty: Math.min(i.qty, sizeStock),
      });
    }
    setItems(next);
    return removed;
  };

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clearCart, syncItems, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
