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
    Package,
    Coins,
} from "lucide-react";
import { adminInventoryApi, adjustAdminUserInventoryByIdentifier } from "../api/adminInventoryApi";
import { useToast } from "../../components/common/ToastProvider";
import {
    fetchLedger,
    fetchRecentPlayLogs,
    fetchWalletSummary,
    grantGameTokens,
    revokeGameTokens,
} from "../api/adminGameTokenApi";
import UserAssetDetailModal from "../components/UserAssetDetailModal";
import { GAME_TOKEN_LABELS, type GameTokenType } from "../../types/gameTokens";

type ActiveTab = "grant" | "playLogs" | "ledger" | "users" | "inventory";

const LABELS = {
    pageTitle: "ÏΩîÏù∏/?∞Ïºì Í¥ÄÎ¶?,
    pageDescription: "Í≤åÏûÑ ?∞Ïºì??ÏßÄÍ∏??åÏàò?òÍ≥† ?åÎ†à??Î°úÍ∑∏ Î∞??êÏû•??Í¥ÄÎ¶¨Ìï©?àÎã§.",
    refresh: "?àÎ°úÍ≥†Ïπ®",

    tabGrant: "ÏßÄÍ∏??åÏàò",
    tabPlayLogs: "?åÎ†à??Î°úÍ∑∏",
    tabLedger: "?êÏû• Î°úÍ∑∏",
    tabUserLookup: "?†Ï? Ï°∞Ìöå",
    tabInventory: "?∏Î≤§?†Î¶¨",

    statGrantToday: "?§Îäò ÏßÄÍ∏?,
    statRevokeToday: "?§Îäò ?åÏàò",
    statActiveHolders: "Î≥¥Ïú† ?†Ï?",

    labelUserId: "?†Ï? ?ùÎ≥Ñ??,
    labelUserIdPlaceholder: "External ID / ?âÎÑ§??/ @?îÎ†àÍ∑∏Îû®",
    labelTokenType: "?∞Ïºì Ï¢ÖÎ•ò",
    labelAmount: "?òÎüâ",
    labelReason: "?¨Ïú† (?†ÌÉù)",
    labelReasonPlaceholder: "ÏßÄÍ∏??åÏàò ?¨Ïú† ?ÖÎ†•...",

    btnGrant: "ÏßÄÍ∏?,
    btnRevoke: "?åÏàò",
    btnProcessing: "Ï≤òÎ¶¨ Ï§?.",
    btnResetFilter: "Ï¥àÍ∏∞??,

    filterAll: "?ÑÏ≤¥",
    filterUser: "?†Ï? Í≤Ä??,
    filterGameType: "Í≤åÏûÑ Ï¢ÖÎ•ò",
    filterTokenType: "?∞Ïºì Ï¢ÖÎ•ò",
    filterRewardType: "Î≥¥ÏÉÅ Ï¢ÖÎ•ò",
    filterDeltaDirection: "Î≥Ä?ôÎ∞©??,
    filterDeltaPlus: "ÏßÄÍ∏?+)",
    filterDeltaMinus: "Ï∞®Í∞ê (-)",
    sortBy: "?ïÎ†¨",
    sortTimeDesc: "ÏµúÏã†??,
    sortTimeAsc: "?§Îûò?úÏàú",
    sortAmountDesc: "Í∏àÏï°?íÏ???,
    sortAmountAsc: "Í∏àÏï°?????,

    colTime: "?úÍ∞Ñ",
    colUser: "?†Ï?",
    colGame: "Í≤åÏûÑ",
    colRewardType: "Î≥¥ÏÉÅ Ï¢ÖÎ•ò",
    colRewardAmount: "Î≥¥ÏÉÅ??,
    colTokenType: "?∞Ïºì",
    colDelta: "Î≥Ä??,
    colBalanceAfter: "?îÏï°",
    colReason: "?¨Ïú†",

    gameRoulette: "Î£∞Î†õ",
    gameDice: "Ï£ºÏÇ¨??,
    gameLottery: "Î≥µÍ∂å",

    loading: "Î∂àÎü¨?§Îäî Ï§?.",
    noData: "?∞Ïù¥???ÜÏùå",
    error: "Î∂àÎü¨?§Í∏∞ ?§Ìå®",
} as const;

const TOKEN_TYPES: Array<{ value: GameTokenType; label: string }> = (Object.keys(GAME_TOKEN_LABELS) as GameTokenType[]).map(
    (value) => ({ value, label: GAME_TOKEN_LABELS[value] })
);

const INVENTORY_ITEM_TYPES = [
    { value: "VOUCHER_GOLD_KEY_1", label: "ÍµêÌôòÍ∂? Í≥®Îìú?? },
    { value: "VOUCHER_DIAMOND_KEY_1", label: "ÍµêÌôòÍ∂? ?§Ïù¥?ÑÌÇ§" },
    { value: "VOUCHER_ROULETTE_COIN_1", label: "ÍµêÌôòÍ∂? Î£∞Î†õ?∞Ïºì" },
    { value: "VOUCHER_DICE_TOKEN_1", label: "ÍµêÌôòÍ∂? Ï£ºÏÇ¨?ÑÌã∞Ïº? },
    { value: "VOUCHER_LOTTERY_TICKET_1", label: "ÍµêÌôòÍ∂? Î≥µÍ∂å?∞Ïºì" },
    { value: "DIAMOND", label: "?¨Ìôî: ?§Ïù¥?? },
    { value: "BAEMIN_GIFTICON_10000", label: "Í∏∞ÌîÑ?∞ÏΩò: Î∞∞Î? 1Îß? },
    { value: "BAEMIN_GIFTICON_20000", label: "Í∏∞ÌîÑ?∞ÏΩò: Î∞∞Î? 2Îß? },
    { value: "BAEMIN_GIFTICON_30000", label: "Í∏∞ÌîÑ?∞ÏΩò: Î∞∞Î? 3Îß? },
    { value: "BAEMIN_GIFTICON_50000", label: "Í∏∞ÌîÑ?∞ÏΩò: Î∞∞Î? 5Îß? },
    { value: "COMPOSE_AMERICANO_GIFTICON", label: "Í∏∞ÌîÑ?∞ÏΩò: Ïª¥Ìè¨Ï¶??ÑÏïÑ" },
    { value: "STARBUCKS_GIFTICON", label: "Í∏∞ÌîÑ?∞ÏΩò: ?§Ì?Î≤ÖÏä§" },
    { value: "CU_GIFTICON", label: "Í∏∞ÌîÑ?∞ÏΩò: CU" },
    { value: "GS25_GIFTICON", label: "Í∏∞ÌîÑ?∞ÏΩò: GS25" },
    { value: "CC_COIN_GIFTICON", label: "Í∏∞ÌîÑ?∞ÏΩò: ?®Ïî®ÏΩîÏù∏" },
];

const GAME_LABELS: Record<string, string> = {
    ROULETTE: LABELS.gameRoulette,
    DICE: LABELS.gameDice,
    LOTTERY: LABELS.gameLottery,
};

const grantRevokeSchema = z.object({
    userIdentifier: z.string().min(1, "?†Ï? ?ùÎ≥Ñ?êÎ? ?ÖÎ†•?òÏÑ∏??"),
    tokenType: z.custom<GameTokenType>((v) => typeof v === "string" && (Object.keys(GAME_TOKEN_LABELS) as string[]).includes(v)),
    amount: z.number().int().min(1, "?òÎüâ?Ä 1 ?¥ÏÉÅ?¥Ïñ¥???©Îãà??"),
    reason: z.string().optional(),
});

type GrantRevokeFormData = z.infer<typeof grantRevokeSchema>;

const normalizeInventoryRows = (value: unknown) => {
    if (Array.isArray(value)) return value;
    const candidate = value as { data?: unknown; items?: unknown } | null | undefined;
    if (candidate && Array.isArray(candidate.data)) return candidate.data;
    if (candidate && Array.isArray(candidate.items)) return candidate.items;
    return [];
};

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

function getBalanceByType(balances: Record<string, number> | undefined, tokenType: GameTokenType) {
    if (!balances) return 0;
    const v = balances[tokenType];
    return typeof v === "number" ? v : 0;
}

function formatNumberInput(value: string) {
    const normalized = value.replace(/[^0-9]/g, "");
    return normalized;
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
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
    // Users (client-side)
    const [userSearch, setUserSearch] = useState("");
    const [userTokenType, setUserTokenType] = useState<"ALL" | GameTokenType>("ALL");
    const [userIncludeZero, setUserIncludeZero] = useState(false);
    const [userMinBalanceInput, setUserMinBalanceInput] = useState("0");
    const [userSort, setUserSort] = useState<{ by: "user_id" | "total" | "token"; order: "asc" | "desc" }>({
        by: "total",
        order: "desc",
    });

    // Inventory Tab State
    const [inventoryTabMode, setInventoryTabMode] = useState<"ledger" | "items">("ledger");
    const [inventoryFilters, setInventoryFilters] = useState({
        itemType: "",
        minQuantity: 0,
    });
    const [inventorySortBy, setInventorySortBy] = useState<"item_type" | "quantity" | "updated_at">("updated_at");
    const [inventorySortDesc, setInventorySortDesc] = useState(true);

    // Quick Action State
    const [quickActionCategory, setQuickActionCategory] = useState<"TOKEN" | "INVENTORY">("TOKEN");
    const [inventoryItemType, setInventoryItemType] = useState("");

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
        addToast("?àÎ°úÍ≥†Ïπ® ?ÑÎ£å", "success");
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

    // Inventory Queries
    const inventoryLedgerQuery = useQuery({
        queryKey: ["admin", "inventory", "ledger", inventoryFilters],
        queryFn: () => adminInventoryApi.fetchLedger({
            item_type: inventoryFilters.itemType || undefined,
            limit: 100
        }),
        enabled: activeTab === "inventory" && inventoryTabMode === "ledger",
    });

    const inventoryItemsQuery = useQuery({
        queryKey: ["admin", "inventory", "items", inventoryFilters, inventorySortBy, inventorySortDesc],
        queryFn: () => adminInventoryApi.fetchItems({
            item_type: inventoryFilters.itemType || undefined,
            min_quantity: inventoryFilters.minQuantity || undefined,
            limit: 100,
            sort_by: inventorySortBy,
            sort_desc: inventorySortDesc,
        }),
        enabled: activeTab === "inventory" && inventoryTabMode === "items",
    });

    const inventoryLedgerRows = useMemo(() => normalizeInventoryRows(inventoryLedgerQuery.data), [inventoryLedgerQuery.data]);
    const inventoryItemRows = useMemo(() => normalizeInventoryRows(inventoryItemsQuery.data), [inventoryItemsQuery.data]);

    const inventoryMutation = useMutation({
        mutationFn: async (payload: { userIdentifier: string; itemType: string; amount: number; reason?: string }) => {
            const delta = formMode === "grant" ? payload.amount : -payload.amount;
            return adjustAdminUserInventoryByIdentifier(payload.userIdentifier, {
                item_type: payload.itemType,
                delta,
                note: payload.reason,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
            addToast("?∏Î≤§?†Î¶¨ Ï°∞Ï†ï ?ÑÎ£å", "success");
        },
        onError: (err: any) => {
            console.error("Inventory adjustment failed:", err);
            addToast("?∏Î≤§?†Î¶¨ Ï°∞Ï†ï ?§Ìå®", "error");
        },
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
            addToast("ÏßÄÍ∏??ÑÎ£å", "success");
        },
        onError: (err: any) => {
            console.error("Grant failed:", err);
            addToast("ÏßÄÍ∏??§Ìå®", "error");
        },
    });

    const revokeMutation = useMutation({
        mutationFn: revokeGameTokens,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
            addToast("?åÏàò ?ÑÎ£å", "success");
        },
        onError: (err: any) => {
            console.error("Revoke failed:", err);
            addToast("?åÏàò ?§Ìå®", "error");
        },
    });

    const isSubmitting = grantMutation.isPending || revokeMutation.isPending || inventoryMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (quickActionCategory === "INVENTORY") {
            if (!formData.userIdentifier || !inventoryItemType || formData.amount < 1) {
                addToast("Î™®Îì† ?ÑÎìúÎ•??ÖÎ†•?òÏÑ∏??(?†Ï?, ?ÑÏù¥??Ï¢ÖÎ•ò, ?òÎüâ)", "error");
                return;
            }
            inventoryMutation.mutate({
                userIdentifier: formData.userIdentifier,
                itemType: inventoryItemType,
                amount: formData.amount,
                reason: formData.reason,
            });
            return;
        }

        const parsed = grantRevokeSchema.safeParse(formData);
        if (!parsed.success) {
            addToast(parsed.error.errors[0]?.message ?? "?ÖÎ†•Í∞íÏùÑ ?ïÏù∏?¥Ï£º?∏Ïöî.", "error");
            return;
        }

        const payload = {
            user_identifier: parsed.data.userIdentifier,
            token_type: parsed.data.tokenType,
            amount: parsed.data.amount,
            reason: parsed.data.reason || undefined,
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
        const minBalance = Number(userMinBalanceInput || "0") || 0;

        const filtered = data.filter((u) => {
            const total = sumBalances(u.balances);
            const tokenBalance = userTokenType === "ALL" ? total : getBalanceByType(u.balances, userTokenType);

            if (!userIncludeZero && tokenBalance <= 0) return false;
            if (tokenBalance < minBalance) return false;

            if (!q) return true;
            return (
                String(u.user_id).includes(q) ||
                (u.external_id ?? "").toLowerCase().includes(q) ||
                (u.nickname ?? "").toLowerCase().includes(q) ||
                (u.telegram_username ?? "").toLowerCase().includes(q)
            );
        });

        const sorted = [...filtered].sort((a, b) => {
            const aTotal = sumBalances(a.balances);
            const bTotal = sumBalances(b.balances);
            const aToken = userTokenType === "ALL" ? aTotal : getBalanceByType(a.balances, userTokenType);
            const bToken = userTokenType === "ALL" ? bTotal : getBalanceByType(b.balances, userTokenType);

            let compare = 0;
            if (userSort.by === "user_id") compare = a.user_id - b.user_id;
            else if (userSort.by === "token") compare = aToken - bToken;
            else compare = aTotal - bTotal;

            return userSort.order === "asc" ? compare : -compare;
        });

        return sorted;
    }, [summaryQuery.data, userSearch]);

    // Removed inline detail view logic (moved to UserAssetDetailModal)

    const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
        { id: "grant", label: LABELS.tabGrant, icon: <Wallet className="h-3.5 w-3.5" /> },
        { id: "playLogs", label: LABELS.tabPlayLogs, icon: <ScrollText className="h-3.5 w-3.5" /> },
        { id: "ledger", label: LABELS.tabLedger, icon: <History className="h-3.5 w-3.5" /> },
        { id: "inventory", label: LABELS.tabInventory, icon: <Package className="h-3.5 w-3.5" /> },
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

    const toggleUserSort = (field: "user_id" | "total" | "token") => {
        setUserSort((prev) => ({
            by: field,
            order: prev.by === field && prev.order === "desc" ? "asc" : "desc",
        }));
    };

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
                    <p className="text-xs text-admin-text-muted mt-2">KST Í∏∞Ï? ÏµúÍ∑º 300Í±??êÏû•) Í∏∞Ï?</p>
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
                    <p className="text-xs text-admin-text-muted mt-2">KST Í∏∞Ï? ÏµúÍ∑º 300Í±??êÏû•) Í∏∞Ï?</p>
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
                    <p className="text-xs text-admin-text-muted mt-2">?îÏïΩ API Í∏∞Ï?(?îÏï° ??&gt; 0)</p>
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
                                        className="admin-input w-full h-9 pl-9 pr-3 text-sm"
                                    />
                                    {/* Show apply button only if changed? Or generic search button */}
                                </div>
                                <button
                                    onClick={handleApplyPlayLogFilter}
                                    className="btn-admin-secondary h-9 px-4"
                                >
                                    Í≤Ä??
                                </button>
                                <div className="w-px h-8 bg-zinc-800 mx-1" />

                                <select
                                    title={LABELS.filterGameType}
                                    aria-label={LABELS.filterGameType}
                                    className="admin-input h-9 text-sm"
                                    value={playLogFilters.gameType}
                                    onChange={(e) => setPlayLogFilters(p => ({ ...p, gameType: e.target.value as any }))}
                                >
                                    <option value="ALL">?ÑÏ≤¥ Í≤åÏûÑ</option>
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
                                        className="admin-input w-full h-9 pl-9 pr-3 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleApplyLedgerFilter}
                                    className="btn-admin-secondary h-9 px-4"
                                >
                                    Í≤Ä??
                                </button>
                                <div className="w-px h-8 bg-zinc-800 mx-1" />

                                <select
                                    title={LABELS.filterTokenType}
                                    aria-label={LABELS.filterTokenType}
                                    className="admin-input h-9 text-sm"
                                    value={ledgerFilters.tokenType}
                                    onChange={(e) => setLedgerFilters(p => ({ ...p, tokenType: e.target.value as any }))}
                                >
                                    <option value="ALL">?ÑÏ≤¥</option>
                                    {TOKEN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        )}
                        {activeTab === 'users' && (
                            <div className="flex flex-wrap gap-2 items-center justify-end">
                                <div className="relative group w-56">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-admin-brand transition-colors" />
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder="External ID / ?âÎÑ§??/ @?îÎ†àÍ∑∏Îû®"
                                        className="admin-input w-full h-9 pl-10 pr-3 text-sm"
                                    />
                                </div>

                                <select
                                    title={LABELS.filterTokenType}
                                    aria-label={LABELS.filterTokenType}
                                    className="admin-input h-9 text-sm"
                                    value={userTokenType}
                                    onChange={(e) => setUserTokenType(e.target.value as any)}
                                >
                                    <option value="ALL">?ÑÏ≤¥ ?∞Ïºì</option>
                                    {TOKEN_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>

                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-admin-text-secondary font-bold">ÏµúÏÜå</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={userMinBalanceInput}
                                        onChange={(e) => setUserMinBalanceInput(formatNumberInput(e.target.value))}
                                        className="admin-input h-9 w-24 text-sm text-right font-mono"
                                        aria-label="ÏµúÏÜå ?îÏï°"
                                        title="ÏµúÏÜå ?îÏï°"
                                    />
                                </div>

                                <label className="flex items-center gap-2 text-sm text-admin-text-secondary font-bold select-none">
                                    <input
                                        type="checkbox"
                                        checked={userIncludeZero}
                                        onChange={(e) => setUserIncludeZero(e.target.checked)}
                                        className="accent-admin-brand"
                                    />
                                    0 ?¨Ìï®
                                </label>
                            </div>
                        )}
                        {activeTab === 'inventory' && (
                            <div className="flex gap-2">
                                <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 h-9">
                                    <button
                                        onClick={() => setInventoryTabMode("ledger")}
                                        className={`px-3 text-xs font-bold rounded-md transition-colors ${inventoryTabMode === 'ledger' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Ledger
                                    </button>
                                    <button
                                        onClick={() => setInventoryTabMode("items")}
                                        className={`px-3 text-xs font-bold rounded-md transition-colors ${inventoryTabMode === 'items' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Items
                                    </button>
                                </div>
                                <div className="w-px h-9 bg-zinc-800 mx-1" />
                                <input
                                    type="text"
                                    placeholder="Item Type Filter..."
                                    value={inventoryFilters.itemType}
                                    onChange={(e) => setInventoryFilters(prev => ({ ...prev, itemType: e.target.value }))}
                                    className="admin-input h-9 w-40 text-sm"
                                />
                                {inventoryTabMode === 'items' && (
                                    <input
                                        type="number"
                                        placeholder="Min Qty"
                                        value={inventoryFilters.minQuantity || ""}
                                        onChange={(e) => setInventoryFilters(prev => ({ ...prev, minQuantity: Number(e.target.value) }))}
                                        className="admin-input h-9 w-24 text-sm"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Scrollable Table Area */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {activeTab === 'playLogs' && (
                            <table className="admin-table">
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
                                            <td className="px-4 text-sm text-admin-text-muted font-mono whitespace-nowrap tabular-nums">{formatKSTTime(log.created_at)}</td>
                                            <td className="px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-zinc-200">{log.nickname}</span>
                                                    <span className="text-sm text-admin-text-muted font-mono">{log.external_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 text-sm text-zinc-300 font-bold">{GAME_LABELS[log.game] || log.game}</td>
                                            <td className="px-4 text-right">
                                                <span className={`font-mono text-sm font-black tabular-nums ${log.reward_amount > 0 ? "text-emerald-400 font-black" : "text-zinc-600 font-medium"}`}>
                                                    {log.reward_amount > 0 ? "+" : ""}{log.reward_amount.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {activeTab === 'inventory' && (
                            <table className="admin-table">
                                <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                                    <tr>
                                        {inventoryTabMode === 'ledger' ? (
                                            <>
                                                <th className="admin-th">?úÍ∞Ñ</th>
                                                <th className="admin-th">User</th>
                                                <th className="admin-th">Item</th>
                                                <th className="admin-th text-right">Î≥Ä??/th>
                                                <th className="admin-th text-right">?îÏó¨</th>
                                                <th className="admin-th">?¨Ïú†</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="admin-th">User</th>
                                                <th
                                                    className="admin-th cursor-pointer select-none hover:bg-admin-hover transition-colors"
                                                    onClick={() => {
                                                        const field = "item_type";
                                                        if (inventorySortBy === field) setInventorySortDesc(!inventorySortDesc);
                                                        else { setInventorySortBy(field); setInventorySortDesc(true); }
                                                    }}
                                                >
                                                    Item {inventorySortBy === "item_type" && (inventorySortDesc ? "?? : "??)}
                                                </th>
                                                <th
                                                    className="admin-th cursor-pointer select-none hover:bg-admin-hover transition-colors text-right"
                                                    onClick={() => {
                                                        const field = "quantity";
                                                        if (inventorySortBy === field) setInventorySortDesc(!inventorySortDesc);
                                                        else { setInventorySortBy(field); setInventorySortDesc(true); }
                                                    }}
                                                >
                                                    ?òÎüâ {inventorySortBy === "quantity" && (inventorySortDesc ? "?? : "??)}
                                                </th>
                                                <th className="admin-th">?ÖÎç∞?¥Ìä∏</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {inventoryTabMode === 'ledger' ? (
                                        inventoryLedgerRows.map((entry) => (
                                            <tr key={entry.id} className="group hover:bg-white/5 transition-colors h-12 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedUserId(entry.user_id);
                                                    setIsDetailModalOpen(true);
                                                }}
                                            >
                                                <td className="px-4 text-sm text-admin-text-muted font-mono">{formatKSTTime(entry.created_at)}</td>
                                                <td className="px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-zinc-200">{entry.nickname || 'Unknown'}</span>
                                                        <span className="text-xs text-admin-text-muted font-mono">{entry.user_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 text-sm text-zinc-200">{entry.item_type}</td>
                                                <td className={`px-4 text-right text-sm font-mono font-bold ${entry.change_amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                    {entry.change_amount > 0 ? "+" : ""}{entry.change_amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 text-right text-sm font-mono text-zinc-400">{entry.balance_after.toLocaleString()}</td>
                                                <td className="px-4 text-xs text-zinc-500">{entry.reason}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        inventoryItemRows.map((item) => (
                                            <tr key={item.id} className="group hover:bg-white/5 transition-colors h-12 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedUserId(item.user_id);
                                                    setIsDetailModalOpen(true);
                                                }}
                                            >
                                                <td className="px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-zinc-200">{item.nickname || 'Unknown'}</span>
                                                        <span className="text-xs text-admin-text-muted font-mono">{item.user_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 text-sm text-zinc-200">{item.item_type}</td>
                                                <td className="px-4 text-right text-sm font-mono font-bold text-emerald-400">{item.quantity.toLocaleString()}</td>
                                                <td className="px-4 text-sm text-admin-text-muted font-mono">{formatKSTTime(item.updated_at)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                        {activeTab === 'ledger' && (
                            <table className="admin-table">
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
                                            <td className="px-4 text-sm text-admin-text-muted font-mono whitespace-nowrap">{formatKSTTime(entry.created_at)}</td>
                                            <td className="px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-zinc-200">{entry.nickname}</span>
                                                    <span className="text-sm text-admin-text-muted font-mono">{entry.external_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 text-sm text-zinc-300">{GAME_TOKEN_LABELS[entry.token_type] || entry.token_type}</td>
                                            <td className="px-4 text-right">
                                                <DeltaDisplay delta={entry.delta} />
                                            </td>
                                            <td className="px-4 text-right text-sm font-mono text-admin-text-muted">
                                                {entry.balance_after.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {/* Users Tab Simplified Logic */}
                        {activeTab === 'users' && (
                            <table className="admin-table">
                                <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                                    <tr>
                                        <th className="admin-th cursor-pointer select-none hover:bg-admin-hover transition-colors" onClick={() => toggleUserSort("user_id")}>USER ID</th>
                                        <th className="admin-th">INFO</th>
                                        {userTokenType !== "ALL" && (
                                            <th className="admin-th cursor-pointer select-none hover:bg-admin-hover transition-colors text-right" onClick={() => toggleUserSort("token")}>
                                                {GAME_TOKEN_LABELS[userTokenType]}
                                            </th>
                                        )}
                                        <th className="admin-th cursor-pointer select-none hover:bg-admin-hover transition-colors text-right" onClick={() => toggleUserSort("total")}>TOTAL ASSETS</th>
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
                                            <td className="px-4 text-sm font-mono text-admin-text-muted">{u.user_id}</td>
                                            <td className="px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-zinc-200">{u.nickname}</span>
                                                    <span className="text-sm text-admin-text-muted font-mono">{u.external_id}</span>
                                                </div>
                                            </td>
                                            {userTokenType !== "ALL" && (
                                                <td className="px-4 text-right text-sm font-mono text-zinc-100">
                                                    {getBalanceByType(u.balances, userTokenType).toLocaleString()}
                                                </td>
                                            )}
                                            <td className="px-4 text-right text-sm font-mono text-zinc-100">{sumBalances(u.balances).toLocaleString()}</td>
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
                                ???°ÏÖò (Actions)
                            </h3>
                            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                <button
                                    onClick={() => setFormMode("grant")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${formMode === 'grant' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    ÏßÄÍ∏?
                                </button>
                                <button
                                    onClick={() => setFormMode("revoke")}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${formMode === 'revoke' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    ?åÏàò
                                </button>
                            </div>
                        </div>

                        {/* Category Toggle */}
                        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                            <button
                                onClick={() => { setQuickActionCategory("TOKEN"); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${quickActionCategory === 'TOKEN' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
                            >
                                <Coins className="h-3.5 w-3.5" />
                                ?¨Ìôî (Tokens)
                            </button>
                            <button
                                onClick={() => { setQuickActionCategory("INVENTORY"); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${quickActionCategory === 'INVENTORY' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
                            >
                                <Package className="h-3.5 w-3.5" />
                                ?ÑÏù¥??(Inventory)
                            </button>
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
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200 border border-zinc-700 transition-colors"
                                >
                                    <ScrollText className="h-3.5 w-3.5" />
                                    <span>Í∏∞Î°ù Î≥¥Í∏∞</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 ml-0.5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setAppliedLedgerUserFilter(formData.userIdentifier);
                                        setLedgerUserFilterInput(formData.userIdentifier);
                                        setActiveTab("ledger");
                                    }}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200 border border-zinc-700 transition-colors"
                                >
                                    <History className="h-3.5 w-3.5" />
                                    <span>?êÏû• Î≥¥Í∏∞</span>
                                    <ExternalLink className="h-3 w-3 opacity-50 ml-0.5" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-zinc-300">?Ä???†Ï? (Target User)</label>
                                <input
                                    type="text"
                                    value={formData.userIdentifier}
                                    onChange={(e) => setFormData({ ...formData, userIdentifier: e.target.value })}
                                    placeholder={LABELS.labelUserIdPlaceholder}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-admin-brand outline-none transition-colors placeholder:text-zinc-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-zinc-300">
                                        {quickActionCategory === 'TOKEN' ? "?†ÌÅ∞ (Token)" : "?ÑÏù¥??(Item Type)"}
                                    </label>
                                    {quickActionCategory === 'TOKEN' ? (
                                        <select
                                            title={LABELS.labelTokenType}
                                            aria-label={LABELS.labelTokenType}
                                            value={formData.tokenType}
                                            onChange={(e) => setFormData({ ...formData, tokenType: e.target.value as GameTokenType })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-admin-brand outline-none"
                                        >
                                            {TOKEN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    ) : (
                                        <select
                                            title="?ÑÏù¥??Ï¢ÖÎ•ò"
                                            aria-label="?ÑÏù¥??Ï¢ÖÎ•ò"
                                            value={inventoryItemType}
                                            onChange={(e) => setInventoryItemType(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-admin-brand outline-none"
                                        >
                                            <option value="">?ÑÏù¥???†ÌÉù...</option>
                                            {INVENTORY_ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-zinc-300">?òÎüâ (Amount)</label>
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
                                <label className="text-sm font-semibold text-zinc-300">?¨Ïú† (Reason)</label>
                                <input
                                    type="text"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-admin-brand outline-none placeholder:text-zinc-500"
                                    placeholder="ÏßÄÍ∏??åÏàò ?¨Ïú† ?ÖÎ†• (Optional)"
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
                                {formMode === 'grant'
                                    ? `Grant ${quickActionCategory === 'TOKEN' ? 'Tokens' : 'Item'}`
                                    : `Revoke ${quickActionCategory === 'TOKEN' ? 'Tokens' : 'Item'}`
                                }
                            </button>
                        </form>
                    </div>

                    {/* Selected User Detail (Moved to Modal) */}
                </div>
            </div>

            <UserAssetDetailModal
                isVisible={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                userId={selectedUserId}
            />
        </section >
    );
};

export default TicketManagerPage;
