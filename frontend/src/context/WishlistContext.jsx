import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const loadWishlist = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setWishlistIds(new Set());
      return;
    }
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setWishlistIds(new Set()); return; }
      const data = await res.json();
      setWishlistIds(new Set(data.map((p) => String(p.id))));
    } catch {
      setWishlistIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const addToWishlist = useCallback(async (productId) => {
    const token = sessionStorage.getItem('token');
    if (!token) return false;
    const pid = String(productId);
    setWishlistIds((prev) => new Set([...prev, pid]));
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: pid }),
      });
      if (!res.ok && res.status !== 409) {
        setWishlistIds((prev) => { const next = new Set(prev); next.delete(pid); return next; });
        return false;
      }
      return true;
    } catch {
      setWishlistIds((prev) => { const next = new Set(prev); next.delete(pid); return next; });
      return false;
    }
  }, []);

  const removeFromWishlist = useCallback(async (productId) => {
    const token = sessionStorage.getItem('token');
    if (!token) return false;
    const pid = String(productId);
    setWishlistIds((prev) => { const next = new Set(prev); next.delete(pid); return next; });
    try {
      const res = await fetch(`/api/favorites/${pid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 404) {
        setWishlistIds((prev) => new Set([...prev, pid]));
        return false;
      }
      return true;
    } catch {
      setWishlistIds((prev) => new Set([...prev, pid]));
      return false;
    }
  }, []);

  const toggleWishlist = useCallback((productId) => {
    const pid = String(productId);
    if (wishlistIds.has(pid)) return removeFromWishlist(pid);
    return addToWishlist(pid);
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  const isWishlisted = useCallback((productId) => wishlistIds.has(String(productId)), [wishlistIds]);

  return (
    <WishlistContext.Provider value={{
      wishlistIds,
      wishlistCount: wishlistIds.size,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      loadWishlist,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
