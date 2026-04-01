import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3000/api/cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from API on mount
  useEffect(() => {
    fetch(API_BASE)
      .then((res) => res.json())
      .then(setCartItems)
      .catch(() => {});
  }, []);

  const addItem = useCallback(async (productId, size) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, size }),
    });
    if (!res.ok) return;

    const saved = await res.json();

    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === saved.id);
      if (exists) {
        return prev.map((i) => (i.id === saved.id ? saved : i));
      }
      return [...prev, saved];
    });
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const res = await fetch(`${API_BASE}/${itemId}`, { method: 'DELETE' });
    if (!res.ok) return;
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateItem = useCallback(async (itemId, quantity) => {
    if (quantity < 1) return;
    const res = await fetch(`${API_BASE}/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) return;

    const saved = await res.json();
    setCartItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
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
