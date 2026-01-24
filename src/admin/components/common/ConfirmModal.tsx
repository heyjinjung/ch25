import React from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = "primary",
    confirmText = "?�인",
    cancelText = "취소",
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className={`relative w-full max-w-md bg-admin-card backdrop-blur-xl border border-admin-border rounded-admin-xl shadow-2xl overflow-hidden animate-scaleIn`}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${type === 'danger' ? 'bg-admin-danger/10 text-admin-danger' : 'bg-admin-brand/10 text-admin-brand'}`}>
                            {type === 'danger' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-admin-subtitle font-bold text-admin-text-primary mb-2">
                                {title}
                            </h3>
                            <p className="text-admin-body text-admin-text-secondary leading-relaxed break-keep">
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-admin-text-muted hover:bg-admin-hover hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 bg-admin-sidebar/50 border-t border-admin-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-admin-lg text-admin-text-secondary hover:bg-admin-hover hover:text-white transition-colors font-bold text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-admin-lg text-white font-bold text-sm shadow-lg transition-all active:scale-95 ${type === 'danger'
                                ? 'bg-admin-danger hover:brightness-110 shadow-admin-danger/20'
                                : 'bg-admin-brand hover:brightness-110 shadow-admin-glow'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
