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
    name: "?àÎ°ú??Ï£ºÏÇ¨???ÑÎûµ",
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
      addToast("?ÑÏó≠ ?ÑÎûµ ?§Ï†ï???Ä?•Îêò?àÏäµ?àÎã§.", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "?Ä???§Ìå®";
      addToast(msg, "error");
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateDiceConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dice", "configs"] });
      setEditingConfig(null);
      addToast("Î≥¥ÏÉÅ ?§Ï†ï???Ä?•Îêò?àÏäµ?àÎã§.", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "?Ä???§Ìå®";
      addToast(msg, "error");
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: createDiceConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dice", "configs"] });
      setIsCreating(false);
      addToast("?àÎ°ú???ÑÎûµ???ùÏÑ±?òÏóà?µÎãà??", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "?ùÏÑ± ?§Ìå®";
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
        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Ï£ºÏÇ¨??Î©îÏª§?àÏ¶ò ?îÏßÑ Ï§ÄÎπ?Ï§?..</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
            <span>?úÏä§??Í¥ÄÎ¶?/span>
            <ChevronRight size={12} />
            <span className="text-zinc-300">Ï£ºÏÇ¨???§Ï†ï</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Dice6 className="text-admin-brand" size={28} />
            Ï£ºÏÇ¨??Î©îÏª§?àÏ¶ò ?îÏßÑ
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-all text-sm font-bold"
          >
            <RefreshCw size={16} />
            ?îÏßÑ ?àÎ°úÍ≥†Ïπ®
          </button>
          {localEventParams && (
            <button
              onClick={() => updateEventMutation.mutate(localEventParams)}
              disabled={updateEventMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-admin-brand hover:brightness-110 text-black rounded-xl transition-all text-sm font-black shadow-lg shadow-admin-brand/20 disabled:opacity-50"
            >
              <Save size={16} />
              {updateEventMutation.isPending ? "?Ä??Ï§?.." : "?ÑÏó≠ ?ÑÎûµ ?Ä??}
            </button>
          )}
        </div>
      </div>

      {/* Error States */}
      {(configsError || eventError) && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 text-rose-400">
          <AlertCircle size={24} />
          <p className="text-sm font-bold">?îÏßÑ ?∞Ïù¥?∞Î? Î∂àÎü¨?§Îäî ???§Ìå®?àÏäµ?àÎã§. ?µÏã† ?ÅÌÉúÎ•??ïÏù∏?¥Ï£º?∏Ïöî.</p>
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
              <h2 className="text-sm font-black text-white uppercase tracking-wider">?ÑÏó≠ ?ÑÎûµ ?§Ï†ï (Global Strategy)</h2>
            </div>

            {localEventParams && (
              <div className="space-y-6">
                {/* Probabilities */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <Zap size={14} className="text-amber-400" />
                    ?πÌå® ?ïÎ•† (Probability)
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: "?πÎ¶¨ ?ïÎ•† (Win)", key: "p_win", color: "text-emerald-400" },
                      { label: "Î¨¥ÏäπÎ∂Ä ?ïÎ•† (Draw)", key: "p_draw", color: "text-zinc-400" },
                      { label: "?®Î∞∞ ?ïÎ•† (Lose)", key: "p_lose", color: "text-rose-400" },
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
                    ?úÌïú ?§Ï†ï (Global Caps)
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500">?ºÏùº ?ÑÏ†Å ?çÎìù ?úÎèÑ (Daily Gain)</label>
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
                      <label className="text-[10px] font-bold text-zinc-500">?ºÏùº ?åÎ†à???üÏàò ?úÌïú (Daily Plays)</label>
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
                    ?ëÏÜç ?úÌïú ?Ä??(Eligibility Tags)
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
              <p className="text-xs font-bold text-admin-brand">Ï∞∏Í≥† ?¨Ìï≠</p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                ?ÑÏó≠ ?ÑÎûµ ?§Ï†ï?Ä Î™®Îì† Ï£ºÏÇ¨??Í≤åÏûÑ ?∏Ïä§?¥Ïä§??Í≥µÌÜµ ?ÅÏö©?©Îãà?? Î≥¥ÏÉÅ?Ä ?†Ï???Í∏àÍ≥† ?†Í∏à ?îÍ≥†??Î∞òÏòÅ?òÎ©∞, Î¶¨Ïä§???úÎèÑ ?ÑÎã¨ ?????¥ÏÉÅ??Î≥¥ÏÉÅ ?çÎìù???úÌïú?©Îãà??
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Configuration List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-admin-brand" />
              Î≥¥ÏÉÅ Î©îÏª§?àÏ¶ò ?§Ï†ï (Reward Mechanisms)
            </h2>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-admin-brand rounded-lg border border-admin-brand/30 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Plus size={14} />
              ?ÑÎûµ Ï∂îÍ?
            </button>
          </div>

          {isCreating && (
            <div className="admin-card p-5 border-2 border-dashed border-admin-brand/30 bg-admin-brand/5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-admin-brand uppercase tracking-widest">???ÑÎûµ ?ùÏÑ±</h3>
                <div className="flex gap-2">
                  <button onClick={() => setIsCreating(false)} className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">CANCEL</button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">?îÏßÑ ?¥Î¶Ñ</label>
                  <input
                    type="text"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:border-admin-brand outline-none"
                    placeholder="?? VIP Í≥†Î∞∞???ÑÎûµ"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "?πÎ¶¨ Î≥¥ÏÉÅ", key: "win_reward_amount" },
                    { label: "Î¨¥ÏäπÎ∂Ä Î≥¥ÏÉÅ", key: "draw_reward_amount" },
                    { label: "?®Î∞∞ Î≥¥ÏÉÅ", key: "lose_reward_amount" },
                    { label: "?åÎ†à???úÎèÑ", key: "max_daily_plays" },
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
                  ?àÎ°ú??Î©îÏª§?àÏ¶ò Ï¶âÏãú ?úÏÑ±??
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {configs?.length === 0 && !isCreating && (
              <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl opacity-50 grayscale hover:grayscale-0 transition-all">
                <Dice6 size={48} className="text-zinc-600 mb-4" />
                <p className="text-sm font-bold text-zinc-500">?±Î°ù??Î≥¥ÏÉÅ Î©îÏª§?àÏ¶ò???ÜÏäµ?àÎã§.</p>
                <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">?ÅÎã®???ÑÎûµ Ï∂îÍ? Î≤ÑÌäº???åÎü¨ ?îÏßÑ??Í∞Ä?ôÌïò?∏Ïöî.</p>
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
                          Ï∑®ÏÜå
                        </button>
                        <button
                          onClick={() => handleSaveConfig(config.id)}
                          disabled={updateConfigMutation.isPending}
                          className="h-10 px-4 bg-admin-brand text-black rounded-xl text-xs font-black shadow-lg shadow-admin-brand/20 transition-all flex items-center gap-2"
                        >
                          {updateConfigMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                          ?ÅÏö©
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingConfig(config)}
                        className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 flex items-center gap-2 transition-all text-sm font-bold"
                      >
                        <Edit3 size={16} />
                        Î≥¥ÏÉÅ ?òÏ†ï
                      </button>
                    )}
                  </div>
                </div>

                {editingConfig?.id === config.id && (
                  <div className="px-5 pb-5 pt-1 border-t border-zinc-800/50 bg-zinc-900/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">?πÎ¶¨ Î≥¥ÏÉÅ??/label>
                        <input
                          type="number"
                          value={editingConfig.win_reward_amount}
                          onChange={(e) => setEditingConfig({ ...editingConfig, win_reward_amount: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Î¨¥ÏäπÎ∂Ä Î≥¥ÏÉÅ??/label>
                        <input
                          type="number"
                          value={editingConfig.draw_reward_amount}
                          onChange={(e) => setEditingConfig({ ...editingConfig, draw_reward_amount: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">?®Î∞∞ Î≥¥ÏÉÅ??/label>
                        <input
                          type="number"
                          value={editingConfig.lose_reward_amount}
                          onChange={(e) => setEditingConfig({ ...editingConfig, lose_reward_amount: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">?ºÏùº ?åÎ†à???úÎèÑ</label>
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
