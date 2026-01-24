// src/admin/pages/AdminTeamBattlePage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Swords,
  Activity,
  Calendar,
  Trophy,
  Search,
  Settings2,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  Plus,
  MoreVertical
} from "lucide-react";
import { fetchTeamSeasons, fetchTeams } from "../api/adminTeamApi";

const AdminTeamBattlePage: React.FC = () => {
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  // Queries
  const { data: seasonsData, isLoading: seasonsLoading } = useQuery({
    queryKey: ["admin", "team", "seasons"],
    queryFn: () => fetchTeamSeasons({ size: 10 }),
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["admin", "team", "teams", selectedSeasonId ?? "NO_SEASON"],
    queryFn: () => fetchTeams({ season_id: selectedSeasonId || undefined, size: 20 }),
    enabled: true,
  });

  const activeSeason = seasonsData?.items?.find(s => s.is_active);

  if (seasonsLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
      <span className="text-admin-meta text-admin-text-secondary">?Ä Î∞∞Ì? ?îÏßÑ ?ôÍ∏∞??Ï§?..</span>
    </div>
  );

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
            ?Ä Î∞∞Ì? ?µÌï© ?µÏ†ú??<span className="text-admin-brand/40">Team Battle</span>
          </h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">?§ÏãúÍ∞?Îß§Ïπ≠ ?úÏ¶å Î∞??ÄÎ≥??§ÏΩî??Í∞ÄÏ§ëÏπòÎ•??ïÎ? ?µÏ†ú?©Îãà??</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto">
            <Calendar className="h-4 w-4" /> ?†Í∑ú ?úÏ¶å ?àÏïΩ
          </button>
          <button className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 h-auto shadow-admin-glow">
            <Plus className="h-4 w-4" /> ?Ä Ï∂îÍ? ?±Î°ù
          </button>
        </div>
      </header>

      {/* Real-time Status Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Activity className="h-16 w-16 text-admin-brand" />
          </div>
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">?§ÏãúÍ∞??¥ÏòÅ ?ÅÌÉú</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-admin-accent animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-2xl font-black text-admin-text-primary">ACTIVE</span>
          </div>
        </div>

        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">?ÑÏû¨ ?úÏÑ± ?úÏ¶å</p>
          <div>
            <p className="text-lg font-black text-admin-brand line-clamp-1">{activeSeason?.name || "?úÏ¶å ?ÜÏùå"}</p>
            <p className="text-xs text-admin-text-secondary mt-1">{activeSeason ? `~${activeSeason.end_date.split('T')[0]}` : "ÎπÑÏãúÏ¶?Í∏∞Í∞Ñ"}</p>
          </div>
        </div>

        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">Ï¥?Ï∞∏Ïó¨ ?Ä</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-text-primary">{teamsData?.total || 0}</p>
            <Zap className="h-5 w-5 text-admin-warning mb-1" />
          </div>
        </div>

        <div className="admin-card-premium p-6 flex flex-col justify-between h-32 border-l-4 border-admin-accent">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">ÏµúÍ≥† ?ÑÏ†Å ?§ÏΩî??/p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-accent tabular-nums">1.2M</p>
            <Trophy className="h-5 w-5 text-admin-accent mb-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Seasons List */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between pl-1">
            <h2 className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Î∞∞Ì? ?úÏ¶å ?ÑÏ†Å
            </h2>
          </div>
          <div className="space-y-3">
            {seasonsData?.items?.map((season) => (
              <button
                key={season.id}
                onClick={() => setSelectedSeasonId(season.id)}
                className={`w-full admin-card-premium p-4 text-left transition-all border-l-2 ${selectedSeasonId === season.id
                  ? "border-admin-brand bg-admin-brand/5 shadow-admin-glow translate-x-1"
                  : "border-transparent opacity-70 hover:opacity-100"
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${season.is_active ? "bg-admin-accent/20 text-admin-accent" : "bg-admin-sidebar text-admin-text-muted"
                    }`}>
                    {season.status}
                  </span>
                  <span className="text-[10px] text-admin-text-muted tabular-nums">{season.start_date.split('T')[0]}</span>
                </div>
                <p className="text-sm font-bold text-admin-text-primary line-clamp-1">{season.name}</p>
                <div className="flex justify-between items-center mt-3 text-[10px] text-admin-text-secondary">
                  <div className="flex items-center gap-1"><Shield className="h-3 w-3" /> 2 Teams</div>
                  <ChevronRight className={`h-3 w-3 transition-transform ${selectedSeasonId === season.id ? "translate-x-1 text-admin-brand" : "text-admin-text-muted"}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Teams Grid & Matching Control */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pl-1">
            <h2 className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> ?åÏÜç ?Ä Î∞??§ÏãúÍ∞??§ÏΩî?¥ÎßÅ
            </h2>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-admin-text-muted" />
              <input
                type="text"
                placeholder="?Ä Í≤Ä??.."
                className="bg-transparent border-none outline-none text-xs text-admin-text-primary w-32"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamsLoading ? (
              <div className="col-span-2 py-10 text-center">
                <RefreshCw className="h-6 w-6 text-admin-brand animate-spin mx-auto mb-2" />
                <p className="text-xs text-admin-text-secondary">?∞Ïù¥??Í≤Ä??Ï§?..</p>
              </div>
            ) : teamsData?.items?.length === 0 ? (
              <div className="col-span-2 py-20 admin-card-premium border-dashed flex flex-col items-center justify-center gap-4">
                <Shield className="h-10 w-10 text-admin-text-muted opacity-20" />
                <p className="text-admin-meta text-admin-text-muted font-bold">?†ÌÉù???úÏ¶å???±Î°ù???Ä???ÜÏäµ?àÎã§.</p>
              </div>
            ) : (
              teamsData?.items?.map((team) => (
                <div key={team.id} className="admin-card-premium p-5 group hover:shadow-admin-glow transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: team.color }}>
                        <Swords className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-admin-body font-black text-admin-text-primary">{team.name}</h3>
                        <p className="text-[10px] text-admin-text-muted uppercase font-bold tracking-tighter">Team Identifier: #{team.id}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="p-2 rounded-lg hover:bg-admin-hover text-admin-text-muted hover:text-admin-brand transition-colors"
                      aria-label="?Ä Î©îÎâ¥"
                      title="?Ä Î©îÎâ¥"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-admin-sidebar/50 p-3 rounded-xl border border-admin-border">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-admin-text-secondary">CURRENT SCORE</span>
                        <TrendingUp className="h-3 w-3 text-admin-accent" />
                      </div>
                      <p className="text-xl font-black text-admin-accent tabular-nums">482,920</p>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 btn-admin-secondary text-[11px] py-2 h-auto font-black hover:bg-admin-brand/10 hover:text-admin-brand hover:border-admin-brand/30">
                        ?¨Ïù∏???òÎèô Ï°∞Ï†ï
                      </button>
                      <button
                        type="button"
                        className="btn-admin-secondary p-2 h-auto"
                        aria-label="?Ä ?§Ï†ï"
                        title="?Ä ?§Ï†ï"
                      >
                        <Settings2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminTeamBattlePage;
