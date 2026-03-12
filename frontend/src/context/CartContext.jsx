import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { cartService } from "../services/cartService";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cartData, setCartData] = useState(null); // full cart from API
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCartData(null); return; }
    try {
      setLoading(true);
      const data = await cartService.get();
      setCartData(data);
    } catch {
      setCartData(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const itemCount = (cartData?.items || []).reduce((sum, it) => sum + (it.qty || 1), 0);

  // Legacy helpers kept for backward compat with any existing code
  const addToCart  = () => refresh();
  const removeFromCart = () => refresh();
  const clearCart  = () => refresh();

  return (
    <CartContext.Provider value={{ cart: cartData, itemCount, loading, refresh, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
