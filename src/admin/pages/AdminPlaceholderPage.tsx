import React from "react";
import { Construction } from "lucide-react";

interface AdminPlaceholderProps {
    title?: string;
    description?: string;
}

/**
 * A simple placeholder page for routes that are planned but not yet implemented.
 */
const AdminPlaceholderPage: React.FC<AdminPlaceholderProps> = ({ title, description }) => {
    return (
        <section className="admin-page-container">
            <div className="admin-card-premium flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-admin-warning/10 flex items-center justify-center text-admin-warning mb-6 border border-admin-warning/20">
                <Construction size={32} />
            </div>
            <h1 className="text-2xl font-bold text-admin-text-base mb-2">{title || "ê°œë°œ ?ˆì • ê¸°ëŠ¥"}</h1>
            <p className="text-admin-text-muted mb-8 text-center max-w-md leading-relaxed">
                {description ? (
                    description
                ) : (
                    <>
                        ?´ë‹¹ ê¸°ëŠ¥?€ ?„ì¬ UI/UX ê°œì„  ?¸ë™(ë¡œë“œë§????¬í•¨?˜ì–´ ?ˆìŠµ?ˆë‹¤.
                        <br />
                        ê³?êµ¬í˜„ ?ˆì •?´ë‹ˆ ? ì‹œë§?ê¸°ë‹¤?¤ì£¼?¸ìš”.
                    </>
                )}
            </p>
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="btn-admin-secondary px-6 py-2"
                    aria-label="?´ì „ ?˜ì´ì§€"
                    title="?´ì „ ?˜ì´ì§€"
                >
                    ?´ì „ ?˜ì´ì§€
                </button>
            </div>
            </div>
        </section>
    );
};

export default AdminPlaceholderPage;
