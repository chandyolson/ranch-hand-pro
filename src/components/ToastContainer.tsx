import React from "react";
import { useChuteSideToast, ToastVariant } from "./ToastContext";

const variantStyles: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  success: { bg: "#E8F5E9", border: "#27AE60", text: "#1B5E20" },
  error: { bg: "#FFEBEE", border: "#E74C3C", text: "#B71C1C" },
  info: { bg: "#E3F2FD", border: "#2196F3", text: "#0D47A1" },
};

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useChuteSideToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => {
        const s = variantStyles[t.variant];
        return (
          <div
            key={t.id}
            className="rounded-xl font-inter flex items-center gap-3 pointer-events-auto shadow-md"
            style={{
              backgroundColor: s.bg,
              borderLeft: `3px solid ${s.border}`,
              color: s.text,
              padding: "12px 16px",
              maxWidth: 360,
              animation: "toastSlideIn 0.25s ease-out",
              width: "100%",
            }}
          >
            <span className="flex-1" style={{ fontSize: 13, fontWeight: 500 }}>{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              style={{ fontSize: 18, fontWeight: 300, color: s.text, opacity: 0.5, lineHeight: 1, cursor: "pointer", background: "none", border: "none" }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
