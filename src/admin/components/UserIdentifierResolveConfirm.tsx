import React from "react";
import {
  UserCheck,
  AlertTriangle,
  Check,
  X,
  User,
  ArrowRight
} from "lucide-react";

interface UserSummary {
  id: number;
  external_id: string;
  telegram_username?: string;
  nickname?: string;
}

interface UserIdentifierResolveConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (user: UserSummary) => void;
  user: UserSummary;
  identifier: string;
}

const UserIdentifierResolveConfirm: React.FC<UserIdentifierResolveConfirmProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  identifier
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="admin-card w-full max-w-md shadow-admin-glow border-admin-brand/30">

        {/* Warning Icon & Header */}
        <div className="p-8 pb-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-admin-brand/10 text-admin-brand flex items-center justify-center mb-4 border border-admin-brand/20">
            <UserCheck size={32} />
          </div>
          <h2 className="text-admin-subtitle text-admin-text-primary">회원 정보 확인</h2>
          <p className="text-admin-meta text-admin-text-muted mt-1">
            입력하신 식별자로 다음 회원이 조회되었습니다.
          </p>
        </div>

        {/* Info Box */}
        <div className="px-8 py-6">
          <div className="p-4 rounded-xl bg-admin-sidebar/50 border border-admin-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-admin-meta text-admin-text-muted">입력값</span>
              <span className="text-admin-body font-mono text-admin-brand bg-admin-brand/10 px-2 py-0.5 rounded">{identifier}</span>
            </div>

            <div className="flex justify-center py-1 opacity-30">
              <ArrowRight size={16} className="rotate-90" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-admin-bg border border-admin-border flex items-center justify-center text-admin-text-secondary">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-admin-body font-bold text-admin-text-primary">{user.nickname || "N/A"}</p>
                  <p className="text-admin-meta text-admin-text-muted">UID: {user.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-admin-bg/50 border border-admin-border/50">
                  <p className="text-[10px] text-admin-text-muted uppercase font-bold mb-1">External ID</p>
                  <p className="text-admin-meta font-mono truncate">{user.external_id}</p>
                </div>
                <div className="p-3 rounded-lg bg-admin-bg/50 border border-admin-border/50">
                  <p className="text-[10px] text-admin-text-muted uppercase font-bold mb-1">Telegram</p>
                  <p className="text-admin-meta truncate">@{user.telegram_username || "None"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-8 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="btn-admin-secondary flex-1 border-none"
          >
            <X size={18} />
            취소
          </button>
          <button
            onClick={() => onConfirm(user)}
            className="btn-admin-primary flex-1 shadow-admin-glow"
          >
            <Check size={18} />
            이 회원으로 선택
          </button>
        </div>

        {/* Security Note */}
        <div className="px-8 pb-8 flex items-center justify-center gap-2 text-[11px] text-admin-text-muted opacity-60">
          <AlertTriangle size={12} />
          <span>잘못된 회원에게 지급되지 않도록 한 번 더 확인해 주세요.</span>
        </div>
      </div>
    </div>
  );
};

export default UserIdentifierResolveConfirm;
