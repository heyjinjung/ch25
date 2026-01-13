// src/admin/pages/TicketManagerPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {

    RefreshCw,
    Plus,
    Minus,
    TrendingUp,
    TrendingDown,
    Users,
    ScrollText,
    History,
    Wallet,
    ChevronUp,
    ChevronDown,
    Search,
    ExternalLink,
} from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import {
    fetchLedger,
    fetchRecentPlayLogs,
    fetchWalletSummary,
    grantGameTokens,
    revokeGameTokens,
} from "../api/adminGameTokenApi";
import { GAME_TOKEN_LABELS, type GameTokenType } from "../../types/gameTokens";

type ActiveTab = "grant" | "playLogs" | "ledger" | "users";

const LABELS = {
    pageTitle: "코인/티켓 관리",
    pageDescription: "게임 티켓을 지급/회수하고 플레이 로그 및 원장을 관리합니다.",
    refresh: "새로고침",

    tabGrant: "지급/회수",
    tabPlayLogs: "플레이 로그",
    tabLedger: "원장 로그",
    tabUserLookup: "유저 조회",

    statGrantToday: "오늘 지급",
    statRevokeToday: "오늘 회수",
    statActiveHolders: "보유 유저",

    labelUserId: "유저 식별자",
    labelUserIdPlaceholder: "External ID / 닉네임 / @텔레그램",
    labelTokenType: "티켓 종류",
    labelAmount: "수량",
    labelReason: "사유 (선택)",
    labelReasonPlaceholder: "지급/회수 사유 입력...",

    btnGrant: "지급",
    btnRevoke: "회수",
    btnProcessing: "처리 중..",
    btnResetFilter: "초기화",

    filterAll: "전체",
    filterUser: "유저 검색",
    filterGameType: "게임 종류",
    filterTokenType: "티켓 종류",
    filterRewardType: "보상 종류",
    filterDeltaDirection: "변동방향",
    filterDeltaPlus: "지급(+)",
    filterDeltaMinus: "차감 (-)",
    sortBy: "정렬",
    sortTimeDesc: "최신순",
    sortTimeAsc: "오래된순",
    sortAmountDesc: "금액높은순",
    sortAmountAsc: "금액낮은순",

    colTime: "시간",
    colUser: "유저",
    colGame: "게임",
    colRewardType: "보상 종류",
    colRewardAmount: "보상량",
    colTokenType: "티켓",
    colDelta: "변동",
    colBalanceAfter: "잔액",
    colReason: "사유",

    gameRoulette: "룰렛",
    gameDice: "주사위",
    gameLottery: "복권",

    loading: "불러오는 중..",
    noData: "데이터 없음",
    error: "불러오기 실패",
} as const;

const TOKEN_TYPES: Array<{ value: GameTokenType; label: string }> = (Object.keys(GAME_TOKEN_LABELS) as GameTokenType[]).map(
    (value) => ({ value, label: GAME_TOKEN_LABELS[value] })
);

const GAME_LABELS: Record<string, string> = {
    ROULETTE: LABELS.gameRoulette,
    DICE: LABELS.gameDice,
    LOTTERY: LABELS.gameLottery,
};

const grantRevokeSchema = z.object({
    userIdentifier: z.string().min(1, "유저 식별자를 입력하세요."),
    tokenType: z.custom<GameTokenType>((v) => typeof v === "string" && (Object.keys(GAME_TOKEN_LABELS) as string[]).includes(v)),
    amount: z.number().int().min(1, "수량은 1 이상이어야 합니다."),
    reason: z.string().optional(),
});

type GrantRevokeFormData = z.infer<typeof grantRevokeSchema>;

function getKSTDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value ?? "0000";
    const month = parts.find((p) => p.type === "month")?.value ?? "00";
    const day = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${year}-${month}-${day}`;
}

function formatKSTTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(d).replace(/\. /g, "/").replace(/\.$/, "");
}

function matchRewardCategory(rewardType: string, category: "VAULT" | "TOKEN" | "XP") {
    if (category === "VAULT") return rewardType === "POINT";
    if (category === "XP") return rewardType === "GAME_XP";
    return rewardType !== "POINT" && rewardType !== "GAME_XP" && rewardType !== "NONE";
}

function sumBalances(balances: Record<string, number> | undefined) {
    if (!balances) return 0;
    return Object.values(balances).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

const DeltaDisplay: React.FC<{ delta: number }> = ({ delta }) => (
    <span
        className={`font-mono font-bold tracking-tighter ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-zinc-600"
            }`}
    >
        {delta > 0 ? "+" : ""}
        {delta.toLocaleString()}
    </span>
);

const TicketManagerPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<ActiveTab>("grant");
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // Pagination
    const PAGE_SIZE = 20;
    const [playLogPage, setPlayLogPage] = useState(1);
    const [ledgerPage, setLedgerPage] = useState(1);

    // Grant/Revoke form
    const [formMode, setFormMode] = useState<"grant" | "revoke">("grant");
    const [formData, setFormData] = useState<GrantRevokeFormData>({
        userIdentifier: "",
        tokenType: "ROULETTE_COIN",
        amount: 1,
        reason: "",
    });

    // Filters
    const [playLogFilters, setPlayLogFilters] = useState({
        userIdentifier: "",
        gameType: "ALL" as "ALL" | "ROULETTE" | "DICE" | "LOTTERY",
        rewardType: "ALL" as "ALL" | "VAULT" | "TOKEN" | "XP",
        sortBy: "time" as "time" | "amount" | "game" | "reward_type",
        sortOrder: "desc" as "desc" | "asc",
    });
    const [ledgerFilters, setLedgerFilters] = useState({
        userIdentifier: "",
        tokenType: "ALL" as "ALL" | GameTokenType,
        deltaDirection: "ALL" as "ALL" | "PLUS" | "MINUS",
        sortBy: "time" as "time" | "delta" | "balance_after" | "token_type",
        sortOrder: "desc" as "desc" | "asc",
    });
    const [userSearch] = useState("");

    // Applied Filters (Server-Side)
    const [appliedLedgerUserFilter, setAppliedLedgerUserFilter] = useState("");
    const [appliedPlayLogUserFilter, setAppliedPlayLogUserFilter] = useState("");

    // Temporary input state for debouncing/Apply button
    const [ledgerUserFilterInput, setLedgerUserFilterInput] = useState("");
    const [playLogUserFilterInput, setPlayLogUserFilterInput] = useState("");

    const handleApplyPlayLogFilter = () => {
        setAppliedPlayLogUserFilter(playLogUserFilterInput);
        setPlayLogPage(1);
    };

    const handleApplyLedgerFilter = () => {
        setAppliedLedgerUserFilter(ledgerUserFilterInput);
        setLedgerPage(1);
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
        addToast("새로고침 완료", "success");
    };

    // Queries
    const summaryQuery = useQuery({
        queryKey: ["admin", "game-tokens", "summary"],
        queryFn: fetchWalletSummary,
        staleTime: 60 * 1000,
    });

    // Used for: Stats (today grant/revoke) + Ledger tab baseline data
    const ledgerRecentQuery = useQuery({
        queryKey: ["admin", "game-tokens", "ledger", "recent", appliedLedgerUserFilter],
        queryFn: () => fetchLedger(300, appliedLedgerUserFilter || undefined),
        staleTime: 30 * 1000,
    });

    const playLogsRecentQuery = useQuery({
        queryKey: ["admin", "game-tokens", "play-logs", "recent", appliedPlayLogUserFilter],
        queryFn: () => fetchRecentPlayLogs(300, appliedPlayLogUserFilter || undefined),
        staleTime: 30 * 1000,
    });



    const todayKstKey = useMemo(() => getKSTDateKey(new Date()), []);

    const stats = useMemo(() => {
        const ledger = ledgerRecentQuery.data ?? [];
        const todayEntries = ledger.filter((e) => getKSTDateKey(new Date(e.created_at)) === todayKstKey);
        const grantAmount = todayEntries.reduce((acc, e) => acc + (e.delta > 0 ? e.delta : 0), 0);
        const revokeAmount = todayEntries.reduce((acc, e) => acc + (e.delta < 0 ? Math.abs(e.delta) : 0), 0);

        const summaries = summaryQuery.data ?? [];
        const holderCount = summaries.filter((s) => sumBalances(s.balances) > 0).length;

        return { grantAmount, revokeAmount, holderCount };
    }, [ledgerRecentQuery.data, summaryQuery.data, todayKstKey]);

    // Mutations
    const grantMutation = useMutation({
        mutationFn: grantGameTokens,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
            addToast("지급 완료", "success");
        },
        onError: (err: any) => {
            console.error("Grant failed:", err);
            addToast("지급 실패", "error");
        },
    });

    const revokeMutation = useMutation({
        mutationFn: revokeGameTokens,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
            addToast("회수 완료", "success");
        },
        onError: (err: any) => {
            console.error("Revoke failed:", err);
            addToast("회수 실패", "error");
        },
    });

    const isSubmitting = grantMutation.isPending || revokeMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = grantRevokeSchema.safeParse(formData);
        if (!parsed.success) {
            addToast(parsed.error.errors[0]?.message ?? "?ëì °åªë¯ªì£ ?ëº¤ì¤?ëï¼?ëªì.", "error");
            return;
        }

        const payload = {
            user_identifier: parsed.data.userIdentifier,
            token_type: parsed.data.tokenType,
            amount: parsed.data.amount,
        };

        if (formMode === "grant") grantMutation.mutate(payload);
        else revokeMutation.mutate(payload);
    };

    // Play logs filtering/sorting
    const filteredPlayLogs = useMemo(() => {
        const raw = playLogsRecentQuery.data ?? [];
        // Server-side filtered, so client-side filter only needs to handle local text matches if needed
        // But for now, let's keep secondary local filtering ONLY if the user didn't use the server filter input correctly?
        // Actually, if we filter server side, we can drop the user string filter here OR apply it to refine the 300 items.
        // Let's keep it consistent: The main "Search" input drives the server query.
        // The game type / reward type filters are client-side on the fetched set.

        const filtered = raw.filter((log) => {
            if (playLogFilters.gameType !== "ALL" && log.game !== playLogFilters.gameType) return false;
            if (playLogFilters.rewardType !== "ALL" && !matchRewardCategory(String(log.reward_type), playLogFilters.rewardType)) return false;
            return true;
        });

        const sorted = [...filtered].sort((a, b) => {
            let compare = 0;
            if (playLogFilters.sortBy === "time") {
                compare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            } else if (playLogFilters.sortBy === "amount") {
                compare = a.reward_amount - b.reward_amount;
            } else if (playLogFilters.sortBy === "game") {
                compare = a.game.localeCompare(b.game);
            } else if (playLogFilters.sortBy === "reward_type") {
                compare = a.reward_type.localeCompare(b.reward_type);
            }
            return playLogFilters.sortOrder === "asc" ? compare : -compare;
        });

        return sorted;
    }, [playLogsRecentQuery.data, playLogFilters]);

    // Ledger filtering/sorting
    const filteredLedger = useMemo(() => {
        const raw = ledgerRecentQuery.data ?? [];
        // Similar logic: User ID filtering is now server-side via appliedLedgerUserFilter

        const filtered = raw.filter((entry) => {
            if (ledgerFilters.tokenType !== "ALL" && entry.token_type !== ledgerFilters.tokenType) return false;
            if (ledgerFilters.deltaDirection === "PLUS" && entry.delta <= 0) return false;
            if (ledgerFilters.deltaDirection === "MINUS" && entry.delta >= 0) return false;
            return true;
        });

        const sorted = [...filtered].sort((a, b) => {
            let compare = 0;
            if (ledgerFilters.sortBy === "time") {
                compare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            } else if (ledgerFilters.sortBy === "delta") {
                compare = a.delta - b.delta;
            } else if (ledgerFilters.sortBy === "balance_after") {
                compare = a.balance_after - b.balance_after;
            } else if (ledgerFilters.sortBy === "token_type") {
                compare = a.token_type.localeCompare(b.token_type);
            }
            return ledgerFilters.sortOrder === "asc" ? compare : -compare;
        });

        return sorted;
    }, [ledgerRecentQuery.data, ledgerFilters]);

    const filteredUsers = useMemo(() => {
        const data = summaryQuery.data ?? [];
        const q = userSearch.trim().toLowerCase();
        if (!q) return data;

        return data.filter((u) => {
            return (
                String(u.user_id).includes(q) ||
                (u.external_id ?? "").toLowerCase().includes(q) ||
                (u.nickname ?? "").toLowerCase().includes(q) ||
                (u.telegram_username ?? "").toLowerCase().includes(q)
            );
        });
    }, [summaryQuery.data, userSearch]);

    const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
        { id: "grant", label: LABELS.tabGrant, icon: <Wallet className="h-3.5 w-3.5" /> },
        { id: "playLogs", label: LABELS.tabPlayLogs, icon: <ScrollText className="h-3.5 w-3.5" /> },
        { id: "ledger", label: LABELS.tabLedger, icon: <History className="h-3.5 w-3.5" /> },
        { id: "users", label: LABELS.tabUserLookup, icon: <Users className="h-3.5 w-3.5" /> },
    ];

    const toggleSort = (tab: "playLogs" | "ledger", field: string) => {
        if (tab === "playLogs") {
            setPlayLogFilters(prev => ({
                ...prev,
                sortBy: field as any,
                sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc"
            }));
            setPlayLogPage(1);
        } else {
            setLedgerFilters(prev => ({
                ...prev,
                sortBy: field as any,
                sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc"
            }));
            setLedgerPage(1);
        }
    };


    const SortHeader: React.FC<{
        label: string;
        field: string;
        currentField: string;
        currentOrder: "asc" | "desc";
        onSort: (field: string) => void;
        align?: "left" | "right";
    }> = ({ label, field, currentField, currentOrder, onSort, align = "left" }) => (
        <th
            className={`px-4 py-3.5 text-${align} cursor-pointer hover:text-admin-brand transition-colors group`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
                {label}
                <div className="flex flex-col">
                    <ChevronUp
                        className={`h-3 w-3 -mb-1 ${currentField === field && currentOrder === "asc" ? "text-admin-brand" : "text-admin-text-muted group-hover:text-admin-brand/50"
                            }`}
                    />
                    <ChevronDown
                        className={`h-3 w-3 ${currentField === field && currentOrder === "desc" ? "text-admin-brand" : "text-admin-text-muted group-hover:text-admin-brand/50"
                            }`}
                    />
                </div>
            </div>
        </th>
    );

    return (
        <section className="admin-page-container space-y-10 pb-20">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
                        {LABELS.pageTitle} <span className="text-admin-brand/40">Tokens</span>
                    </h1>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={summaryQuery.isFetching || ledgerRecentQuery.isFetching || playLogsRecentQuery.isFetching}
                    className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${summaryQuery.isFetching || ledgerRecentQuery.isFetching || playLogsRecentQuery.isFetching ? "animate-spin" : ""
                            }`}
                    />
                    {LABELS.refresh}
                </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => {
                        setActiveTab("ledger");
                        setLedgerFilters(prev => ({ ...prev, deltaDirection: "PLUS" }));
                    }}
                    className="admin-card-premium p-6 flex flex-col justify-between h-32 cursor-pointer hover:border-admin-accent transition-colors"
                >
                    <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">{LABELS.statGrantToday}</p>
                    <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-admin-accent tabular-nums">{stats.grantAmount.toLocaleString()}</p>
                        <TrendingUp className="h-5 w-5 text-admin-accent mb-1" />
                    </div>
                    <p className="text-xs text-admin-text-muted mt-2">KST 기준 최근 300건(원장) 기준</p>
                </div>
                <div
                    onClick={() => {
                        setActiveTab("ledger");
                        setLedgerFilters(prev => ({ ...prev, deltaDirection: "MINUS" }));
                    }}
                    className="admin-card-premium p-6 flex flex-col justify-between h-32 cursor-pointer hover:border-admin-danger transition-colors"
                >
                    <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">{LABELS.statRevokeToday}</p>
                    <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-admin-danger tabular-nums">{stats.revokeAmount.toLocaleString()}</p>
                        <TrendingDown className="h-5 w-5 text-admin-danger mb-1" />
                    </div>
                    <p className="text-xs text-admin-text-muted mt-2">KST 기준 최근 300건(원장) 기준</p>
                </div>
                <div
                    onClick={() => setActiveTab("users")}
                    className="admin-card-premium p-6 flex flex-col justify-between h-32 border-l-4 border-admin-brand cursor-pointer hover:bg-admin-hover transition-colors"
                >
                    <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">{LABELS.statActiveHolders}</p>
                    <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-admin-brand tabular-nums">{stats.holderCount.toLocaleString()}</p>
                        <Users className="h-5 w-5 text-admin-brand mb-1" />
                    </div>
                    <p className="text-xs text-admin-text-muted mt-2">요약 API 기준(잔액 합 &gt; 0)</p>
                </div>
            </div>

            {/* Split View Layout */}
            <div className="flex h-[calc(100vh-220px)] gap-6 overflow-hidden">
                {/* Left Panel: Lists */}
                <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                    {/* List Toolbar */}
                    <div className="flex-none p-4 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                            {tabs.filter(t => t.id !== 'grant').map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {/* Dynamic Filters based on Active Tab */}
                        {activeTab === 'playLogs' && (
                            <div className="flex gap-2">
                                <div className="relative group w-48">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-admin-brand transition-colors" />
                                    <input
                                        type="text"
                                        value={playLogUserFilterInput}
                                        onChange={(e) => setPlayLogUserFilterInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleApplyPlayLogFilter()}
                                        placeholder="User ID / Name..."
                                        className="w-full h-8 pl-8 pr-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:border-admin-brand focus:outline-none transition-all placeholder:text-zinc-600"
                                    />
                                    {/* Show apply button only if changed? Or generic search button */}
                                </div>
                                <button
                                    onClick={handleApplyPlayLogFilter}
                                    className="px-3 py-1.5 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold transition-colors"
                                >
                                    검색
                                </button>
                                <div className="w-px h-8 bg-zinc-800 mx-1" />

                                <select
                                    title={LABELS.filterGameType}
                                    aria-label={LABELS.filterGameType}
                                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:border-admin-brand outline-none h-8"
                                    value={playLogFilters.gameType}
                                    onChange={(e) => setPlayLogFilters(p => ({ ...p, gameType: e.target.value as any }))}
                                >
                                    <option value="ALL">전체 게임</option>
                                    {Object.entries(GAME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        )}
                        {activeTab === 'ledger' && (
                            <div className="flex gap-2">
                                <div className="relative group w-48">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-admin-brand transition-colors" />
                                    <input
                                        type="text"
                                        value={ledgerUserFilterInput}
                                        onChange={(e) => setLedgerUserFilterInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleApplyLedgerFilter()}
                                        placeholder="User ID / Name..."
                                        className="w-full h-8 pl-8 pr-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:border-admin-brand focus:outline-none transition-all placeholder:text-zinc-600"
                                    />
                                </div>
                                <button
                                    onClick={handleApplyLedgerFilter}
                                    className="px-3 py-1.5 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold transition-colors"
                                >
                                    검색
                                </button>
                                <div className="w-px h-8 bg-zinc-800 mx-1" />

                                <select
                                    title={LABELS.filterTokenType}
                                    aria-label={LABELS.filterTokenType}
                                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:border-admin-brand outline-none h-8"
                                    value={ledgerFilters.tokenType}
                                    onChange={(e) => setLedgerFilters(p => ({ ...p, tokenType: e.target.value as any }))}
                                >
                                    <option value="ALL">전체</option>
                                    {TOKEN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Table Area */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {activeTab === 'playLogs' && (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                                    <tr>
                                        <SortHeader label={LABELS.colTime} field="time" currentField={playLogFilters.sortBy} currentOrder={playLogFilters.sortOrder} onSort={(f) => toggleSort('playLogs', f)} />
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">{LABELS.colUser}</th>
                                        <SortHeader label={LABELS.colGame} field="game" currentField={playLogFilters.sortBy} currentOrder={playLogFilters.sortOrder} onSort={(f) => toggleSort('playLogs', f)} />
                                        <SortHeader label={LABELS.colRewardAmount} field="amount" currentField={playLogFilters.sortBy} currentOrder={playLogFilters.sortOrder} onSort={(f) => toggleSort('playLogs', f)} align="right" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {filteredPlayLogs.slice((playLogPage - 1) * PAGE_SIZE, playLogPage * PAGE_SIZE).map((log) => (
                                        <tr key={log.id} className="group hover:bg-white/5 transition-colors h-12">
                                            <td className="px-4 text-[10px] text-zinc-500 font-mono whitespace-nowrap tabular-nums">{formatKSTTime(log.created_at)}</td>
                                            <td className="px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-300">{log.nickname}</span>
                                                    <span className="text-[10px] text-zinc-600 font-mono">{log.external_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 text-xs text-zinc-400 font-bold">{GAME_LABELS[log.game] || log.game}</td>
                                            <td className="px-4 text-right">
                                                <span className={`font-mono text-xs font-black tabular-nums ${log.reward_amount > 0 ? "text-emerald-400 font-black" : "text-zinc-600 font-medium"}`}>
                                                    {log.reward_amount > 0 ? "+" : ""}{log.reward_amount.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {activeTab === 'ledger' && (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                                    <tr>
                                        <SortHeader label={LABELS.colTime} field="time" currentField={ledgerFilters.sortBy} currentOrder={ledgerFilters.sortOrder} onSort={(f) => toggleSort('ledger', f)} />
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">{LABELS.colUser}</th>
                                        <SortHeader label={LABELS.colTokenType} field="token_type" currentField={ledgerFilters.sortBy} currentOrder={ledgerFilters.sortOrder} onSort={(f) => toggleSort('ledger', f)} />
                                        <SortHeader label={LABELS.colDelta} field="delta" currentField={ledgerFilters.sortBy} currentOrder={ledgerFilters.sortOrder} onSort={(f) => toggleSort('ledger', f)} align="right" />
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">{LABELS.colBalanceAfter}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {filteredLedger.slice((ledgerPage - 1) * PAGE_SIZE, ledgerPage * PAGE_SIZE).map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className={`group hover:bg-white/5 transition-colors h-12 cursor-pointer ${selectedUserId === entry.user_id ? "bg-indigo-500/10 hover:bg-indigo-500/20" : ""}`}
                                            onClick={() => {
                                                setSelectedUserId(entry.user_id);
                                                setFormData(prev => ({ ...prev, userIdentifier: entry.external_id || String(entry.user_id) }));
                                            }}
                                        >
                                            <td className="px-4 text-[10px] text-zinc-500 font-mono whitespace-nowrap">{formatKSTTime(entry.created_at)}</td>
                                            <td className="px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-300">{entry.nickname}</span>
                                                    <span className="text-[10px] text-zinc-600 font-mono">{entry.external_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 text-xs text-zinc-400">{GAME_TOKEN_LABELS[entry.token_type] || entry.token_type}</td>
                                            <td className="px-4 text-right">
                                                <DeltaDisplay delta={entry.delta} />
                                            </td>
                                            <td className="px-4 text-right text-xs font-mono text-zinc-500">
                                                {entry.balance_after.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {/* Users Tab Simplified Logic */}
                        {activeTab === 'users' && (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-zinc-500">USER ID</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-zinc-500">INFO</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-zinc-500 text-right">TOTAL ASSETS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {filteredUsers.map(u => (
                                        <tr
                                            key={u.user_id}
                                            className={`group hover:bg-white/5 transition-colors h-12 cursor-pointer ${selectedUserId === u.user_id ? "bg-indigo-500/10 hover:bg-indigo-500/20" : ""}`}
                                            onClick={() => {
                                                setSelectedUserId(u.user_id);
                                                setFormData(prev => ({ ...prev, userIdentifier: u.external_id || String(u.user_id) }));
                                            }}
                                        >
                                            <td className="px-4 text-xs font-mono text-zinc-500">{u.user_id}</td>
                                            <td className="px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-300">{u.nickname}</span>
                                                    <span className="text-[10px] text-zinc-600 font-mono">{u.external_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 text-right text-xs font-mono text-white">
                                                {sumBalances(u.balances).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right Panel: Action & Detail */}
                <div className="w-[400px] flex-none flex flex-col gap-6">
                    {/* Action Card */}
                    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-admin-brand" />
                                퀵 액션 (Actions)
                            </h3>
                            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                <button
                                    onClick={() => setFormMode("grant")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${formMode === 'grant' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    지급
                                </button>
                                <button
                                    onClick={() => setFormMode("revoke")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${formMode === 'revoke' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    회수
                                </button>
                            </div>
                        </div>

                        {/* Selected User Actions */}
                        {formData.userIdentifier && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setAppliedPlayLogUserFilter(formData.userIdentifier);
                                        setPlayLogUserFilterInput(formData.userIdentifier);
                                        setActiveTab("playLogs");
                                    }}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 transition-colors"
                                >
                                    <ScrollText className="h-3.5 w-3.5" />
                                    <span>기록 보기</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 ml-0.5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setAppliedLedgerUserFilter(formData.userIdentifier);
                                        setLedgerUserFilterInput(formData.userIdentifier);
                                        setActiveTab("ledger");
                                    }}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 transition-colors"
                                >
                                    <History className="h-3.5 w-3.5" />
                                    <span>원장 보기</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 ml-0.5" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">대상 유저 (Target User)</label>
                                <input
                                    type="text"
                                    value={formData.userIdentifier}
                                    onChange={(e) => setFormData({ ...formData, userIdentifier: e.target.value })}
                                    placeholder={LABELS.labelUserIdPlaceholder}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-admin-brand outline-none transition-colors placeholder:text-zinc-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">토큰 (Token)</label>
                                    <select
                                        title={LABELS.labelTokenType}
                                        aria-label={LABELS.labelTokenType}
                                        value={formData.tokenType}
                                        onChange={(e) => setFormData({ ...formData, tokenType: e.target.value as GameTokenType })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-admin-brand outline-none"
                                    >
                                        {TOKEN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">수량 (Amount)</label>
                                    <input
                                        title={LABELS.labelAmount}
                                        aria-label={LABELS.labelAmount}
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono text-right focus:border-admin-brand outline-none"
                                        min={1}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">사유 (Reason)</label>
                                <input
                                    type="text"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-admin-brand outline-none placeholder:text-zinc-700"
                                    placeholder="지급/회수 사유 입력 (Optional)"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all shadow-lg flex items-center justify-center gap-2
                                    ${formMode === 'grant'
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-500/20'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : (formMode === 'grant' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />)}
                                {formMode === 'grant' ? 'Grant Tokens' : 'Revoke Tokens'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TicketManagerPage;
