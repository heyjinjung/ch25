// src/components/common/Modal.tsx
import React from "react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ title, open, onClose, children }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pl-[calc(env(safe-area-inset-left)+0.5rem)] pr-[calc(env(safe-area-inset-right)+0.5rem)] sm:items-center sm:p-4 sm:pt-4 sm:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border border-admin-border bg-admin-sidebar p-4 text-admin-text-base shadow-xl shadow-black/40 sm:max-h-[90vh] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-admin-brand">Modal</p>
            <h3 className="text-lg sm:text-xl font-bold truncate text-admin-text-base">{title}</h3>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            className="shrink-0 rounded-full p-2 sm:p-2.5 text-admin-text-muted transition hover:bg-admin-element-hover active:scale-95 text-xl sm:text-base"
            onClick={onClose}
          >
            ??
          </button>
        </div>
        <div className="mt-3 sm:mt-4 text-sm text-admin-text-base">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

