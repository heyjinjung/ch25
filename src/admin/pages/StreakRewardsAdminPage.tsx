import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchStreakRewardDailyCounts,
  fetchStreakRewardUserEvents,
} from "../api/adminStreakRewardsApi";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../api/adminUiConfigApi";
import EventRemoteControl from "../components/events/EventRemoteControl";
import {
  Flame,
  RefreshCw,
  Search,
  Trash2,
  Plus,
  ChevronRight,
  CheckCircle2,
  SkipForward,
  Calendar,
  Settings2,
  History,
  Save,
  LayoutGrid,
  Wallet,
  Package,
  AlertCircle,
  Info,
} from "lucide-react";

const CONFIG_KEY = "streak_reward_rules";

type WalletTokenType =
  | "ROULETTE_COIN"
  | "DICE_TOKEN"
  | "LOTTERY_TICKET"
  | "TRIAL_TOKEN"
  | "GOLD_KEY"
  | "DIAMOND_KEY"
  | "DIAMOND";

type GrantRow =
  | {
    kind: "WALLET";
    token_type: WalletTokenType;
    amount: number;
  }
  | {
    kind: "INVENTORY";
    item_type: string;
    amount: number;
  };

type RuleRow = {
  day: number;
  enabled: boolean;
  pinned?: boolean;
  grants: GrantRow[];
};

const defaultRules = (): RuleRow[] => [
  {
    day: 3,
    enabled: true,
    pinned: true,
    grants: [
      { kind: "WALLET", token_type: "ROULETTE_COIN", amount: 1 },
      { kind: "WALLET", token_type: "DICE_TOKEN", amount: 1 },
      { kind: "WALLET", token_type: "LOTTERY_TICKET", amount: 1 },
    ],
  },
  {
    day: 7,
    enabled: true,
    pinned: true,
    grants: [{ kind: "INVENTORY", item_type: "DIAMOND", amount: 1 }],
  },
];

const sortRules = (rows: RuleRow[]) => {
  return [...rows].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.day - b.day;
  });
};

const coerceRules = (value: any): RuleRow[] => {
  const rawRules = value?.rules;
  if (!Array.isArray(rawRules)) return defaultRules();
  const rows: RuleRow[] = [];
  for (const raw of rawRules) {
    if (!raw || typeof raw !== "object") continue;
    const day = Number(raw.day);
    if (!Number.isFinite(day) || day <= 0) continue;
    const enabled = raw.enabled === false ? false : true;
    const pinned = raw.pinned === true;
    const rawGrants = Array.isArray(raw.grants) ? raw.grants : [];
    const grants: GrantRow[] = [];
    for (const g of rawGrants) {
      if (!g || typeof g !== "object") continue;
      const kind = g.kind;
      const amount = Number(g.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (kind === "WALLET") {
        const tokenType = String((g as any).token_type ?? "").trim() as WalletTokenType;
        if (!tokenType) continue;
        grants.push({ kind: "WALLET", token_type: tokenType, amount: Math.floor(amount) });
      } else if (kind === "INVENTORY") {
        const itemType = String((g as any).item_type ?? "").trim();
        if (!itemType) continue;
        grants.push({ kind: "INVENTORY", item_type: itemType, amount: Math.floor(amount) });
      }
    }
    rows.push({ day, enabled, pinned, grants });
  }
  const sorted = sortRules(rows);
  return sorted.length ? sorted : defaultRules();
};

const formatKSTTimeCompact = (iso: string) => {
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
};

const StreakRewardsAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // --- State ---
  const [day, setDay] = useState(todayStr);
  const [userId, setUserId] = useState<string>("");
  const [filterDay, setFilterDay] = useState<string>(todayStr);
  const [limit, setLimit] = useState<number>(50);
  const [searchEnabled, setSearchEnabled] = useState(false);

  // --- Queries ---
  const dailyQuery = useQuery({
    queryKey: ["admin", "streak-rewards", "daily", day],
    queryFn: () => fetchStreakRewardDailyCounts(day),
  });

  const parsedUserId = useMemo(() => {
    const raw = userId.trim();
    if (!raw) return undefined;
    if (!/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [userId]);

  const userEventsQuery = useQuery({
    queryKey: ["admin", "streak-rewards", "user-events", userId, filterDay, limit],
    queryFn: () => fetchStreakRewardUserEvents({
      user_id: typeof parsedUserId === "number" ? parsedUserId : undefined,
      day: filterDay || undefined,
      limit,
    }),
    enabled: searchEnabled,
  });

  const configQuery = useQuery({
    queryKey: ["admin", "ui-config", CONFIG_KEY],
    queryFn: () => fetchAdminUiConfig(CONFIG_KEY),
  });

  const initialRules = useMemo(() => coerceRules(configQuery.data?.value ?? null), [configQuery.data?.value]);
  const [rules, setRules] = useState<RuleRow[]>([]);

  React.useEffect(() => {
    if (configQuery.data) {
      setRules(sortRules(initialRules));
    }
  }, [configQuery.data, initialRules]);

  const saveRules = useMutation({
    mutationFn: async () => {
      const value = { version: 1, rules };
      return upsertAdminUiConfig(CONFIG_KEY, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ui-config", CONFIG_KEY] });
    },
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "streak-rewards"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "ui-config", CONFIG_KEY] });
  };

  const renderEventBadge = (name: string) => {
    const isGrant = name.includes("grant");
    const isSkip = name.includes("skip");
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${isGrant ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isSkip ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
        {name.replace("streak.", "")}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
            <span>시스템 관리</span>
            <ChevronRight size={12} />
            <span className="text-zinc-300">스트릭 보상</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Flame className="text-admin-brand" size={28} />
            스트릭 보상 관리
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-all text-sm font-bold"
          >
            <RefreshCw size={16} />
            전체 새로고침
          </button>
          <button
            disabled={saveRules.isPending}
            onClick={() => saveRules.mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-admin-brand hover:brightness-110 text-black rounded-xl transition-all text-sm font-black shadow-lg shadow-admin-brand/20 disabled:opacity-50"
          >
            <Save size={16} />
            {saveRules.isPending ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </div>

      <EventRemoteControl />

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day 3 Grants</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{dailyQuery.data?.grant_day3 || 0}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <Calendar size={12} />
            <span>{day} 기준</span>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day 3 Skips</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{dailyQuery.data?.skip_day3 || 0}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
              <SkipForward size={20} />
            </div>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day 7 Grants</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{dailyQuery.data?.grant_day7 || 0}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day 7 Skips</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{dailyQuery.data?.skip_day7 || 0}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
              <SkipForward size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Rules Editor */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-admin-brand" />
              보상 규칙 (Rewards Rules)
            </h2>
            <button
              onClick={() => setRules(sortRules([...rules, { day: 1, enabled: true, grants: [] }]))}
              className="text-[11px] font-black bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-all"
            >
              <Plus size={14} />
              Day 추가
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {rules.map((rule, idx) => (
              <div key={`${rule.day}-${idx}`} className={`admin-card p-4 border-l-4 transition-all ${rule.enabled ? 'border-l-admin-brand' : 'border-l-zinc-700 opacity-60'}`}>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Day Input */}
                  <div className="w-full md:w-32 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Day</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={rule.day}
                        onChange={(e) => {
                          const next = Number(e.target.value) || 0;
                          setRules(prev => prev.map((r, i) => i === idx ? { ...r, day: next } : r));
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-admin-brand outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Grants Editor */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">지급 보상 (Grants)</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRules(prev => prev.map((r, i) => i === idx ? { ...r, grants: [...r.grants, { kind: "WALLET", token_type: "ROULETTE_COIN", amount: 1 }] } : r))}
                          className="text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <Wallet size={12} />
                          지갑+
                        </button>
                        <button
                          onClick={() => setRules(prev => prev.map((r, i) => i === idx ? { ...r, grants: [...r.grants, { kind: "INVENTORY", item_type: "DIAMOND", amount: 1 }] } : r))}
                          className="text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <Package size={12} />
                          인벤+
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {rule.grants.length === 0 && (
                        <div className="text-xs text-zinc-600 italic py-2 border border-dashed border-zinc-800 rounded-lg text-center">
                          지정된 보상이 없습니다.
                        </div>
                      )}
                      {rule.grants.map((g, gIdx) => (
                        <div key={gIdx} className="flex flex-wrap items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 group/grant">
                          <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                            {g.kind === "WALLET" ? (
                              <select
                                value={g.token_type}
                                onChange={(e) => {
                                  const next = e.target.value as WalletTokenType;
                                  setRules(prev => prev.map((r, i) => i === idx ? { ...r, grants: r.grants.map((gg, ii) => ii === gIdx ? { ...gg, token_type: next } as GrantRow : gg) } : r));
                                }}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-bold focus:border-emerald-500 outline-none"
                              >
                                <option value="ROULETTE_COIN">🪙 Roulette Coin</option>
                                <option value="DICE_TOKEN">🎲 Dice Token</option>
                                <option value="LOTTERY_TICKET">🎟️ Lottery Ticket</option>
                                <option value="GOLD_KEY">🔑 Gold Key</option>
                                <option value="DIAMOND_KEY">💎 Diamond Key</option>
                                <option value="DIAMOND">💠 Diamond</option>
                              </select>
                            ) : (
                              <input
                                value={(g as any).item_type}
                                onChange={(e) => {
                                  setRules(prev => prev.map((r, i) => i === idx ? { ...r, grants: r.grants.map((gg, ii) => ii === gIdx ? { ...gg, item_type: e.target.value } as GrantRow : gg) } : r));
                                }}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-blue-400 font-bold focus:border-blue-500 outline-none"
                                placeholder="아이템 코드 입력"
                              />
                            )}
                            <input
                              type="number"
                              value={g.amount}
                              onChange={(e) => {
                                const amt = Number(e.target.value) || 0;
                                setRules(prev => prev.map((r, i) => i === idx ? { ...r, grants: r.grants.map((gg, ii) => ii === gIdx ? { ...gg, amount: amt } as GrantRow : gg) } : r));
                              }}
                              className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white text-right font-mono outline-none"
                            />
                          </div>
                          <button
                            onClick={() => setRules(prev => prev.map((r, i) => i === idx ? { ...r, grants: r.grants.filter((_, ii) => ii !== gIdx) } : r))}
                            className="p-1 hover:text-rose-400 text-zinc-600 transition-colors opacity-0 group-hover/grant:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-24 flex md:flex-col justify-between items-end gap-2 text-[10px] font-bold">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <span className={rule.enabled ? 'text-emerald-400' : 'text-zinc-500'}>{rule.enabled ? '활성' : '비활성'}</span>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => setRules(prev => prev.map((r, i) => i === idx ? { ...r, enabled: e.target.checked } : r))}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-admin-brand focus:ring-offset-0 focus:ring-0"
                      />
                    </label>
                    <button
                      onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Search & Logs */}
        <div className="space-y-4">
          <div className="admin-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-admin-brand" />
                이벤트 로그 조회 (Logs)
              </h2>
              <Info size={14} className="text-zinc-600" />
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">사용자 ID</label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="UID"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-admin-brand outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">최대 결과</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value) || 50)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-admin-brand outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">조회 대상 날짜</label>
                <input
                  type="date"
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-admin-brand outline-none transition-colors"
                />
              </div>

              <button
                onClick={() => {
                  if (!userId.trim()) return;
                  setSearchEnabled(true);
                  userEventsQuery.refetch();
                }}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Search size={16} />
                이벤트 조회
              </button>
            </div>
          </div>

          {/* Quick Daily Search Card */}
          <div className="admin-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-admin-brand" />
                금일 현황 날짜 변경
              </h2>
            </div>
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-admin-brand outline-none transition-colors"
            />
          </div>

          {/* Real-time Status Alert */}
          <div className="bg-admin-brand/5 border border-admin-brand/20 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="text-admin-brand shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-xs font-bold text-admin-brand">주의 사항</p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">보상 규칙 변경시 저장 버튼을 반드시 눌러주세요. 이미 지급된 스트릭 보상은 회수되지 않으며 익일 자정(00:00)부터 새 규칙이 적용됩니다.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Results Table */}
      {searchEnabled && (
        <div className="admin-card overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              최근 발생 이벤트 (Recent User Events)
            </h2>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">UID: {userEventsQuery.data?.user.id || '-'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">일시 (KST)</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">이벤트명</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">메타 데이터</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {userEventsQuery.data?.items.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-[10px] text-zinc-400 font-mono whitespace-nowrap tabular-nums">{formatKSTTimeCompact(ev.created_at)}</td>
                    <td className="px-4 py-3">{renderEventBadge(ev.event_name)}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[400px] overflow-hidden">
                        <code className="text-[10px] text-zinc-500 block truncate hover:text-zinc-300 cursor-help" title={JSON.stringify(ev.meta_json)}>
                          {JSON.stringify(ev.meta_json)}
                        </code>
                      </div>
                    </td>
                  </tr>
                ))}
                {userEventsQuery.data?.items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-zinc-600">조회된 이벤트가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreakRewardsAdminPage;
