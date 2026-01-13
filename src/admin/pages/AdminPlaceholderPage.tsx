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
            <h1 className="text-2xl font-bold text-admin-text-base mb-2">{title || "개발 예정 기능"}</h1>
            <p className="text-admin-text-muted mb-8 text-center max-w-md leading-relaxed">
                {description ? (
                    description
                ) : (
                    <>
                        해당 기능은 현재 UI/UX 개선 트랙(로드맵)에 포함되어 있습니다.
                        <br />
                        곧 구현 예정이니 잠시만 기다려주세요.
                    </>
                )}
            </p>
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="btn-admin-secondary px-6 py-2"
                    aria-label="이전 페이지"
                    title="이전 페이지"
                >
                    이전 페이지
                </button>
            </div>
            </div>
        </section>
    );
};

export default AdminPlaceholderPage;
