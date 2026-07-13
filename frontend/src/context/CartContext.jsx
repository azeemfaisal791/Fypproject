import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

// Valid MongoDB ObjectId = 24 hex chars.
const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(id || "");

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart")) || [];
      return saved.filter((i) => isValidId(i.id));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1) => {
    if (!isValidId(product.id)) return;
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...product, qty }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  // Reconcile the cart with the server's current catalog:
  // - items that no longer exist (deleted / reseeded / hidden) are removed
  // - price, name, image and stock are refreshed to current values
  // - quantities are clamped to available stock
  // Returns the names of removed items so the UI can tell the user.
  const syncItems = (serverProducts) => {
    const byId = new Map(
      serverProducts.map((p) => [String(p.id || p._id), p])
    );
    const removed = [];
    const next = [];
    for (const i of items) {
      const p = byId.get(String(i.id));
      if (!p || p.stock <= 0) {
        removed.push(i.name);
        continue;
      }
      next.push({
        ...i,
        name: p.name,
        price: p.price,
        image: p.image,
        stock: p.stock,
        qty: Math.min(i.qty, p.stock),
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