import React, { createContext, useContext, useState, useRef, useCallback } from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (variant: ToastVariant, message: string) => void;
  dismissToast: (id: number) => void;
}

const ToastCtx = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((variant: ToastVariant, message: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, variant, message }]);
    setTimeout(() => dismissToast(id), 3500);
  }, [dismissToast]);

  return (
    <ToastCtx.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastCtx.Provider>
  );
};

export function useChuteSideToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useChuteSideToast must be used within ToastProvider");
  return ctx;
}
