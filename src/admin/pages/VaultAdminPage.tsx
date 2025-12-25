import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getVaultDefaultProgram,
    getVaultStats,
    updateVaultUnlockRules,
    updateVaultUiCopy,
    updateVaultConfig,
    tickVaultTransitions
} from "../api/adminVaultApi";
import { RefreshCcw, Save, AlertTriangle } from "lucide-react";

const VaultAdminPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"stats" | "rules" | "copy" | "config">("stats");

    const { data: program } = useQuery({
        queryKey: ["admin", "vault", "program"],
        queryFn: getVaultDefaultProgram,
    });

    const { data: stats } = useQuery({
        queryKey: ["admin", "vault", "stats"],
        queryFn: getVaultStats,
        refetchInterval: 30000,
    });

    const mutation = useMutation({
        mutationFn: async ({ type, json }: { type: string; json: any }) => {
            if (!program) return;
            if (type === "rules") return updateVaultUnlockRules(program.key, json);
            if (type === "copy") return updateVaultUiCopy(program.key, json);
            if (type === "config") return updateVaultConfig(program.key, json);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
            alert("변경사항이 저장되었습니다.");
        },
        onError: (err: any) => {
            alert(`저장 실패: ${err.message}`);
        }
    });

    const tickMutation = useMutation({
        mutationFn: tickVaultTransitions,
        onSuccess: (data) => {
            alert(`${data.updated}개의 금고 상태가 갱신되었습니다.`);
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "stats"] });
        }
    });

    const [rulesDraft, setRulesDraft] = useState("");
    const [copyDraft, setCopyDraft] = useState("");
    const [configDraft, setConfigDraft] = useState("");

    const handleTabChange = (tab: any) => {
        setActiveTab(tab);
        if (!program) return;
        if (tab === "rules") setRulesDraft(JSON.stringify(program.unlock_rules_json || {}, null, 2));
        if (tab === "copy") setCopyDraft(JSON.stringify(program.ui_copy_json || {}, null, 2));
        if (tab === "config") setConfigDraft(JSON.stringify(program.config_json || {}, null, 2));
    };

    const saveJson = (type: "rules" | "copy" | "config") => {
        let raw = "";
        if (type === "rules") raw = rulesDraft;
        if (type === "copy") raw = copyDraft;
        if (type === "config") raw = configDraft;

        try {
            const json = JSON.parse(raw);
            mutation.mutate({ type, json });
        } catch (e) {
            alert("올바른 JSON 형식이 아닙니다.");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#91F402]">금고(Vault) 운영 관리</h2>
                    <p className="text-sm text-gray-400">Phase 1 적립/해금 정책 및 문구 오버라이드 관리</p>
                </div>
                <button
                    onClick={() => tickMutation.mutate()}
                    disabled={tickMutation.isPending}
                    className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                    <RefreshCcw className={`h-4 w-4 ${tickMutation.isPending ? "animate-spin" : ""}`} />
                    만료 상태 강제 갱신 (Tick)
                </button>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-[#333] bg-[#111] p-4">
                    <p className="text-xs text-gray-500">오늘 총 적립 건수</p>
                    <p className="text-xl font-bold text-white">
                        {Object.values(stats?.today_accrual || {}).reduce((a, b) => a + b.count, 0)}건
                    </p>
                </div>
                <div className="rounded-lg border border-[#333] bg-[#111] p-4">
                    <p className="text-xs text-gray-500">오늘 총 해금액</p>
                    <p className="text-xl font-bold text-[#91F402]">
                        {stats?.today_unlock_cash.toLocaleString()}원
                    </p>
                </div>
                <div className="rounded-lg border border-[#333] bg-[#111] p-4">
                    <p className="text-xs text-gray-500">24H 내 만료 대상</p>
                    <p className="text-xl font-bold text-orange-400">
                        {stats?.expiring_soon_24h}명
                    </p>
                </div>
                <div className="rounded-lg border border-[#333] bg-[#111] p-4">
                    <p className="text-xs text-gray-500">설정 누락 스킵(Trial)</p>
                    <p className="text-xl font-bold text-red-500">
                        {Object.values(stats?.today_skips || {}).reduce((a, b) => a + b, 0)}건
                    </p>
                </div>
            </div>

            <div className="flex border-b border-[#333]">
                <button
                    onClick={() => handleTabChange("stats")}
                    className={`px-6 py-3 text-sm font-medium ${activeTab === "stats" ? "border-b-2 border-[#91F402] text-[#91F402]" : "text-gray-400"}`}
                >
                    실시간 지표
                </button>
                <button
                    onClick={() => handleTabChange("rules")}
                    className={`px-6 py-3 text-sm font-medium ${activeTab === "rules" ? "border-b-2 border-[#91F402] text-[#91F402]" : "text-gray-400"}`}
                >
                    해금 규칙 (Unlock JSON)
                </button>
                <button
                    onClick={() => handleTabChange("copy")}
                    className={`px-6 py-3 text-sm font-medium ${activeTab === "copy" ? "border-b-2 border-[#91F402] text-[#91F402]" : "text-gray-400"}`}
                >
                    UI 문구 (Copy JSON)
                </button>
                <button
                    onClick={() => handleTabChange("config")}
                    className={`px-6 py-3 text-sm font-medium ${activeTab === "config" ? "border-b-2 border-[#91F402] text-[#91F402]" : "text-gray-400"}`}
                >
                    운영 설정 (Config JSON)
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === "stats" && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-[#333] bg-[#111] p-6">
                            <h3 className="mb-4 font-bold text-white">오늘의 적립 상세</h3>
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-500">
                                        <th className="pb-2">타입</th>
                                        <th className="pb-2 text-right">건수</th>
                                        <th className="pb-2 text-right">금액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222]">
                                    {Object.entries(stats?.today_accrual || {}).map(([type, s]) => (
                                        <tr key={type}>
                                            <td className="py-2 text-gray-300">{type}</td>
                                            <td className="py-2 text-right text-white">{s.count.toLocaleString()}건</td>
                                            <td className="py-2 text-right text-[#91F402]">{s.total.toLocaleString()}원</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {Object.keys(stats?.today_skips || {}).length > 0 && (
                            <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-6">
                                <div className="flex items-center gap-2 text-red-400 mb-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    <h3 className="font-bold">설정 누락으로 인한 적립 누락 (SKIP)</h3>
                                </div>
                                <ul className="text-sm text-red-200/70">
                                    {Object.entries(stats?.today_skips || {}).map(([src, count]) => (
                                        <li key={src}>• {src}: {count}건 (trial_reward_valuation 설정 확인 필요)</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {(activeTab === "rules" || activeTab === "copy" || activeTab === "config") && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400">
                                JSON 형식을 지켜 입력해주세요. 빈 객체 `{ }` 전달 시 시스템 기본값이 적용됩니다.
                            </p>
                            <button
                                onClick={() => saveJson(activeTab)}
                                disabled={mutation.isPending}
                                className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black transition"
                            >
                                <Save className="h-4 w-4" />
                                적용하기
                            </button>
                        </div>
                        <textarea
                            className="h-[500px] w-full rounded-md border border-[#333] bg-[#0A0A0A] p-4 font-mono text-sm text-green-400 focus:outline-none focus:ring-1 focus:ring-[#91F402]"
                            value={activeTab === "rules" ? rulesDraft : activeTab === "copy" ? copyDraft : configDraft}
                            onChange={(e) => {
                                if (activeTab === "rules") setRulesDraft(e.target.value);
                                if (activeTab === "copy") setCopyDraft(e.target.value);
                                if (activeTab === "config") setConfigDraft(e.target.value);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default VaultAdminPage;
