import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchStreakRewardDailyCounts,
  fetchStreakRewardUserEvents,
  type StreakRewardUserEvent,
} from "../api/adminStreakRewardsApi";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../api/adminUiConfigApi";
import EventRemoteControl from "../components/events/EventRemoteControl";

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
    if (ap !== bp) return bp - ap; // pinned first
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
        continue;
      }
      if (kind === "INVENTORY") {
        const itemType = String((g as any).item_type ?? "").trim();
        if (!itemType) continue;
        grants.push({ kind: "INVENTORY", item_type: itemType, amount: Math.floor(amount) });
        continue;
      }
    }
    rows.push({ day, enabled, pinned, grants });
  }

  const sorted = sortRules(rows);
  return sorted.length ? sorted : defaultRules();
};

const inputClass =
  "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";

const buttonPrimary =
  "inline-flex items-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60";

const buttonSecondary =
  "inline-flex items-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60";

const panelClass = "rounded-lg border border-[#333333] bg-[#111111] p-6";

const formatKst = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
};

const StreakRewardsAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // --- Daily counts ---
  const [day, setDay] = useState(todayStr);
  const dailyQuery = useQuery({
    queryKey: ["admin", "streak-rewards", "daily", day],
    queryFn: () => fetchStreakRewardDailyCounts(day),
  });

  // --- User events search ---
  const [userId, setUserId] = useState<string>("");
  const [externalId, setExternalId] = useState<string>("");
  const [filterDay, setFilterDay] = useState<string>(todayStr);
  const [limit, setLimit] = useState<number>(50);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const parsedUserId = useMemo(() => {
    const raw = userId.trim();
    if (!raw) return undefined;
    if (!/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, [userId]);

  const trimmedExternalId = useMemo(() => {
    const raw = externalId.trim();
    return raw ? raw : undefined;
  }, [externalId]);

  const userEventsQuery = useQuery({
    queryKey: ["admin", "streak-rewards", "user-events", userId, externalId, filterDay, limit],
    queryFn: () =>
      fetchStreakRewardUserEvents({
        user_id: typeof parsedUserId === "number" ? parsedUserId : undefined,
        external_id: trimmedExternalId,
        day: filterDay || undefined,
        limit,
      }),
    enabled: searchEnabled,
  });

  // --- Reward rules (config) ---
  const configQuery = useQuery({
    queryKey: ["admin", "ui-config", CONFIG_KEY],
    queryFn: () => fetchAdminUiConfig(CONFIG_KEY),
  });

  const initialRules = useMemo(() => coerceRules(configQuery.data?.value ?? null), [configQuery.data?.value]);
  const [rules, setRules] = useState<RuleRow[]>(defaultRules);
  const [rulesError, setRulesError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!configQuery.data) return;
    setRules(sortRules(initialRules));
  }, [configQuery.data, initialRules]);

  const saveRules = useMutation({
    mutationFn: async () => {
      setRulesError(null);

      const allowedWalletTokens: Set<string> = new Set([
        "ROULETTE_COIN",
        "DICE_TOKEN",
        "LOTTERY_TICKET",
        "TRIAL_TOKEN",
        "GOLD_KEY",
        "DIAMOND_KEY",
        "DIAMOND",
      ]);

      const payloadRules: Array<{ day: number; enabled: boolean; pinned?: boolean; grants: any[] }> = [];
      for (const row of rules) {
        const d = Number(row.day);
        if (!Number.isFinite(d) || d <= 0) continue;

        if (!Array.isArray(row.grants) || row.grants.length === 0) {
          payloadRules.push({ day: d, enabled: !!row.enabled, pinned: row.pinned === true, grants: [] });
          continue;
        }

        const grantsPayload: any[] = [];
        for (const g of row.grants) {
          const amount = Number((g as any).amount);
          if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(`Day ${d}: amount는 1 이상의 숫자여야 합니다`);
          }

          if (g.kind === "WALLET") {
            const tokenType = String((g as any).token_type ?? "").trim();
            if (!allowedWalletTokens.has(tokenType)) {
              throw new Error(`Day ${d}: 알 수 없는 token_type (${tokenType})`);
            }
            grantsPayload.push({ kind: "WALLET", token_type: tokenType, amount: Math.floor(amount) });
            continue;
          }
          if (g.kind === "INVENTORY") {
            const itemType = String((g as any).item_type ?? "").trim();
            if (!itemType) {
              throw new Error(`Day ${d}: item_type은 비어있을 수 없습니다`);
            }
            grantsPayload.push({ kind: "INVENTORY", item_type: itemType, amount: Math.floor(amount) });
            continue;
          }
          throw new Error(`Day ${d}: 알 수 없는 grant.kind`);
        }

        payloadRules.push({ day: d, enabled: !!row.enabled, pinned: row.pinned === true, grants: grantsPayload });
      }

      const value = { version: 1, rules: payloadRules };
      return upsertAdminUiConfig(CONFIG_KEY, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ui-config", CONFIG_KEY] });
    },
    onError: (err: any) => {
      setRulesError(err?.message ?? "저장 실패");
    },
  });

  const updatedAt = configQuery.data?.updated_at ? formatKst(configQuery.data.updated_at) : "-";

  const renderEventNameBadge = (name: string) => {
    const isGrant = name.startsWith("streak.reward_grant");
    const isSkip = name.startsWith("streak.reward_skip");
    const cls = isGrant
      ? "bg-green-900/30 text-green-200 border-green-500/30"
      : isSkip
        ? "bg-yellow-900/30 text-yellow-200 border-yellow-500/30"
        : "bg-slate-900/30 text-slate-200 border-slate-500/30";
    return <span className={`inline-flex rounded border px-2 py-0.5 text-xs ${cls}`}>{name}</span>;
  };

  const events: StreakRewardUserEvent[] = userEventsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#91F402]">스트릭 자동지급 운영</h1>
          <p className="mt-1 text-sm text-gray-400">
            Day3/Day7 자동지급 건수 및 유저별 지급/스킵 로그 조회, 보상 규칙 편집
          </p>
        </div>
      </header>

      <EventRemoteControl />

      <section className={panelClass}>
        <h2 className="text-lg font-medium text-white">금일 지급 현황</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-300">날짜</label>
          <input type="date" className={inputClass} style={{ maxWidth: 220 }} value={day} onChange={(e) => setDay(e.target.value)} />
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "streak-rewards", "daily", day] })}
          >
            새로고침
          </button>
        </div>

        {dailyQuery.isLoading && <div className="mt-4 text-gray-200">불러오는 중...</div>}
        {dailyQuery.isError && (
          <div className="mt-4 rounded border border-red-500/40 bg-red-950 p-3 text-red-100">
            불러오기 실패: {(dailyQuery.error as Error).message}
          </div>
        )}

        {dailyQuery.data && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#333333] bg-[#0A0A0A] p-4">
              <p className="text-xs text-gray-500">Day3 지급</p>
              <p className="mt-1 text-3xl font-bold text-white">{dailyQuery.data.grant_day3}</p>
              <p className="mt-2 text-xs text-gray-400">중복 스킵: {dailyQuery.data.skip_day3}</p>
            </div>
            <div className="rounded-lg border border-[#333333] bg-[#0A0A0A] p-4">
              <p className="text-xs text-gray-500">Day7 지급</p>
              <p className="mt-1 text-3xl font-bold text-white">{dailyQuery.data.grant_day7}</p>
              <p className="mt-2 text-xs text-gray-400">중복 스킵: {dailyQuery.data.skip_day7}</p>
            </div>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <h2 className="text-lg font-medium text-white">유저별 지급 로그 조회</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="text-sm text-gray-300">유저 ID</label>
            <input className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="예: 123" />
          </div>
          <div>
            <label className="text-sm text-gray-300">외부 ID</label>
            <input className={inputClass} value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="예: admin / telegram_..." />
          </div>
          <div>
            <label className="text-sm text-gray-300">날짜(옵션)</label>
            <input type="date" className={inputClass} value={filterDay} onChange={(e) => setFilterDay(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-300">최대 조회 개수</label>
            <input
              className={inputClass}
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value) || 50)}
              placeholder="50"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => {
              const hasAnyIdentifier = Boolean(userId.trim()) || Boolean(externalId.trim());
              if (!hasAnyIdentifier) {
                setSearchError("유저 ID 또는 외부 ID 중 하나는 반드시 입력해야 합니다.");
                setSearchEnabled(false);
                return;
              }

              if (parsedUserId === null) {
                setSearchError("유저 ID는 1 이상의 숫자여야 합니다.");
                setSearchEnabled(false);
                return;
              }

              setSearchError(null);
              setSearchEnabled(true);
              queryClient.invalidateQueries({
                queryKey: ["admin", "streak-rewards", "user-events", userId, externalId, filterDay, limit],
              });
            }}
          >
            조회
          </button>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => {
              setSearchError(null);
              setSearchEnabled(false);
              queryClient.removeQueries({ queryKey: ["admin", "streak-rewards", "user-events"] });
            }}
          >
            결과 지우기
          </button>
        </div>

        {searchError ? <div className="mt-3 text-sm text-red-200">{searchError}</div> : null}

        {userEventsQuery.isFetching && <div className="mt-4 text-gray-200">조회 중...</div>}
        {userEventsQuery.isError && (
          <div className="mt-4 rounded border border-red-500/40 bg-red-950 p-3 text-red-100">
            조회 실패: {(userEventsQuery.error as any)?.response?.data?.detail || (userEventsQuery.error as Error).message}
          </div>
        )}

        {userEventsQuery.data && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-gray-300">
              대상 유저: <span className="text-white">{userEventsQuery.data.user.id}</span> · external_id: {" "}
              <span className="text-white">{userEventsQuery.data.user.external_id}</span>
              {userEventsQuery.data.user.nickname ? (
                <>
                  {" "}· 닉네임: <span className="text-white">{userEventsQuery.data.user.nickname}</span>
                </>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#333333] bg-[#0A0A0A]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#333333] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">시간(KST)</th>
                    <th className="px-4 py-3">이벤트</th>
                    <th className="px-4 py-3">메타</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={3}>
                        로그가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id} className="border-b border-[#222222] last:border-0">
                        <td className="px-4 py-3 text-gray-200">{formatKst(ev.created_at)}</td>
                        <td className="px-4 py-3">{renderEventNameBadge(ev.event_name)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(ev.meta_json, null, 2)}</pre>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-white">스트릭 보상 규칙 편집 (Day별)</h2>
          <p className="text-xs text-gray-500">키: {CONFIG_KEY} · 최근 저장: {updatedAt}</p>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          보상은 JSON으로 저장됩니다. 각 Day에 대해 grants는 JSON 배열이며, 예: {"{"} kind: "WALLET", token_type: "ROULETTE_COIN", amount: 1 {"}"}
        </p>

        {configQuery.isLoading && <div className="mt-4 text-gray-200">불러오는 중...</div>}
        {configQuery.isError && (
          <div className="mt-4 rounded border border-red-500/40 bg-red-950 p-3 text-red-100">
            불러오기 실패: {(configQuery.error as Error).message}
          </div>
        )}

        {!configQuery.isLoading && !configQuery.isError && (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={buttonSecondary} onClick={() => setRules(defaultRules())}>
                기본값(3/7)로 초기화
              </button>
              <button type="button" className={buttonSecondary} onClick={() => setRules(sortRules(initialRules))}>
                현재 저장값으로 되돌리기
              </button>
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => setRules((prev) => sortRules([...prev, { day: 1, enabled: true, pinned: false, grants: [] }]))}
              >
                행 추가
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-[#333333] bg-[#0A0A0A]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#333333] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">일차(Day)</th>
                    <th className="px-4 py-3">핀</th>
                    <th className="px-4 py-3">활성</th>
                    <th className="px-4 py-3">보상</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((row, idx) => (
                    <tr key={`${row.day}-${idx}`} className="border-b border-[#222222] align-top last:border-0">
                      <td className="px-4 py-3">
                        <input
                          className={inputClass}
                          style={{ width: 96 }}
                          value={String(row.day)}
                          onChange={(e) => {
                            const next = Number(e.target.value) || 0;
                            setRules((prev) => sortRules(prev.map((r, i) => (i === idx ? { ...r, day: next } : r))));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-gray-200">
                          <input
                            type="checkbox"
                            checked={row.pinned === true}
                            onChange={(e) => setRules((prev) => sortRules(prev.map((r, i) => (i === idx ? { ...r, pinned: e.target.checked } : r))))}
                          />
                          고정
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-gray-200">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) =>
                              setRules((prev) => sortRules(prev.map((r, i) => (i === idx ? { ...r, enabled: e.target.checked } : r))))
                            }
                          />
                          활성
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {row.grants.length === 0 ? (
                            <div className="text-xs text-gray-500">보상 없음</div>
                          ) : null}

                          {row.grants.map((g, gIdx) => (
                            <div key={`${idx}-${gIdx}`} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                              <div className="md:col-span-3">
                                <select
                                  className={inputClass}
                                  value={g.kind}
                                  onChange={(e) => {
                                    const nextKind = e.target.value as "WALLET" | "INVENTORY";
                                    setRules((prev) =>
                                      prev.map((r, i) => {
                                        if (i !== idx) return r;
                                        const nextGrants = r.grants.map((gg, ii) => {
                                          if (ii !== gIdx) return gg;
                                          if (nextKind === "WALLET") {
                                            return { kind: "WALLET", token_type: "ROULETTE_COIN", amount: 1 } as GrantRow;
                                          }
                                          return { kind: "INVENTORY", item_type: "DIAMOND", amount: 1 } as GrantRow;
                                        });
                                        return { ...r, grants: nextGrants };
                                      })
                                    );
                                  }}
                                >
                                  <option value="WALLET">지갑(WALLET)</option>
                                  <option value="INVENTORY">인벤토리(INVENTORY)</option>
                                </select>
                              </div>

                              <div className="md:col-span-5">
                                {g.kind === "WALLET" ? (
                                  <select
                                    className={inputClass}
                                    value={(g as any).token_type}
                                    onChange={(e) => {
                                      const nextToken = e.target.value as WalletTokenType;
                                      setRules((prev) =>
                                        prev.map((r, i) => {
                                          if (i !== idx) return r;
                                          const nextGrants = r.grants.map((gg, ii) =>
                                            ii === gIdx ? ({ ...gg, token_type: nextToken } as GrantRow) : gg
                                          );
                                          return { ...r, grants: nextGrants };
                                        })
                                      );
                                    }}
                                  >
                                    <option value="ROULETTE_COIN">ROULETTE_COIN</option>
                                    <option value="DICE_TOKEN">DICE_TOKEN</option>
                                    <option value="LOTTERY_TICKET">LOTTERY_TICKET</option>
                                    <option value="TRIAL_TOKEN">TRIAL_TOKEN</option>
                                    <option value="GOLD_KEY">GOLD_KEY</option>
                                    <option value="DIAMOND_KEY">DIAMOND_KEY</option>
                                    <option value="DIAMOND">DIAMOND</option>
                                  </select>
                                ) : (
                                  <input
                                    className={inputClass}
                                    value={(g as any).item_type}
                                    onChange={(e) => {
                                      const nextItem = e.target.value;
                                      setRules((prev) =>
                                        prev.map((r, i) => {
                                          if (i !== idx) return r;
                                          const nextGrants = r.grants.map((gg, ii) =>
                                            ii === gIdx ? ({ ...gg, item_type: nextItem } as GrantRow) : gg
                                          );
                                          return { ...r, grants: nextGrants };
                                        })
                                      );
                                    }}
                                    placeholder="예: DIAMOND"
                                  />
                                )}
                              </div>

                              <div className="md:col-span-2">
                                <input
                                  className={inputClass}
                                  value={String((g as any).amount ?? 1)}
                                  onChange={(e) => {
                                    const nextAmount = Number(e.target.value) || 0;
                                    setRules((prev) =>
                                      prev.map((r, i) => {
                                        if (i !== idx) return r;
                                        const nextGrants = r.grants.map((gg, ii) =>
                                          ii === gIdx ? ({ ...gg, amount: nextAmount } as GrantRow) : gg
                                        );
                                        return { ...r, grants: nextGrants };
                                      })
                                    );
                                  }}
                                  placeholder="수량"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <button
                                  type="button"
                                  className={buttonSecondary}
                                  onClick={() => {
                                    setRules((prev) =>
                                      prev.map((r, i) => {
                                        if (i !== idx) return r;
                                        return { ...r, grants: r.grants.filter((_, ii) => ii !== gIdx) };
                                      })
                                    );
                                  }}
                                >
                                  제거
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={buttonSecondary}
                              onClick={() => {
                                setRules((prev) =>
                                  prev.map((r, i) => {
                                    if (i !== idx) return r;
                                    return {
                                      ...r,
                                      grants: [...r.grants, { kind: "WALLET", token_type: "ROULETTE_COIN", amount: 1 }],
                                    };
                                  })
                                );
                              }}
                            >
                              + 지갑 보상
                            </button>
                            <button
                              type="button"
                              className={buttonSecondary}
                              onClick={() => {
                                setRules((prev) =>
                                  prev.map((r, i) => {
                                    if (i !== idx) return r;
                                    return { ...r, grants: [...r.grants, { kind: "INVENTORY", item_type: "DIAMOND", amount: 1 }] };
                                  })
                                );
                              }}
                            >
                              + 인벤토리 보상
                            </button>
                          </div>

                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-400">JSON 미리보기</summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-400">
                              {JSON.stringify(row.grants, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className={buttonSecondary}
                          onClick={() => setRules((prev) => sortRules(prev.filter((_, i) => i !== idx)))}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={buttonPrimary} disabled={saveRules.isPending} onClick={() => saveRules.mutate()}>
                {saveRules.isPending ? "저장 중..." : "저장"}
              </button>
              {rulesError ? <span className="text-sm text-red-200">{rulesError}</span> : null}
              {saveRules.isSuccess ? <span className="text-sm text-gray-200">저장 완료</span> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StreakRewardsAdminPage;
