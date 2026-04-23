import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'scylla_cart';
const CartContext = createContext(null);

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(cartItems);
  }, [cartItems]);

  const addItem = useCallback((productId, size, stock = Infinity) => {
    setCartItems((prev) => {
      if (stock <= 0) return prev;
      const existing = prev.find(
        (i) => i.product_id === productId && i.size === size
      );
      if (existing) {
        if (existing.quantity >= stock) return prev;
        return prev.map((i) =>
          i.product_id === productId && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          id: `${productId}_${size}_${Date.now()}`,
          product_id: productId,
          size,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateItem = useCallback((itemId, quantity) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cartItems, addItem, removeItem, updateItem, clearCart, cartCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
