import React, { createContext, useContext, useCallback } from "react";
import { toast as sonnerToast } from "sonner";

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export default function ToastProvider({ children }) {
  const show = useCallback((message, severity = "info") => {
    if (severity === "success") sonnerToast.success(message);
    else if (severity === "error") sonnerToast.error(message);
    else if (severity === "warning") sonnerToast.warning(message);
    else sonnerToast(message);
  }, []);

  const toastObj = {
    show,
    success: (m) => sonnerToast.success(m),
    info: (m) => sonnerToast(m),
    warning: (m) => sonnerToast.warning(m),
    error: (m) => sonnerToast.error(m),
  };

  return (
    <ToastCtx.Provider value={toastObj}>
      {children}
    </ToastCtx.Provider>
  );
}
