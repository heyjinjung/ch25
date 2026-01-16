import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dice6,
  Zap,
  Target,
  Trophy,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  BarChart3,
  Edit3,
  Gamepad2,
  ChevronRight,
  Settings2,
  Save,
  Info,
  CheckCircle2,
  ShieldAlert,
  Tags,
  Plus,
} from "lucide-react";
import {
  fetchDiceConfigs,
  getEventParams,
  updateEventParams,
  updateDiceConfig,
  createDiceConfig,
  DiceEventParams,
  AdminDiceConfig,
} from "../api/adminDiceApi";
import { useToast } from "../../components/common/ToastProvider";


const DiceConfigPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState<AdminDiceConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newConfig, setNewConfig] = useState<{
    name: string;
    max_daily_plays: number;
    win_reward_type: string;
    win_reward_amount: number;
    draw_reward_type: string;
    draw_reward_amount: number;
    lose_reward_type: string;
    lose_reward_amount: number;
  }>({
    name: "새로운 주사위 전략",
    max_daily_plays: 30,
    win_reward_type: "POINT",
    win_reward_amount: 1000,
    draw_reward_type: "POINT",
    draw_reward_amount: 500,
    lose_reward_type: "POINT",
    lose_reward_amount: 100,
  });
  const [localEventParams, setLocalEventParams] = useState<DiceEventParams | null>(null);

  // --- Queries ---
  const { data: configs, isLoading: configsLoading, isError: configsError } = useQuery({
    queryKey: ["admin", "dice", "configs"],
    queryFn: fetchDiceConfigs,
  });

  const { data: eventParams, isLoading: eventLoading, isError: eventError } = useQuery({
    queryKey: ["admin", "dice", "event-params"],
    queryFn: getEventParams,
  });

  useEffect(() => {
    if (eventParams) {
      setLocalEventParams(JSON.parse(JSON.stringify(eventParams)));
    }
  }, [eventParams]);

  // --- Mutations ---
  const updateEventMutation = useMutation({
    mutationFn: updateEventParams,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dice", "event-params"] });
      addToast("전역 전략 설정이 저장되었습니다.", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "저장 실패";
      addToast(msg, "error");
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateDiceConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dice", "configs"] });
      setEditingConfig(null);
      addToast("보상 설정이 저장되었습니다.", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "저장 실패";
      addToast(msg, "error");
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: createDiceConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dice", "configs"] });
      setIsCreating(false);
      addToast("새로운 전략이 생성되었습니다.", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "생성 실패";
      addToast(msg, "error");
    },
  });

  // --- Handlers ---
  const handleSaveConfig = (id: number) => {
    if (!editingConfig) return;
    const {
      name,
      is_active,
      max_daily_plays,
      win_reward_type,
      win_reward_amount,
      draw_reward_type,
      draw_reward_amount,
      lose_reward_type,
      lose_reward_amount,
    } = editingConfig;

    updateConfigMutation.mutate({
      id,
      payload: {
        name,
        is_active,
        max_daily_plays,
        win_reward_type,
        win_reward_amount,
        draw_reward_type,
        draw_reward_amount,
        lose_reward_type,
        lose_reward_amount,
      },
    });
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "dice"] });
  };

  const handleCreateConfig = () => {
    createConfigMutation.mutate({
      ...newConfig,
      is_active: true,
      win_reward_type: newConfig.win_reward_type,
      draw_reward_type: newConfig.draw_reward_type,
      lose_reward_type: newConfig.lose_reward_type,
    });
  };

  // --- Stats ---
  const activeConfigsCount = useMemo(() => (configs ?? []).filter((c) => c.is_active).length, [configs]);
  const winRate = useMemo(() => localEventParams?.probability?.DICE?.p_win ?? 0, [localEventParams]);

  if (configsLoading || eventLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <RefreshCw className="h-10 w-10 text-admin-brand animate-spin" />
        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">주사위 메커니즘 엔진 준비 중...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
            <span>시스템 관리</span>
            <ChevronRight size={12} />
            <span className="text-zinc-300">주사위 설정</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Dice6 className="text-admin-brand" size={28} />
            주사위 메커니즘 엔진
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-all text-sm font-bold"
          >
            <RefreshCw size={16} />
            엔진 새로고침
          </button>
          {localEventParams && (
            <button
              onClick={() => updateEventMutation.mutate(localEventParams)}
              disabled={updateEventMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-admin-brand hover:brightness-110 text-black rounded-xl transition-all text-sm font-black shadow-lg shadow-admin-brand/20 disabled:opacity-50"
            >
              <Save size={16} />
              {updateEventMutation.isPending ? "저장 중..." : "전역 전략 저장"}
            </button>
          )}
        </div>
      </div>

      {/* Error States */}
      {(configsError || eventError) && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 text-rose-400">
          <AlertCircle size={24} />
          <p className="text-sm font-bold">엔진 데이터를 불러오는 데 실패했습니다. 통신 상태를 확인해주세요.</p>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Engines</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{activeConfigsCount} / {configs?.length || 0}</h3>
            </div>
            <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
              <Gamepad2 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>OPERATIONAL</span>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Win Rate</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">{(winRate * 100).toFixed(1)}%</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
              <Target size={20} />
            </div>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Daily Gain</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">
                {localEventParams?.caps?.DICE?.daily_gain?.toLocaleString() || "UNLIMITED"}
              </h3>
            </div>
            <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Play Limit</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">
                {localEventParams?.caps?.DICE?.daily_plays?.toLocaleString() || "0"}
              </h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Global Strategy & Event Params */}
        <div className="xl:col-span-1 space-y-6">
          <div className="admin-card p-6 space-y-6 border-t-4 border-t-admin-brand">
            <div className="flex items-center gap-2">
              <Settings2 className="text-admin-brand" size={20} />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">전역 전략 설정 (Global Strategy)</h2>
            </div>

            {localEventParams && (
              <div className="space-y-6">
                {/* Probabilities */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <Zap size={14} className="text-amber-400" />
                    승패 확률 (Probability)
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: "승리 확률 (Win)", key: "p_win", color: "text-emerald-400" },
                      { label: "무승부 확률 (Draw)", key: "p_draw", color: "text-zinc-400" },
                      { label: "패배 확률 (Lose)", key: "p_lose", color: "text-rose-400" },
                    ].map((p) => (
                      <div key={p.key} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                          <span>{p.label}</span>
                          <span className={`${p.color} font-mono`}>
                            {((localEventParams.probability?.DICE?.[p.key as keyof NonNullable<DiceEventParams["probability"]>["DICE"]] || 0) * 100).toFixed(2)}%
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.001"
                          value={localEventParams.probability?.DICE?.[p.key as keyof NonNullable<DiceEventParams["probability"]>["DICE"]] || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLocalEventParams({
                              ...localEventParams,
                              probability: {
                                DICE: {
                                  ...localEventParams.probability?.DICE,
                                  [p.key]: val,
                                } as any,
                              },
                            });
                          }}
                          className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-white focus:border-admin-brand outline-none transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Caps */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <ShieldAlert size={14} className="text-zinc-400" />
                    제한 설정 (Global Caps)
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500">일일 누적 획득 한도 (Daily Gain)</label>
                      <input
                        type="number"
                        value={localEventParams.caps?.DICE?.daily_gain || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setLocalEventParams({
                            ...localEventParams,
                            caps: {
                              DICE: {
                                ...localEventParams.caps?.DICE,
                                daily_gain: val,
                              },
                            },
                          });
                        }}
                        className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-white font-mono focus:border-admin-brand outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500">일일 플레이 횟수 제한 (Daily Plays)</label>
                      <input
                        type="number"
                        value={localEventParams.caps?.DICE?.daily_plays || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setLocalEventParams({
                            ...localEventParams,
                            caps: {
                              DICE: {
                                ...localEventParams.caps?.DICE,
                                daily_plays: val,
                              },
                            },
                          });
                        }}
                        className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-white font-mono focus:border-admin-brand outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Eligibility */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <Tags size={14} className="text-zinc-400" />
                    접속 제한 대상 (Eligibility Tags)
                  </div>
                  <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Blocklist Tags</span>
                      <span className="text-[10px] font-black text-admin-brand">{localEventParams.eligibility?.tags?.blocklist?.length || 0} TAGS</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                      {localEventParams.eligibility?.tags?.blocklist?.join(", ") || "NO RESTRICTED TAGS"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-admin-brand/5 border border-admin-brand/20 rounded-2xl p-4 flex gap-3">
            <Info className="text-admin-brand shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-xs font-bold text-admin-brand">참고 사항</p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                전역 전략 설정은 모든 주사위 게임 인스턴스에 공통 적용됩니다. 보상은 유저의 금고 잠금 잔고에 반영되며, 리스크 한도 도달 시 더 이상의 보상 획득이 제한됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Configuration List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-admin-brand" />
              보상 메커니즘 설정 (Reward Mechanisms)
            </h2>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-admin-brand rounded-lg border border-admin-brand/30 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Plus size={14} />
              전략 추가
            </button>
          </div>

          {isCreating && (
            <div className="admin-card p-5 border-2 border-dashed border-admin-brand/30 bg-admin-brand/5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-admin-brand uppercase tracking-widest">새 전략 생성</h3>
                <div className="flex gap-2">
                  <button onClick={() => setIsCreating(false)} className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">CANCEL</button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">엔진 이름</label>
                  <input
                    type="text"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:border-admin-brand outline-none"
                    placeholder="예: VIP 고배율 전략"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "승리 보상", key: "win_reward_amount" },
                    { label: "무승부 보상", key: "draw_reward_amount" },
                    { label: "패배 보상", key: "lose_reward_amount" },
                    { label: "플레이 한도", key: "max_daily_plays" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">{field.label}</label>
                      <input
                        type="number"
                        value={newConfig[field.key as keyof typeof newConfig] as number}
                        onChange={(e) => setNewConfig({ ...newConfig, [field.key]: parseInt(e.target.value) || 0 })}
                        className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCreateConfig}
                  disabled={createConfigMutation.isPending}
                  className="w-full py-4 bg-admin-brand text-black rounded-2xl font-black text-sm shadow-xl shadow-admin-brand/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {createConfigMutation.isPending ? <RefreshCw className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  새로운 메커니즘 즉시 활성화
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {configs?.length === 0 && !isCreating && (
              <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-50 grayscale hover:grayscale-0 transition-all">
                <Dice6 size={48} className="text-zinc-600 mb-4" />
                <p className="text-sm font-bold text-zinc-500">등록된 보상 메커니즘이 없습니다.</p>
                <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">상단의 전략 추가 버튼을 눌러 엔진을 가동하세요.</p>
              </div>
            )}
            {(configs ?? []).map((config) => (
              <div key={config.id} className={`admin-card overflow-hidden border-l-4 transition-all ${config.is_active ? 'border-l-admin-brand' : 'border-l-zinc-800 opacity-60'}`}>
                <div className="p-5 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${config.is_active ? 'bg-admin-brand/10 text-admin-brand shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Dice6 size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white tracking-tight">{config.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${config.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                          {config.is_active ? 'RUNNING' : 'STANDBY'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Trophy size={14} className="text-amber-400" />
                          <span className="font-bold text-zinc-300">WIN: {config.win_reward_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 border-l border-zinc-800 pl-4">
                          <Zap size={14} className="text-zinc-500" />
                          <span className="font-bold text-zinc-300">DRAW: {config.draw_reward_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 border-l border-zinc-800 pl-4">
                          <AlertCircle size={14} className="text-zinc-500" />
                          <span className="font-bold text-zinc-300">LOSE: {config.lose_reward_amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingConfig?.id === config.id ? (
                      <div className="flex gap-2 animate-in fade-in duration-300">
                        <button
                          onClick={() => setEditingConfig(null)}
                          className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 text-xs font-bold transition-all"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleSaveConfig(config.id)}
                          disabled={updateConfigMutation.isPending}
                          className="h-10 px-4 bg-admin-brand text-black rounded-xl text-xs font-black shadow-lg shadow-admin-brand/20 transition-all flex items-center gap-2"
                        >
                          {updateConfigMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                          적용
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingConfig(config)}
                        className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 flex items-center gap-2 transition-all text-sm font-bold"
                      >
                        <Edit3 size={16} />
                        보상 수정
                      </button>
                    )}
                  </div>
                </div>

                {editingConfig?.id === config.id && (
                  <div className="px-5 pb-5 pt-1 border-t border-zinc-800/50 bg-zinc-900/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">승리 보상량</label>
                        <input
                          type="number"
                          value={editingConfig.win_reward_amount}
                          onChange={(e) => setEditingConfig({ ...editingConfig, win_reward_amount: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">무승부 보상량</label>
                        <input
                          type="number"
                          value={editingConfig.draw_reward_amount}
                          onChange={(e) => setEditingConfig({ ...editingConfig, draw_reward_amount: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">패배 보상량</label>
                        <input
                          type="number"
                          value={editingConfig.lose_reward_amount}
                          onChange={(e) => setEditingConfig({ ...editingConfig, lose_reward_amount: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">일일 플레이 한도</label>
                        <input
                          type="number"
                          value={editingConfig.max_daily_plays}
                          onChange={(e) => setEditingConfig({ ...editingConfig, max_daily_plays: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceConfigPage;
