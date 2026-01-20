import { useMemo } from "react";
import { useAdminLevels, useAdminUpdateLevel } from "../../../hooks/useAdminGame";
import { type AdminLevelDto } from "../../../api/adminApi";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Ticket, Coins, Zap } from "lucide-react";

export default function LevelConfigPage() {
  const { data: levels = [], isLoading } = useAdminLevels();
  const updateMutation = useAdminUpdateLevel();

  const handleUpdate = (level: number, field: keyof AdminLevelDto, value: number) => {
    if (isNaN(value)) return;
    updateMutation.mutate({ level, data: { [field]: value } });
  };

  const levelSummary = useMemo(() => {
    if (!levels.length) return { maxLevel: 0, totalXp: 0 };
    const max = levels[levels.length - 1];
    return {
        maxLevel: max.level,
        totalXp: max.requiredXp
    };
  }, [levels]);

  if (isLoading) return <div className="p-10 text-center text-white/50">Loading Configuration...</div>;

  return (
      <div className="relative mx-auto max-w-3xl min-h-screen pb-32 px-4">
        
        {/* --- 1. Header (Adapted from SeasonPassPage) --- */}
        <section className="relative pt-8 group mb-12">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-[2.5rem] blur-xl opacity-30"></div>
          <div className="relative rounded-[2rem] bg-[#18181B] p-8 shadow-2xl border border-white/10 overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 blur-[90px] rounded-full" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-[0.2em] uppercase border border-emerald-500/20">
                    SYSTEM CONFIG
                  </span>
                </div>
                <h1 className="text-4xl font-black italic text-white leading-none tracking-tighter">
                  LEVEL <span className="text-emerald-500 text-5xl">SYSTEM</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-zinc-400 font-bold uppercase tracking-wider text-xs">
                    MAX LEVEL: {levelSummary.maxLevel} / MAX XP: {levelSummary.totalXp.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Central Gauge (Visual Only for Config) */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                  <circle
                    cx="48" cy="48" r="42"
                    stroke="currentColor" strokeWidth="8" fill="transparent"
                    className="text-emerald-500"
                    strokeDasharray={263.8}
                    strokeDashoffset={0} // Always full for config view
                    strokeLinecap="round"
                    style={{ opacity: 0.8 }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{levels.length}</span>
                  <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">LVLS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 2. Timeline List (Adapted from SeasonPassPage) --- */}
        <div className="relative pl-2 space-y-0">
          {levels.map((level, idx) => {
            const isLast = idx === levels.length - 1;
            
            return (
              <div key={level.level} className="relative flex flex-col group/row">
                {/* Vertical Segment Line */}
                {!isLast && (
                  <div className="absolute left-[28px] top-[24px] w-[4px] h-[calc(100%+16px)] z-0">
                    <div className="w-full h-full bg-white/5 rounded-full group-hover/row:bg-white/10 transition-colors" />
                  </div>
                )}

                <div className="grid grid-cols-[60px_1fr] gap-0 items-start mb-8">
                  {/* Node Column */}
                  <div className="relative flex items-center justify-center h-full min-h-[160px] pt-1">
                    {/* Connector Arm */}
                    <div className="absolute left-[42px] top-[24px] h-[2px] w-[20px] z-0 bg-white/10" />

                    {/* Main Circle Node */}
                    <div className="relative w-12 h-12 rounded-full border-[3px] bg-[#111] border-white/10 flex items-center justify-center z-20 shrink-0 shadow-lg">
                      <span className="text-sm font-black text-zinc-500">{level.level}</span>
                    </div>
                  </div>

                  {/* Config Card */}
                  <div className="flex flex-col rounded-[1.75rem] p-6 bg-[#18181B] border border-white/5 shadow-xl relative overflow-hidden group/card hover:border-white/10 transition-all">
                    
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                          CONFIGURATION
                        </span>
                        <h3 className="text-xl font-black text-white leading-tight">
                          Level {level.level}
                        </h3>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-3 py-1">
                         AUTO-SAVED
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Requirement Input */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                <Zap className="w-3 h-3" /> Required XP
                             </label>
                             <div className="relative">
                                 <Input 
                                    type="number"
                                    className="bg-black/50 border-white/10 h-10 text-white font-mono pl-3 focus:ring-emerald-500/50"
                                    defaultValue={level.requiredXp}
                                    onBlur={(e) => handleUpdate(level.level, 'requiredXp', parseInt(e.target.value))}
                                 />
                             </div>
                        </div>

                        {/* Ticket Reward Input */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 flex items-center gap-1.5">
                                <Ticket className="w-3 h-3" /> Ticket Reward
                             </label>
                             <div className="relative">
                                 <Input 
                                    type="number"
                                    className="bg-black/50 border-white/10 h-10 text-emerald-400 font-bold pl-3 focus:ring-emerald-500/50"
                                    defaultValue={level.rewardTicket}
                                    onBlur={(e) => handleUpdate(level.level, 'rewardTicket', parseInt(e.target.value))}
                                 />
                             </div>
                        </div>

                         {/* Point Reward Input */}
                         <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-wider text-yellow-500/70 flex items-center gap-1.5">
                                <Coins className="w-3 h-3" /> Point Reward
                             </label>
                             <div className="relative">
                                 <Input 
                                    type="number"
                                    className="bg-black/50 border-white/10 h-10 text-yellow-400 font-bold pl-3 focus:ring-yellow-500/50"
                                    defaultValue={level.rewardPoint}
                                    onBlur={(e) => handleUpdate(level.level, 'rewardPoint', parseInt(e.target.value))}
                                 />
                             </div>
                        </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
  );
}

