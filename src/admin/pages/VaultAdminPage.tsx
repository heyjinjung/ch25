import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getVaultDefaultProgram,
    getVaultStats,
    updateVaultUnlockRules,
    updateVaultUiCopy,
    updateVaultConfig,
    tickVaultTransitions,
    toggleVaultGameEarn,
    getVaultEligibility,
    setVaultEligibility,
    getVaultTimerState,
    postVaultTimerAction,
    VaultTimerState,
    fetchVaultStatsDetails,
    toggleVaultGlobalActive,
    setVaultUserBalance
} from "../api/adminVaultApi";
import { fetchUsers } from "../api/adminUserApi";
import { RefreshCcw, Save, AlertTriangle, ShieldCheck, Clock, Power, Search, Ban, User as UserIcon, Loader2, X, Activity, Edit2, Zap } from "lucide-react";
import clsx from "clsx";
import VaultRulesEditor from "../components/vault/VaultRulesEditor";
import VaultUiEditor from "../components/vault/VaultUiEditor";
import VaultSettingsEditor from "../components/vault/VaultSettingsEditor";
import VaultRequestManager from "../components/vault/VaultRequestManager";

const UserLookup: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const { data: users, isLoading } = useQuery({
        queryKey: ["admin", "users"],
        queryFn: () => fetchUsers(),
        enabled: isOpen,
        staleTime: 60000
    });

    const filtered = (users || []).filter(u => {
        const term = searchTerm.toLowerCase();
        return (
            String(u.id).includes(term) ||
            (u.external_id || "").toLowerCase().includes(term) ||
            (u.nickname || "").toLowerCase().includes(term)
        );
    }).slice(0, 5);

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || "User ID"}
                    className="w-36 rounded-md border border-[#333] bg-[#0A0A0A] px-3 py-2 text-sm text-gray-200 focus:border-[#91F402] focus:outline-none"
                />
                <button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) setSearchTerm("");
                    }}
                    className="p-2 rounded bg-[#222] text-gray-400 hover:text-white"
                    title="사용자 검색"
                >
                    <UserIcon size={16} />
                </button>
            </div>
            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-[#333] bg-[#1a1a1a] shadow-xl p-2">
                    <input
                        autoFocus
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ID/ExternalID/닉네임 검색"
                        className="w-full mb-2 rounded bg-[#000] border border-[#333] px-2 py-1 text-xs text-white"
                    />
                    <div className="space-y-1">
                        {isLoading && <div className="text-center py-2"><Loader2 className="animate-spin h-4 w-4 mx-auto text-gray-500" /></div>}
                        {!isLoading && filtered.length === 0 && <div className="text-xs text-center text-gray-500 py-2">검색 결과 없음</div>}
                        {filtered.map(u => (
                            <button
                                key={u.id}
                                onClick={() => {
                                    onChange(String(u.id));
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#333] text-xs"
                            >
                                <div className="text-[#91F402] font-bold">{u.telegram_username || u.nickname || u.external_id}</div>
                                <div className="text-gray-500">ID: {u.id} | Lv.{u.level}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const VaultAdminPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"stats" | "requests" | "rules" | "copy" | "config" | "ops">("stats");
    const [advancedMode, setAdvancedMode] = useState(false);
    const [gameEarnEnabled, setGameEarnEnabled] = useState<boolean>(true);
    const [eligibilityUserId, setEligibilityUserId] = useState<string>("");
    const [eligibilityResult, setEligibilityResult] = useState<{ user_id: number; eligible: boolean } | null>(null);
    const [timerUserId, setTimerUserId] = useState<string>("");
    const [timerState, setTimerState] = useState<VaultTimerState | null>(null);

    // New state for Stats Modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailType, setDetailType] = useState("");
    const [detailItems, setDetailItems] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // New state for Balance Update (absolute set)
    const [balanceLockedAmount, setBalanceLockedAmount] = useState<string>("");
    const [balanceAvailableAmount, setBalanceAvailableAmount] = useState<string>("");
    const [balanceReason, setBalanceReason] = useState("관리자 조정");

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

    const handleTabChange = (tab: "stats" | "rules" | "copy" | "config" | "ops") => {
        setActiveTab(tab);
        if (!program || tab === "stats" || tab === "ops") return;
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
        } catch {
            alert("올바른 JSON 형식이 아닙니다.");
        }
    };

    useEffect(() => {
        if (program) {
            setGameEarnEnabled(Boolean(program.config_json?.enable_game_earn_events ?? true));
        }
    }, [program]);

    const gameEarnMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            if (!program) throw new Error("프로그램 정보가 없습니다.");
            return toggleVaultGameEarn(program.key, enabled);
        },
        onSuccess: (data) => {
            setGameEarnEnabled(Boolean(data.config_json?.enable_game_earn_events ?? true));
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
            alert("게임 적립 토글이 저장되었습니다.");
        },
        onError: (err: any) => alert(`저장 실패: ${err.message}`)
    });

    const eligibilityLookup = useMutation({
        mutationFn: async (userId: number) => {
            if (!program) throw new Error("프로그램 정보가 없습니다.");
            return getVaultEligibility(program.key, userId);
        },
        onSuccess: (data) => setEligibilityResult(data),
        onError: (err: any) => alert(`조회 실패: ${err.message}`)
    });

    const eligibilityUpdate = useMutation({
        mutationFn: async (nextEligible: boolean) => {
            if (!program) throw new Error("프로그램 정보가 없습니다.");
            const userId = parseInt(eligibilityUserId || "0", 10);
            return setVaultEligibility(program.key, userId, nextEligible);
        },
        onSuccess: (data) => {
            setEligibilityResult(data);
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
            alert("자격 설정이 저장되었습니다.");
        },
        onError: (err: any) => alert(`저장 실패: ${err.message}`)
    });

    const timerLookup = useMutation({
        mutationFn: async (userId: number) => getVaultTimerState(userId),
        onSuccess: (data) => setTimerState(data),
        onError: (err: any) => alert(`조회 실패: ${err.message}`)
    });

    const timerAction = useMutation({
        mutationFn: async ({ userId, action }: { userId: number; action: "reset" | "expire_now" | "start_now" }) =>
            postVaultTimerAction(userId, action),
        onSuccess: (data) => {
            setTimerState(data);
            alert("타이머가 반영되었습니다.");
        },
        onError: (err: any) => alert(`처리 실패: ${err.message}`)
    });

    // New mutations
    const globalActiveMutation = useMutation({
        mutationFn: async (isActive: boolean) => {
            if (!program) throw new Error("프로그램 정보가 없습니다.");
            return toggleVaultGlobalActive(program.key, isActive);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
            alert("전역 활성 상태가 변경되었습니다.");
        },
        onError: (err: any) => alert(`변경 실패: ${err.message}`)
    });

    const balanceMutation = useMutation({
        mutationFn: async () => {
            const uid = parseInt(timerUserId || "0", 10);
            if (!uid) throw new Error("유저를 선택해주세요.");

            const lockedAmount = balanceLockedAmount.trim() === "" ? null : parseInt(balanceLockedAmount, 10);
            const availableAmount = balanceAvailableAmount.trim() === "" ? null : parseInt(balanceAvailableAmount, 10);

            if (lockedAmount !== null && (!Number.isFinite(lockedAmount) || lockedAmount < 0)) {
                throw new Error("Locked Amount는 0 이상의 정수여야 합니다.");
            }
            if (availableAmount !== null && (!Number.isFinite(availableAmount) || availableAmount < 0)) {
                throw new Error("Available Amount는 0 이상의 정수여야 합니다.");
            }

            if (lockedAmount === null && availableAmount === null) {
                throw new Error("Locked/Available 중 하나 이상 입력해주세요.");
            }

            await setVaultUserBalance(uid, lockedAmount, availableAmount, balanceReason);
        },
        onSuccess: () => {
            alert("잔액이 수정되었습니다.");
            // Refresh timer state to see changes
            if (timerUserId) timerLookup.mutate(parseInt(timerUserId));
        },
        onError: (err: any) => alert(`수정 실패: ${err.message}`)
    });

    const openDetailModal = (type: string) => {
        setDetailType(type);
        setShowDetailModal(true);
        setDetailLoading(true);
        fetchVaultStatsDetails(type).then(res => {
            setDetailItems(res.items);
            setDetailLoading(false);
        }).catch(() => {
            alert("상세 조회 실패");
            setShowDetailModal(false);
        });
    };

    return (
        <div className="space-y-6 pb-20">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#91F402]">금고(Vault) 운영 관리</h2>
                    <p className="text-sm text-gray-400">Phase 1 적립/해금 정책 및 문구 관리</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                    {!["stats", "ops"].includes(activeTab) && (
                        <button
                            onClick={() => setAdvancedMode(!advancedMode)}
                            className={`w-full px-3 py-1.5 rounded text-xs font-bold transition-colors sm:w-auto ${advancedMode ? "bg-[#91F402] text-black" : "bg-white/5 text-white/50 border border-white/10"
                                }`}
                        >
                            {advancedMode ? "일반 모드 (Form)" : "고급 모드 (JSON)"}
                        </button>
                    )}
                    <button
                        onClick={() => tickMutation.mutate()}
                        disabled={tickMutation.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
                    >
                        <RefreshCcw className={`h-4 w-4 ${tickMutation.isPending ? "animate-spin" : ""}`} />
                        상태 강제 갱신
                    </button>
                </div>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div
                    onClick={() => openDetailModal("today_accrual")}
                    className="rounded-lg border border-[#333] bg-[#111] p-4 text-center cursor-pointer hover:bg-[#1a1a1a] transition"
                >
                    <p className="text-xs text-gray-500 mb-1">오늘 총 적립 (상세보기)</p>
                    <p className="text-xl font-black text-white">
                        {Object.values(stats?.today_accrual || {}).reduce((a, b: any) => a + b.count, 0).toLocaleString()}건
                    </p>
                </div>
                <div
                    onClick={() => openDetailModal("today_unlock_cash")}
                    className="rounded-lg border border-[#333] bg-[#111] p-4 text-center cursor-pointer hover:bg-[#1a1a1a] transition"
                >
                    <p className="text-xs text-gray-500 mb-1">오늘 해금액 (상세보기)</p>
                    <p className="text-xl font-black text-[#91F402]">
                        {stats?.today_unlock_cash.toLocaleString()}원
                    </p>
                </div>
                <div
                    onClick={() => openDetailModal("expiring_soon_24h")}
                    className="rounded-lg border border-[#333] bg-[#111] p-4 text-center cursor-pointer hover:bg-[#1a1a1a] transition"
                >
                    <p className="text-xs text-gray-500 mb-1">24H내 만료 예정 (상세보기)</p>
                    <p className="text-xl font-black text-orange-400">
                        {stats?.expiring_soon_24h}명
                    </p>
                </div>
                <div className="rounded-lg border border-[#333] bg-[#111] p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">적립 누락(SKIP)</p>
                    <p className="text-xl font-black text-red-500">
                        {Object.values(stats?.today_skips || {}).reduce((a, b: any) => a + b, 0)}건
                    </p>
                </div>
            </div>

            {/* Stats Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl rounded-xl border border-[#333] bg-[#111] p-4 shadow-2xl animate-in zoom-in-50 duration-200 sm:p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-[#333] pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-[#91F402]" />
                                상세 내역 조회 ({detailType})
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                            {detailLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#91F402]" /></div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-[#111]">
                                        <tr className="text-gray-500 border-b border-[#222]">
                                            <th className="pb-2 px-2">User (External)</th>
                                            <th className="pb-2 px-2 text-right">Amount</th>
                                            <th className="pb-2 px-2 text-right">Time</th>
                                            <th className="pb-2 px-2 text-right">Meta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#222]">
                                        {detailItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/5">
                                                <td className="py-2 px-2">
                                                    <div className="text-white font-bold">{item.telegram_username || item.nickname || item.external_id || "Unknown"}</div>
                                                    <div className="text-xs text-gray-500">ID: {item.user_id} | {item.nickname}</div>
                                                </td>
                                                <td className="py-2 px-2 text-right font-mono text-[#91F402]">{item.amount.toLocaleString()}</td>
                                                <td className="py-2 px-2 text-right text-gray-400 text-xs">
                                                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : "-"}
                                                </td>
                                                <td className="py-2 px-2 text-right text-xs text-gray-500">
                                                    {JSON.stringify(item.meta || {})}
                                                </td>
                                            </tr>
                                        ))}
                                        {detailItems.length === 0 && (
                                            <tr><td colSpan={4} className="py-8 text-center text-gray-600">데이터가 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <nav className="flex items-center gap-1 border-b border-[#333] overflow-x-auto whitespace-nowrap">
                {[
                    { id: "stats", label: "실시간 지표" },
                    { id: "requests", label: "출금 요청" },
                    { id: "rules", label: "해금 규칙" },
                    { id: "copy", label: "UI 문구" },
                    { id: "config", label: "운영 파라미터" },
                    { id: "ops", label: "운영/통제" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as any)}
                        className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-bold transition-all relative sm:px-6 ${activeTab === tab.id
                            ? "text-[#91F402]"
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#91F402]" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="min-h-[400px]">
                {activeTab === "stats" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="rounded-xl border border-[#333] bg-[#111] p-4 shadow-xl sm:p-6">
                            <h3 className="mb-4 font-bold text-white flex items-center gap-2">
                                <RefreshCcw className="h-4 w-4 text-[#91F402]" />
                                오늘 적립 상세 내역
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-gray-500 border-b border-[#222]">
                                            <th className="pb-3 px-4">적립 사유</th>
                                            <th className="pb-3 px-4 text-right">트랜잭션</th>
                                            <th className="pb-3 px-4 text-right">누적 금액</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#222]">
                                        {Object.entries(stats?.today_accrual || {}).map(([type, s]: [string, any]) => (
                                            <tr key={type} className="group hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-4 font-medium text-gray-300">{type}</td>
                                                <td className="py-4 px-4 text-right text-white font-bold">{s.count.toLocaleString()}건</td>
                                                <td className="py-4 px-4 text-right text-[#91F402] font-black">{s.total.toLocaleString()}원</td>
                                            </tr>
                                        ))}
                                        {Object.keys(stats?.today_accrual || {}).length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-12 text-center text-gray-600">오늘 발생한 적립 내역이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {program?.enable_trial_payout_to_vault && Object.keys(stats?.today_skips || {}).length > 0 && (
                            <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-6">
                                <div className="flex items-center gap-2 text-red-500 mb-4">
                                    <AlertTriangle className="h-5 w-5" />
                                    <h3 className="font-extrabold">적립 누락 발생 (Valuation Missing)</h3>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(stats?.today_skips || {}).map(([src, count]: [string, any]) => (
                                        <div key={src} className="flex items-center justify-between text-sm py-2 px-4 rounded-lg bg-red-950/20 border border-red-900/20">
                                            <span className="text-red-300 font-bold">{src}</span>
                                            <span className="text-red-400 font-black">{count}건 적립 실패</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 text-xs text-red-400/70 text-center">"운영 파라미터" 탭에서 해당 보상의 가치(Valuation)를 설정해주세요.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab !== "stats" && activeTab !== "ops" && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        {activeTab === "requests" ? (
                            <div className="rounded-xl border border-[#333] bg-[#0f0f0f] p-4 shadow-2xl sm:p-8">
                                <VaultRequestManager />
                            </div>
                        ) : advancedMode ? (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-gray-400">
                                        JSON 형식을 지켜 입력해주세요.
                                    </p>
                                    <button
                                        onClick={() => saveJson(activeTab as any)}
                                        disabled={mutation.isPending}
                                        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black transition sm:w-auto"
                                    >
                                        <Save className="h-4 w-4" />
                                        JSON 직접 저장
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
                        ) : (
                            <div className="rounded-xl border border-[#333] bg-[#0f0f0f] p-4 shadow-2xl sm:p-8">
                                {program ? (
                                    <>
                                        {activeTab === "rules" && <VaultRulesEditor program={program} />}
                                        {activeTab === "copy" && <VaultUiEditor program={program} />}
                                        {activeTab === "config" && <VaultSettingsEditor program={program} />}
                                    </>
                                ) : (
                                    <div className="py-20 text-center text-gray-600">로딩 중...</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "ops" && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="rounded-xl border border-[#333] bg-[#111] p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">System Control</p>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Power className="h-4 w-4 text-red-500" />
                                            Vault 시스템 전체 제어 (Master Switch)
                                        </h3>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[11px] font-black border ${program?.is_active ? "bg-[#13240f] text-[#91F402] border-[#1f3e13]" : "bg-[#2a1616] text-red-400 border-red-900/50"}`}>
                                        {program?.is_active ? "ACTIVE" : "SHUTDOWN"}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    시스템 전체를 닫으면 유저는 금고 페이지에 접근할 수 없습니다. 긴급 점검 시 사용하세요.
                                </p>
                                <button
                                    onClick={() => {
                                        if (confirm("정말 시스템 상태를 변경하시겠습니까? 유저 접근이 차단/허용됩니다.")) {
                                            globalActiveMutation.mutate(!program?.is_active);
                                        }
                                    }}
                                    disabled={globalActiveMutation.isPending}
                                    className={`w-full rounded-md px-4 py-2.5 text-sm font-bold text-white transition ${program?.is_active ? "bg-red-900/50 hover:bg-red-800" : "bg-green-800 hover:bg-green-700"}`}
                                >
                                    {program?.is_active ? "시스템 긴급 종료 (Shutdown)" : "시스템 정상화 (Active)"}
                                </button>

                                <div className="border-t border-[#333] my-2 pt-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Game Earn</p>
                                            <h3 className="text-md font-bold text-white flex items-center gap-2">
                                                게임 적립 토글
                                            </h3>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[11px] font-black border ${gameEarnEnabled ? "bg-[#13240f] text-[#91F402] border-[#1f3e13]" : "bg-[#2a1616] text-red-400 border-red-900/50"}`}>
                                            {gameEarnEnabled ? "ON" : "OFF"}
                                        </span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[11px] font-black border ${gameEarnEnabled ? "bg-[#13240f] text-[#91F402] border-[#1f3e13]" : "bg-[#2a1616] text-red-400 border-red-900/50"}`}>
                                        {gameEarnEnabled ? "ON" : "OFF"}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    게임 플레이 적립을 강제로 중단하거나 재개합니다. DB 구성값을 즉시 반영합니다.
                                </p>
                                <button
                                    onClick={() => gameEarnMutation.mutate(!gameEarnEnabled)}
                                    disabled={gameEarnMutation.isPending}
                                    className="w-full rounded-md bg-[#2D6B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black transition"
                                >
                                    {gameEarnEnabled ? "즉시 비활성화" : "즉시 활성화"}
                                </button>
                            </div>

                            <div className="lg:col-span-2 rounded-xl border border-[#333] bg-[#0f0f0f] p-6 space-y-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Eligibility</p>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-amber-400" />
                                            유저 자격 조회/토글
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserLookup
                                            value={eligibilityUserId}
                                            onChange={setEligibilityUserId}
                                            placeholder="External ID or User ID"
                                        />
                                        <button
                                            onClick={() => {
                                                const uid = parseInt(eligibilityUserId || "0", 10);
                                                if (!uid) {
                                                    alert("유저 ID를 입력하세요.");
                                                    return;
                                                }
                                                eligibilityLookup.mutate(uid);
                                            }}
                                            disabled={eligibilityLookup.isPending}
                                            className="flex items-center gap-2 rounded-md bg-[#1f2a38] px-4 py-2 text-sm font-bold text-white hover:bg-[#2c3c54] transition"
                                        >
                                            <Search className="h-4 w-4" />
                                            자격 조회
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-[#222] bg-[#111] p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">현재 상태</p>
                                        <p className="text-base font-bold text-white">
                                            {eligibilityResult ? (
                                                <span className={eligibilityResult.eligible ? "text-[#91F402]" : "text-red-400"}>
                                                    {eligibilityResult.eligible ? "허용" : "차단"}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">조회 전</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const uid = parseInt(eligibilityUserId || "0", 10);
                                                if (!uid) {
                                                    alert("유저 ID를 입력하세요.");
                                                    return;
                                                }
                                                const next = !(eligibilityResult?.eligible ?? false);
                                                eligibilityUpdate.mutate(next);
                                            }}
                                            disabled={eligibilityUpdate.isPending || !eligibilityUserId}
                                            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${eligibilityResult?.eligible ? "bg-[#331515] text-red-300 hover:bg-[#4a1f1f]" : "bg-[#1c3321] text-[#91F402] hover:bg-[#1f3f26]"}`}
                                        >
                                            {eligibilityResult?.eligible ? <Ban className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                            {eligibilityResult?.eligible ? "차단하기" : "허용하기"}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">설정은 VaultProgram config의 allow/block 리스트를 즉시 갱신합니다.</p>
                            </div>

                            {/* Golden Hour Status Board */}
                            <div className="lg:col-span-3 rounded-xl border border-emerald-900/30 bg-emerald-950/5 p-6 space-y-6">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-500 mb-1">Peak Time Event</p>
                                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                                            <Zap className="h-5 w-5 text-emerald-400" />
                                            🌙 골든 아워 상태 보드 (Golden Hour)
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-xs font-black border animate-pulse",
                                            program?.config_json?.golden_hour_config?.manual_override === "FORCE_ON" ||
                                                (program?.config_json?.golden_hour_config?.manual_override === "AUTO" &&
                                                    new Date().getHours() === 21 && new Date().getMinutes() >= 30) // Simplified client check
                                                ? "bg-emerald-500 text-black border-emerald-400"
                                                : "bg-white/5 text-white/30 border-white/10"
                                        )}>
                                            {program?.config_json?.golden_hour_config?.manual_override === "FORCE_ON" ? "FORCE ON" :
                                                program?.config_json?.golden_hour_config?.manual_override === "FORCE_OFF" ? "FORCE OFF" : "AUTO (21:30~22:30)"}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Multiplier Setting */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-400">적립 배수 설정</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={program?.config_json?.golden_hour_config?.multiplier || 2.0}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!program) return;
                                                    const newCfg = { ...program.config_json };
                                                    newCfg.golden_hour_config = { ...newCfg.golden_hour_config, multiplier: val };
                                                    mutation.mutate({ type: "config", json: newCfg });
                                                }}
                                                className="w-24 rounded bg-black border border-white/10 px-3 py-2 text-white font-black"
                                            />
                                            <span className="text-emerald-400 font-bold">x Boost</span>
                                        </div>
                                        <p className="text-[11px] text-white/30 italic">
                                            기본 2.0배, 필요 시 조절 가능
                                        </p>
                                    </div>

                                    {/* Manual Override */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-400">수동 제어 (Override)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["AUTO", "FORCE_ON", "FORCE_OFF"].map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => {
                                                        if (!program) return;
                                                        const newCfg = { ...program.config_json };
                                                        newCfg.golden_hour_config = { ...newCfg.golden_hour_config, manual_override: mode };
                                                        mutation.mutate({ type: "config", json: newCfg });
                                                    }}
                                                    className={clsx(
                                                        "px-3 py-1.5 rounded text-[11px] font-bold transition-all",
                                                        program?.config_json?.golden_hour_config?.manual_override === mode
                                                            ? "bg-emerald-500 text-black"
                                                            : "bg-white/5 text-white/50 hover:bg-white/10"
                                                    )}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-400">운영 도구</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openDetailModal("today_accrual")}
                                                className="flex-1 px-3 py-1.5 rounded bg-white/5 text-white/50 text-[11px] font-bold hover:bg-white/10"
                                            >
                                                참여 로그 확인
                                            </button>
                                            <button
                                                onClick={() => alert("골든 티켓 당첨자 추첨 로직은 운영 정책에 따라 추후 수동으로 진행됩니다.")}
                                                className="flex-1 px-3 py-1.5 rounded bg-amber-500/20 text-amber-500 text-[11px] font-bold hover:bg-amber-500/30 border border-amber-500/20"
                                            >
                                                티켓 추첨 (준비중)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#333] bg-[#0f0f0f] p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Timer Control</p>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-300" />
                                        잠금 타이머 제어
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <UserLookup
                                        value={timerUserId}
                                        onChange={setTimerUserId}
                                        placeholder="External ID or User ID"
                                    />
                                    <button
                                        onClick={() => {
                                            const uid = parseInt(timerUserId || "0", 10);
                                            if (!uid) {
                                                alert("유저 ID를 입력하세요.");
                                                return;
                                            }
                                            timerLookup.mutate(uid);
                                        }}
                                        disabled={timerLookup.isPending}
                                        className="flex items-center gap-2 rounded-md bg-[#1f2a38] px-4 py-2 text-sm font-bold text-white hover:bg-[#2c3c54] transition"
                                    >
                                        <Search className="h-4 w-4" />
                                        상태 조회
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">Eligibility</p>
                                    <p className={`text-base font-black ${timerState ? (timerState.eligible ? "text-[#91F402]" : "text-red-400") : "text-gray-500"}`}>
                                        {timerState ? (timerState.eligible ? "허용" : "차단") : "조회 전"}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-1">Program: {timerState?.program_key || "NEW_MEMBER_VAULT"}</p>
                                    <p className="text-[11px] text-[#91F402] mt-1 font-bold">
                                        Total Charge: {(timerState?.total_charge_amount ?? 0).toLocaleString()}원
                                    </p>
                                </div>
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">Locked Balance</p>
                                    <p className="text-2xl font-black text-white">{(timerState?.locked_balance ?? 0).toLocaleString()}원</p>
                                </div>
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                                    <p className="text-2xl font-black text-white">{(timerState?.available_balance ?? 0).toLocaleString()}원</p>
                                </div>
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">Reserved Balance</p>
                                    <p className="text-2xl font-black text-white">{Math.max((timerState?.locked_balance ?? 0) - (timerState?.available_balance ?? 0), 0).toLocaleString()}원</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">Vault Balance (Mirror)</p>
                                    <p className="text-2xl font-black text-white">{(timerState?.vault_balance ?? 0).toLocaleString()}원</p>
                                </div>
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">Accrual Multiplier</p>
                                    <p className="text-xl font-black text-white">{timerState?.accrual_multiplier ?? "조회 전"}</p>
                                </div>
                                <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                    <p className="text-xs text-gray-500 mb-1">만료 예정 시각</p>
                                    <p className="text-base font-bold text-white">{timerState?.locked_expires_at || timerState?.expires_at || "미설정"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => {
                                        const uid = parseInt(timerUserId || "0", 10);
                                        if (!uid) return alert("유저 ID를 입력하세요.");
                                        timerAction.mutate({ userId: uid, action: "start_now" });
                                    }}
                                    disabled={timerAction.isPending || !timerUserId}
                                    className="rounded-md bg-[#1c3321] px-4 py-3 text-sm font-bold text-[#91F402] hover:bg-[#1f3f26] transition"
                                >
                                    타이머 재시작 (24h)
                                </button>
                                <button
                                    onClick={() => {
                                        const uid = parseInt(timerUserId || "0", 10);
                                        if (!uid) return alert("유저 ID를 입력하세요.");
                                        timerAction.mutate({ userId: uid, action: "reset" });
                                    }}
                                    disabled={timerAction.isPending || !timerUserId}
                                    className="rounded-md bg-[#1f2a38] px-4 py-3 text-sm font-bold text-white hover:bg-[#2c3c54] transition"
                                >
                                    타이머 초기화
                                </button>
                                <button
                                    onClick={() => {
                                        const uid = parseInt(timerUserId || "0", 10);
                                        if (!uid) return alert("유저 ID를 입력하세요.");
                                        timerAction.mutate({ userId: uid, action: "expire_now" });
                                    }}
                                    disabled={timerAction.isPending || !timerUserId}
                                    className="rounded-md bg-[#331515] px-4 py-3 text-sm font-bold text-red-300 hover:bg-[#4a1f1f] transition"
                                >
                                    즉시 만료 처리
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">잠금 잔액을 유지한 채 만료 시각만 설정하거나, 즉시 소멸 처리할 수 있습니다.</p>

                            <div className="border-t border-[#333] pt-6 mt-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                    <Edit2 className="h-4 w-4 text-purple-400" />
                                    Balance Adjustment (잔액 강제 수정)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Locked Amount (set)</label>
                                        <input
                                            type="number"
                                            value={balanceLockedAmount}
                                            onChange={e => setBalanceLockedAmount(e.target.value)}
                                            className="w-full rounded bg-[#0A0A0A] border border-[#333] px-3 py-2 text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Available Amount (set)</label>
                                        <input
                                            type="number"
                                            value={balanceAvailableAmount}
                                            onChange={e => setBalanceAvailableAmount(e.target.value)}
                                            className="w-full rounded bg-[#0A0A0A] border border-[#333] px-3 py-2 text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Reason</label>
                                        <input
                                            type="text"
                                            value={balanceReason}
                                            onChange={e => setBalanceReason(e.target.value)}
                                            className="w-full rounded bg-[#0A0A0A] border border-[#333] px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm("잔액을 강제로 수정하시겠습니까?")) {
                                            balanceMutation.mutate();
                                        }
                                    }}
                                    disabled={balanceMutation.isPending || !timerUserId}
                                    className="mt-4 w-full rounded-md bg-purple-900/30 border border-purple-500/30 px-4 py-3 text-sm font-bold text-purple-300 hover:bg-purple-900/50 transition"
                                >
                                    잔액 수정 실행 (Audit 기록됨)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default VaultAdminPage;
