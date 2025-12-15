// src/components/common/ToastProvider.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

const generateId = (): string => {
  // Use crypto.randomUUID when available; fall back to RFC4122-ish manual uuid or random string.
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto.getRandomValues === "function") {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
    }
  }
  return `toast-${Math.random().toString(16).slice(2)}`;
};

type Toast = {
  id: string;
  content: React.ReactNode;
  tone?: "success" | "error" | "info";
  durationMs?: number;
  dismissOnClick?: boolean;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (message: string, tone?: Toast["tone"]) => void;
  addToastNode: (content: React.ReactNode, options?: { tone?: Toast["tone"]; durationMs?: number; dismissOnClick?: boolean }) => void;
  addImageToast: (src: string, alt?: string, options?: { tone?: Toast["tone"]; width?: number; height?: number }) => void;
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
    const toast: Toast = { id: generateId(), content: message, tone, durationMs: 3000, dismissOnClick: true };
    setToasts((prev) => [...prev, toast]);
    if (toast.durationMs && toast.durationMs > 0) {
      setTimeout(() => removeToast(toast.id), toast.durationMs);
    }
  };

  const addToastNode: ToastContextValue["addToastNode"] = (content, options) => {
    const tone = options?.tone ?? "info";
    const durationMs = options?.durationMs;
    const dismissOnClick = options?.dismissOnClick ?? true;
    const toast: Toast = { id: generateId(), content, tone, durationMs, dismissOnClick };

    setToasts((prev) => [...prev, toast]);
    if (durationMs && durationMs > 0) {
      setTimeout(() => removeToast(toast.id), durationMs);
    }
  };

  const addImageToast: ToastContextValue["addImageToast"] = (src, alt, options) => {
    const width = options?.width ?? 400;
    const height = options?.height ?? 700;
    const tone = options?.tone ?? "info";

    addToastNode(
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-200">이미지 보기 (클릭하면 닫힘)</p>
        <img
          src={src}
          alt={alt ?? "toast image"}
          style={{ width, height, maxWidth: "100%", maxHeight: "70vh" }}
          className="max-w-full rounded-lg border border-slate-600/50 object-contain"
        />
      </div>,
      { tone, durationMs: 0, dismissOnClick: true }
    );
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value = useMemo(() => ({ toasts, addToast, addToastNode, addImageToast, removeToast }), [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-md flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (toast.dismissOnClick) removeToast(toast.id);
            }}
            onKeyDown={(e) => {
              if (!toast.dismissOnClick) return;
              if (e.key === "Enter" || e.key === " ") removeToast(toast.id);
            }}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm text-slate-50 shadow-lg shadow-emerald-900/40 ${toneClassMap[toast.tone ?? "info"]} ${toast.dismissOnClick ? "cursor-pointer" : ""}`}
          >
            {toast.content}
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

