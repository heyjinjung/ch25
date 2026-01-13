// src/admin/pages/SurveyResponsePage.tsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Users,
    ChevronLeft,
    Calendar,
    MessageSquare,
    RefreshCw,
    Search,
    ExternalLink,
    Table as TableIcon
} from "lucide-react";
import {
    fetchAdminSurveyResponses,
    fetchAdminSurveyDetail,
    AdminSurveyResponseItem
} from "../api/adminSurveyApi";

const SurveyResponsePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedResponse, setSelectedResponse] = useState<AdminSurveyResponseItem | null>(null);

    const { data: surveyDetail } = useQuery({
        queryKey: ["admin", "survey", id],
        queryFn: () => fetchAdminSurveyDetail(Number(id)),
    });

    const { data: responseData, isLoading, refetch } = useQuery({
        queryKey: ["admin", "survey", "responses", id],
        queryFn: () => fetchAdminSurveyResponses(Number(id)),
    });

    const responses = responseData?.items || [];
    const filteredResponses = responses.filter(r =>
        r.user_id.toString().includes(searchTerm) ||
        (r.username && r.username.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="h-10 w-10 text-admin-brand animate-spin" />
            </div>
        );
    }

    return (
        <section className="admin-page-container space-y-8 pb-20">
            <header className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admin/surveys")}
                        className="p-2 rounded-xl bg-admin-card border border-admin-border hover:bg-admin-hover transition-all"
                        aria-label="설문 목록으로"
                        title="설문 목록으로"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-admin-brand">
                            <Users className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Survey Responses</span>
                        </div>
                        <h1 className="text-2xl font-black text-admin-text-primary">
                            {surveyDetail?.title} - 응답 결과
                        </h1>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Respondents List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-muted" />
                            <input
                                type="text"
                                placeholder="사용자 ID 또는 닉네임 검색..."
                                className="admin-input w-full pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="btn-admin-secondary h-11 px-4"
                            title="새로고침"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="admin-card-premium overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="admin-table">
                                <thead>
                                    <tr className="admin-th">
                                        <th className="px-4 py-3.5 text-left">사용자</th>
                                        <th className="px-4 py-3.5 text-center">완료 시각</th>
                                        <th className="px-4 py-3.5 text-right">질문 수</th>
                                        <th className="px-4 py-3.5 text-center">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResponses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-10 text-center text-admin-text-muted text-xs">
                                                {searchTerm ? "검색 결과가 없습니다." : "아직 응답 데이터가 없습니다."}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResponses.map((item) => (
                                            <tr
                                                key={item.response_id}
                                                onClick={() => setSelectedResponse(item)}
                                                className={`admin-td cursor-pointer group hover:bg-admin-brand/5 ${selectedResponse?.response_id === item.response_id ? "bg-admin-brand/10" : ""
                                                    }`}
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-admin-brand/20 flex items-center justify-center text-admin-brand font-black text-xs">
                                                            {item.username?.charAt(0) || "U"}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-admin-text-primary font-bold text-xs">{item.username || "알 수 없음"}</span>
                                                            <span className="text-[10px] text-admin-text-muted font-mono">UID: {item.user_id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-admin-text-secondary text-[10px] tabular-nums">
                                                            {new Date(item.completed_at).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-admin-text-muted text-[9px] tabular-nums">
                                                            {new Date(item.completed_at).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-admin-text-primary font-black tabular-nums">{item.answers.length}</span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        className="p-2 rounded-lg hover:bg-admin-brand/20 text-admin-brand group-hover:scale-110 transition-all"
                                                        aria-label="응답 상세 보기"
                                                        title="응답 상세 보기"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Col: Details / Answers */}
                <div className="lg:col-span-1">
                    {selectedResponse ? (
                        <div className="admin-card-premium p-6 space-y-8 sticky top-8 animate-in slide-in-from-right-4">
                            <header className="flex items-center gap-4 border-b border-admin-border pb-6">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-admin-brand to-admin-brand/50 flex items-center justify-center text-white font-black text-xl shadow-admin-glow">
                                    {selectedResponse.username?.charAt(0) || "U"}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-admin-text-primary">{selectedResponse.username || "익명 사용자"}</h3>
                                    <p className="text-xs text-admin-text-muted flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> {new Date(selectedResponse.completed_at).toLocaleString()}
                                    </p>
                                </div>
                            </header>

                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-admin-brand uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" /> 답변 내역
                                </h4>

                                <div className="space-y-4">
                                    {selectedResponse.answers.map((ans, idx) => {
                                        const question = surveyDetail?.questions.find((q: any) => q.id === ans.question_id);
                                        return (
                                            <div key={idx} className="bg-admin-sidebar/40 rounded-xl p-4 border border-admin-border/50">
                                                <p className="text-[10px] text-admin-text-muted mb-1 font-black">
                                                    질문 {idx + 1}: {question?.title || `ID ${ans.question_id}`}
                                                </p>
                                                <div className="text-xs text-admin-text-primary font-medium leading-relaxed">
                                                    {(ans as any).option_label || ans.answer_text || <span className="text-admin-danger/50 italic">답변 없음</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="admin-card-premium p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
                            <div className="h-16 w-16 rounded-full bg-admin-sidebar flex items-center justify-center text-admin-text-muted">
                                <TableIcon className="h-8 w-8 opacity-20" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-admin-text-secondary">응답 정보를 선택하세요</p>
                                <p className="text-[10px] text-admin-text-muted mt-1">왼쪽 목록에서 사용자를 클릭하면<br />상세 답변 내역을 확인할 수 있습니다.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default SurveyResponsePage;
