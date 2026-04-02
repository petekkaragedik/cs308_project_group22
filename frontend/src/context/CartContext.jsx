import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import mockProducts from '../data/mockProducts';

const STORAGE_KEY = 'scylla_cart';
const CartContext = createContext(null);

function getStock(productId) {
  const p = mockProducts.find((p) => p.id === productId);
  return p ? p.quantityInStock : 0;
}

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

  const addItem = useCallback((productId, size) => {
    setCartItems((prev) => {
      const stock = getStock(productId);
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
      if (stock <= 0) return prev;
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
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const stock = getStock(i.product_id);
        return { ...i, quantity: Math.min(quantity, stock) };
      })
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
