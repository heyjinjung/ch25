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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-emerald-800/50 bg-slate-900 p-6 text-slate-100 shadow-xl shadow-emerald-900/40">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Modal</p>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            className="rounded-full p-2 text-slate-300 transition hover:bg-slate-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="mt-4 text-sm text-slate-200">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

