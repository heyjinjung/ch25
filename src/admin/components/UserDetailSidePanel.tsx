import React from "react";
import { X, User, Phone, Shield, Calendar, History, Package, Ticket, ClipboardList, TrendingUp } from "lucide-react";
import { AdminUser } from "../api/adminUserApi";

interface UserDetailSidePanelProps {
    user: AdminUser | null;
    onClose: () => void;
}

/**
 * UserDetailSidePanel: IDE-Style
 */
const UserDetailSidePanel: React.FC<UserDetailSidePanelProps> = ({ user, onClose }) => {
    if (!user) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-admin-sidebar border-l border-admin-border shadow-2xl z-50 flex flex-col animate-slide-in">
            {/* Header */}
            <header className="px-5 py-3 border-b border-admin-border bg-admin-bg/40 backdrop-blur-md flex items-center justify-between h-[56px]">
                <div className="flex items-center gap-3">
                    <div className="text-admin-brand">
                        <User size={16} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-admin-body font-bold text-admin-text-primary">{user.nickname || "(닉네임 없음)"}</h2>
                        <span className="text-admin-mono text-admin-text-secondary font-mono">#{user.external_id}</span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-admin-lg border border-transparent hover:border-admin-border hover:bg-admin-hover text-admin-text-secondary hover:text-admin-text-primary transition-all duration-200 active:scale-[0.98]"
                    aria-label="닫기"
                    title="닫기"
                >
                    <X size={16} />
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-6">

                    {/* Status Section */}
                    <section className="grid grid-cols-2 gap-3">
                        <div className="admin-card p-4 flex flex-col justify-between h-[92px]">
                            <p className="text-admin-meta text-admin-text-secondary uppercase tracking-wider font-bold">상태</p>
                            <div className="flex items-center gap-2">
                                <span
                                    className={
                                        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-admin-meta font-bold " +
                                        (user.status === "ACTIVE"
                                            ? "bg-admin-accent/10 border-admin-accent/20 text-admin-accent"
                                            : "bg-admin-danger/10 border-admin-danger/20 text-admin-danger")
                                    }
                                >
                                    <span
                                        className={
                                            "h-2 w-2 rounded-full " +
                                            (user.status === "ACTIVE" ? "bg-admin-accent" : "bg-admin-danger")
                                        }
                                    />
                                    {user.status}
                                </span>
                            </div>
                        </div>
                        <div className="admin-card p-4 flex flex-col justify-between h-[92px]">
                            <p className="text-admin-meta text-admin-text-secondary uppercase tracking-wider font-bold">시즌 레벨</p>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-admin-brand" />
                                <span className="text-admin-subtitle text-admin-text-primary font-bold">LV.{user.season_level || user.level || 1}</span>
                            </div>
                        </div>
                    </section>

                    {/* Basic Info */}
                    <section>
                        <div className="mb-2 flex items-center gap-2 text-admin-text-secondary">
                            <Shield size={12} />
                            <h3 className="text-admin-meta font-bold uppercase tracking-wider">기본 프로필</h3>
                        </div>
                        <div className="admin-card p-5 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-admin-text-secondary">실명</span>
                                <span className="text-admin-text-primary font-semibold">{user.admin_profile?.real_name || "-"}</span>
                            </div>
                            <div className="w-full border-t border-admin-border/50" />
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-admin-text-secondary flex items-center gap-1"><Phone size={10} /> 연락처</span>
                                <span className="text-admin-text-primary font-semibold">{user.admin_profile?.phone_number || "-"}</span>
                            </div>
                            <div className="w-full border-t border-admin-border/50" />
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-admin-text-secondary">Telegram ID</span>
                                <span className="text-admin-text-primary font-mono font-semibold">{user.telegram_id || "-"}</span>
                            </div>
                            <div className="w-full border-t border-admin-border/50" />
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-admin-text-secondary">Telegram 사용자명</span>
                                <span className="text-admin-brand hover:underline cursor-pointer font-semibold">@{user.telegram_username?.replace(/^@/, "") || "-"}</span>
                            </div>
                        </div>
                    </section>

                    {/* Quick Actions */}
                    <section>
                        <div className="mb-2 flex items-center gap-2 text-admin-text-secondary">
                            <Package size={12} />
                            <h3 className="text-admin-meta font-bold uppercase tracking-wider">빠른 실행</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                className="admin-card p-3 flex flex-col items-center justify-center hover:bg-admin-hover transition-all duration-200 active:scale-[0.98] group"
                                title="지갑"
                                aria-label="지갑"
                            >
                                <Ticket size={16} className="text-admin-brand mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-admin-meta text-admin-text-primary">지갑</span>
                            </button>
                            <button
                                type="button"
                                className="admin-card p-3 flex flex-col items-center justify-center hover:bg-admin-hover transition-all duration-200 active:scale-[0.98] group"
                                title="인벤토리"
                                aria-label="인벤토리"
                            >
                                <ClipboardList size={16} className="text-admin-accent mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-admin-meta text-admin-text-primary">인벤토리</span>
                            </button>
                            <button
                                type="button"
                                className="admin-card p-3 flex flex-col items-center justify-center hover:bg-admin-hover transition-all duration-200 active:scale-[0.98] group"
                                title="로그"
                                aria-label="로그"
                            >
                                <History size={16} className="text-admin-warning mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-admin-meta text-admin-text-primary">로그</span>
                            </button>
                        </div>
                    </section>

                    {/* Memo */}
                    <section>
                        <div className="mb-2 flex items-center gap-2 text-admin-text-secondary">
                            <Calendar size={12} />
                            <h3 className="text-admin-meta font-bold uppercase tracking-wider">운영 메모</h3>
                        </div>
                        <div className="admin-card p-4">
                            <div className="flex flex-wrap gap-1 mb-2">
                                {(user.admin_profile?.tags || []).map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 rounded-full bg-admin-hover border border-admin-border/60 text-admin-meta text-admin-text-secondary font-bold"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                                <button
                                    type="button"
                                    className="px-2 py-1 rounded-full border border-dashed border-admin-border text-admin-meta text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-hover transition-colors font-bold"
                                    title="태그 추가"
                                >
                                    + 태그
                                </button>
                            </div>
                            <textarea
                                className="w-full bg-admin-sidebar/50 border border-admin-border rounded-admin-lg p-3 text-admin-body text-admin-text-primary transition-all focus:outline-none focus:ring-2 focus:ring-admin-brand/40 resize-none h-24 placeholder:text-admin-text-muted"
                                placeholder="운영 메모를 입력하세요..."
                                defaultValue={user.admin_profile?.memo}
                            />
                        </div>
                    </section>

                </div>
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-admin-border bg-admin-bg/40 backdrop-blur-md flex gap-2">
                <button type="button" className="btn-admin-secondary flex-1" title="정보 수정">
                    정보 수정
                </button>
                <button type="button" className="btn-admin-primary flex-1" title="보상 지급">
                    보상 지급
                </button>
            </footer>
        </div>
    );
};

export default UserDetailSidePanel;
