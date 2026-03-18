import React, { createContext, useContext, useCallback } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }) {
  const value = {
    success: (m, d) => sonnerToast.success(m, { duration: d ?? 3000 }),
    error:   (m, d) => sonnerToast.error(m,   { duration: d ?? 3000 }),
    warning: (m, d) => sonnerToast.warning(m, { duration: d ?? 3000 }),
    info:    (m, d) => sonnerToast.info(m,    { duration: d ?? 3000 }),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "inherit" }, duration: 3000 }}
      />
    </ToastCtx.Provider>
  );
}
