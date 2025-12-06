// src/components/common/ToastProvider.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  message: string;
  tone?: "success" | "error" | "info";
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (message: string, tone?: Toast["tone"]) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneClassMap: Record<NonNullable<Toast["tone"]>, string> = {
  success: "bg-emerald-700/80 border-emerald-400",
  error: "bg-red-800/80 border-red-400",
  info: "bg-slate-800/80 border-slate-500",
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, tone: Toast["tone"] = "info") => {
    const toast: Toast = { id: crypto.randomUUID(), message, tone };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => removeToast(toast.id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value = useMemo(() => ({ toasts, addToast, removeToast }), [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm text-slate-50 shadow-lg shadow-emerald-900/40 ${toneClassMap[toast.tone ?? "info"]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};

export default ToastProvider;

