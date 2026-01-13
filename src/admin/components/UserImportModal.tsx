import React, { useState, useRef } from "react";
import {
    Upload,
    FileText,
    CheckCircle2,
    X,
    Loader2,
    Info
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "../api/httpClient";

interface UserImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserImportModal: React.FC<UserImportModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const { data } = await adminApi.post("/admin/api/crm/import-profiles", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return data;
        },
        onSuccess: (data) => {
            setImportResult(data);
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (err: any) => {
            alert(`임포트 실패: ${err.message}`);
        }
    });

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setImportResult(null);
        }
    };

    const resetState = () => {
        setFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="admin-card w-full max-w-xl flex flex-col shadow-admin-glow border-admin-brand/20">

                {/* Header */}
                <div className="p-6 border-b border-admin-border flex items-center justify-between bg-admin-sidebar/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-admin-brand/20 text-admin-brand">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h2 className="text-admin-subtitle text-admin-text-primary">회원 데이터 일괄 임포트</h2>
                            <p className="text-admin-meta text-admin-text-muted">CSV 파일을 통한 외부 회원 시스템 연동</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { resetState(); onClose(); }}
                        className="p-2 text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-hover rounded-lg transition-colors"
                        aria-label="닫기"
                        title="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {!importResult ? (
                        <>
                            {/* File Drop Zone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                  relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all
                  ${file ? "border-admin-brand bg-admin-brand/5" : "border-admin-border hover:border-admin-brand/40 hover:bg-admin-hover"}
                `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".csv"
                                    className="hidden"
                                    aria-label="CSV 파일 선택"
                                    title="CSV 파일 선택"
                                />
                                <div className={`p-4 rounded-full mb-4 ${file ? "bg-admin-brand text-white" : "bg-admin-sidebar text-admin-text-muted"}`}>
                                    <FileText size={32} />
                                </div>
                                {file ? (
                                    <div className="text-center">
                                        <p className="text-admin-body font-bold text-admin-text-primary">{file.name}</p>
                                        <p className="text-admin-meta text-admin-brand">파일이 선택되었습니다. 임포트 버튼을 누르세요.</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-admin-body font-bold text-admin-text-secondary">CSV 파일을 여기에 드래그하거나 클릭하세요.</p>
                                        <p className="text-admin-meta text-admin-text-muted mt-1">최대 용량 10MB / UTF-8 인코딩 권장</p>
                                    </div>
                                )}
                            </div>

                            {/* Guide Box */}
                            <div className="p-5 rounded-xl bg-admin-sidebar/40 border border-admin-border space-y-3">
                                <div className="flex items-center gap-2 text-admin-meta font-bold text-admin-text-primary">
                                    <Info size={16} className="text-admin-brand" />
                                    CSV 헤더 가이드 (필수/선택)
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 rounded bg-admin-brand/20 text-[11px] text-admin-brand border border-admin-brand/30">external_id (필수)</span>
                                    <span className="px-2 py-1 rounded bg-admin-sidebar text-[11px] text-admin-text-secondary border border-admin-border">real_name</span>
                                    <span className="px-2 py-1 rounded bg-admin-sidebar text-[11px] text-admin-text-secondary border border-admin-border">phone</span>
                                    <span className="px-2 py-1 rounded bg-admin-sidebar text-[11px] text-admin-text-secondary border border-admin-border">telegram</span>
                                    <span className="px-2 py-1 rounded bg-admin-sidebar text-[11px] text-admin-text-secondary border border-admin-border">tags</span>
                                    <span className="px-2 py-1 rounded bg-admin-sidebar text-[11px] text-admin-text-secondary border border-admin-border">memo</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Result View */
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="p-6 rounded-2xl bg-admin-sidebar/50 border border-admin-border flex items-center gap-6">
                                <div className="flex-1 text-center">
                                    <p className="text-admin-meta text-admin-text-muted uppercase font-bold mb-1">총 처리</p>
                                    <p className="text-admin-title text-admin-text-primary">{importResult.total_processed}</p>
                                </div>
                                <div className="w-px h-12 bg-admin-border" />
                                <div className="flex-1 text-center">
                                    <p className="text-admin-meta text-admin-accent uppercase font-bold mb-1">성공</p>
                                    <p className="text-admin-title text-admin-accent">{importResult.success_count}</p>
                                </div>
                                <div className="w-px h-12 bg-admin-border" />
                                <div className="flex-1 text-center">
                                    <p className="text-admin-meta text-admin-danger uppercase font-bold mb-1">실패</p>
                                    <p className="text-admin-title text-admin-danger">{importResult.failed_count}</p>
                                </div>
                            </div>

                            {importResult.errors?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-admin-meta font-bold text-admin-danger">발생한 오류 목록 (최근 10건)</p>
                                    <div className="p-4 rounded-xl bg-admin-danger/5 border border-admin-danger/10 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                        {importResult.errors.map((err: string, idx: number) => (
                                            <p key={idx} className="text-admin-meta text-admin-danger leading-tight flex gap-2">
                                                <span className="opacity-50">쨌</span> {err}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col items-center justify-center py-4">
                                <div className="w-16 h-16 rounded-full bg-admin-accent/20 text-admin-accent flex items-center justify-center mb-4">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-admin-subtitle text-admin-text-primary">가져오기 완료</h3>
                                <p className="text-admin-meta text-admin-text-muted mt-1 text-center">
                                    데이터 연동이 성공적으로 마무리되었습니다.<br />목록에서 확인해 주세요.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-admin-border bg-admin-sidebar/50 flex justify-end gap-3">
                    <button
                        onClick={() => { resetState(); onClose(); }}
                        className="btn-admin-secondary text-admin-meta px-4 border-none"
                    >
                        {importResult ? "확인 및 닫기" : "취소"}
                    </button>
                    {!importResult && file && (
                        <button
                            onClick={() => importMutation.mutate(file)}
                            disabled={importMutation.isPending}
                            className="btn-admin-primary min-w-[140px]"
                        >
                            {importMutation.isPending ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Upload size={18} />
                                    데이터 임포트 시작
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserImportModal;
