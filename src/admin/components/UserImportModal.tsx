
import React, { useState } from "react";
import { Upload, X, AlertTriangle } from "lucide-react";
import { importProfiles, ImportResult } from "../api/adminUserApi";
import { useToast } from "../../components/common/ToastProvider";

interface UserImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const UserImportModal: React.FC<UserImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { addToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null); // Reset previous result
        }
    };

    const handleUpload = async () => {
        if (!file) {
            addToast("파일을 선택해주세요.", "error");
            return;
        }

        setIsUploading(true);
        try {
            const res = await importProfiles(file);
            setResult(res);
            addToast(`처리 완료: ${res.success_count}건 성공`, "success");
            // Don't close immediately so user can see result
            if (res.success_count > 0) {
                onSuccess(); // Refresh parent list
            }
        } catch (err: any) {
            addToast(err.response?.data?.detail || "업로드 중 오류가 발생했습니다.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-lg border border-[#333333] bg-[#111111] shadow-xl">
                <header className="flex items-center justify-between border-b border-[#333333] px-6 py-4">
                    <h3 className="text-lg font-bold text-white">사용자 프로필 일괄 등록 (CSV)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 space-y-4">
                    <div className="rounded-md bg-[#1A1A1A] p-4 text-sm text-gray-300">
                        <p className="font-semibold text-white mb-1">CSV 파일 형식 안내</p>
                        <p className="opacity-80">헤더 필수: <code className="text-[#91F402]">external_id</code> 또는 <code className="text-[#91F402]">user_id</code></p>
                        <p className="opacity-80 mt-1">
                            가능한 컬럼: <br />
                            <code className="text-xs bg-black/30 px-1 py-0.5 rounded">real_name</code>,
                            <code className="text-xs bg-black/30 px-1 py-0.5 rounded">phone</code>,
                            <code className="text-xs bg-black/30 px-1 py-0.5 rounded">telegram</code>,
                            <code className="text-xs bg-black/30 px-1 py-0.5 rounded">tags (콤마구분)</code>,
                            <code className="text-xs bg-black/30 px-1 py-0.5 rounded">memo</code>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">파일 선택</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            className="block w-full text-sm text-gray-400
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-md file:border-0
                 file:text-sm file:font-semibold
                 file:bg-[#2D6B3B] file:text-white
                 hover:file:bg-[#91F402] hover:file:text-black
                 cursor-pointer"
                        />
                    </div>

                    {result && (
                        <div className="mt-4 rounded-md border border-[#333333] bg-[#000000] p-4 text-sm">
                            <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                <div className="bg-[#1A1A1A] py-2 rounded">
                                    <div className="text-gray-400 text-xs">전체</div>
                                    <div className="text-lg font-bold text-white">{result.total_processed}</div>
                                </div>
                                <div className="bg-[#1A1A1A] py-2 rounded border border-green-900/30">
                                    <div className="text-gray-400 text-xs">성공</div>
                                    <div className="text-lg font-bold text-[#91F402]">{result.success_count}</div>
                                </div>
                                <div className="bg-[#1A1A1A] py-2 rounded border border-red-900/30">
                                    <div className="text-gray-400 text-xs">실패</div>
                                    <div className="text-lg font-bold text-red-400">{result.failed_count}</div>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-red-300">
                                    {result.errors.map((err, i) => (
                                        <div key={i} className="flex items-start gap-1">
                                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className="flex justify-end gap-2 border-t border-[#333333] px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-[#333333] px-4 py-2 text-sm text-gray-300 hover:bg-[#1A1A1A]"
                    >
                        닫기
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? "업로드 중..." : (
                            <>
                                <Upload size={16} /> 업로드
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default UserImportModal;
