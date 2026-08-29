import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function cartKey(userId) { return userId ? `tagg_cart_${userId}` : null; }
function wishlistKey(userId) { return userId ? `tagg_wishlist_${userId}` : null; }

function readIdList(key) {
  if (!key) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}
function writeIdList(key, ids) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify([...new Set(ids.map(String))]));
}

export function CartProvider({ children }) {
  const { auth } = useAuth();
  const userId = auth?.id;
  const [cartIds, setCartIds] = useState(() => readIdList(cartKey(userId)));
  const [wishlistIds, setWishlistIds] = useState(() => readIdList(wishlistKey(userId)));

  useEffect(() => {
    setCartIds(readIdList(cartKey(userId)));
    setWishlistIds(readIdList(wishlistKey(userId)));
  }, [userId]);

  const persistCart = useCallback((ids) => {
    writeIdList(cartKey(userId), ids);
    setCartIds([...new Set(ids.map(String))]);
  }, [userId]);
  const persistWishlist = useCallback((ids) => {
    writeIdList(wishlistKey(userId), ids);
    setWishlistIds([...new Set(ids.map(String))]);
  }, [userId]);

  const addToCart = useCallback((id) => {
    setCartIds((prev) => {
      if (prev.includes(String(id))) return prev;
      const next = [...prev, String(id)];
      writeIdList(cartKey(userId), next);
      return next;
    });
    setWishlistIds((prev) => {
      if (!prev.includes(String(id))) return prev;
      const next = prev.filter((x) => x !== String(id));
      writeIdList(wishlistKey(userId), next);
      return next;
    });
  }, [userId]);

  const removeFromCart = useCallback((id) => {
    setCartIds((prev) => {
      const next = prev.filter((x) => x !== String(id));
      writeIdList(cartKey(userId), next);
      return next;
    });
  }, [userId]);

  const addToWishlist = useCallback((id) => {
    setWishlistIds((prev) => {
      if (prev.includes(String(id))) return prev;
      const next = [...prev, String(id)];
      writeIdList(wishlistKey(userId), next);
      return next;
    });
  }, [userId]);

  const removeFromWishlist = useCallback((id) => {
    setWishlistIds((prev) => {
      const next = prev.filter((x) => x !== String(id));
      writeIdList(wishlistKey(userId), next);
      return next;
    });
  }, [userId]);

  const isInCart = useCallback((id) => cartIds.includes(String(id)), [cartIds]);
  const isInWishlist = useCallback((id) => wishlistIds.includes(String(id)), [wishlistIds]);

  return (
    <CartContext.Provider
      value={{
        cartIds, wishlistIds,
        addToCart, removeFromCart, addToWishlist, removeFromWishlist,
        isInCart, isInWishlist,
        setCartIds: persistCart, setWishlistIds: persistWishlist,
        cartCount: cartIds.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
