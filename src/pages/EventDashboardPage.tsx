// src/pages/EventDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader";
import { Trophy, Target, ChevronRight, Sparkles, Star } from "lucide-react";
import { useHaptic } from "../hooks/useHaptic";

const EventDashboardPage: React.FC = () => {
    const { impact } = useHaptic();

    const handleCardClick = () => {
        impact("medium");
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] pb-24 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-600/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-80 h-80 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 p-4 pt-6 max-w-md mx-auto">
                <AppHeader />

                {/* Page Title */}
                <div className="mt-8 mb-8 px-1">
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        Events <Sparkles className="text-[#91F402] w-8 h-8 animate-pulse" />
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 font-medium">참여하고 특별한 보상을 획득하세요</p>
                </div>

                {/* Dashboard Grid */}
                <div className="space-y-4">
                    {/* Level Tower Section (Placeholder) */}
                    <Link
                        to="/season-pass"
                        onClick={handleCardClick}
                        className="group relative block w-full overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 p-1 active:scale-[0.98] transition-all"
                    >
                        <div className="relative z-10 p-6 flex flex-col h-48 justify-between">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                                    <Trophy size={24} />
                                </div>
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-500/30">
                                    LEVEL UP
                                </span>
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-white mb-1 group-hover:text-indigo-300 transition-colors">Level Tower</h2>
                                <p className="text-gray-400 text-xs font-medium">시즌 패스를 달성하고 최종 보상을 받으세요</p>
                            </div>

                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all" />

                            <div className="flex items-center gap-1 text-[#91F402] text-[10px] font-black uppercase tracking-widest mt-2">
                                Check Progress <ChevronRight size={12} />
                            </div>
                        </div>

                        {/* Image Placeholder */}
                        <div className="absolute inset-0 z-0 opacity-20 transition-opacity group-hover:opacity-30">
                            {/* <img src="/assets/event_level_placeholder.png" className="w-full h-full object-cover" /> */}
                            <div className="w-full h-full bg-gradient-to-tr from-indigo-600/20 via-transparent to-purple-600/20" />
                        </div>
                    </Link>

                    {/* Daily Missions Section (Placeholder) */}
                    <Link
                        to="/missions"
                        onClick={handleCardClick}
                        className="group relative block w-full overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#91F402]/5 to-slate-900/40 p-1 active:scale-[0.98] transition-all"
                    >
                        <div className="relative z-10 p-6 flex flex-col h-48 justify-between">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-2xl bg-[#91F402]/10 border border-[#91F402]/30 flex items-center justify-center text-[#91F402] group-hover:scale-110 transition-transform duration-500">
                                    <Target size={24} />
                                </div>
                                <span className="bg-[#91F402]/20 text-[#91F402] text-[10px] font-black px-3 py-1 rounded-full border border-[#91F402]/30">
                                    DAILY
                                </span>
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-white mb-1 group-hover:text-[#91F402] transition-colors">Daily Missions</h2>
                                <p className="text-gray-400 text-xs font-medium">매일 주어지는 미션을 완료하고 다이아몬드를 획득하세요</p>
                            </div>

                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#91F402]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#91F402]/10 transition-all" />

                            <div className="flex items-center gap-1 text-[#91F402] text-[10px] font-black uppercase tracking-widest mt-2">
                                Complete Now <ChevronRight size={12} />
                            </div>
                        </div>

                        {/* Image Placeholder */}
                        <div className="absolute inset-0 z-0 opacity-20 transition-opacity group-hover:opacity-30">
                            {/* <img src="/assets/event_mission_placeholder.png" className="w-full h-full object-cover" /> */}
                            <div className="w-full h-full bg-gradient-to-br from-[#91F402]/10 via-transparent to-emerald-600/10" />
                        </div>
                    </Link>

                    {/* Bonus Card (Future Proofing) */}
                    <div className="p-6 rounded-[32px] border border-dashed border-white/10 bg-white/5 text-center">
                        <Star className="mx-auto text-gray-600 mb-2" size={24} />
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">More Events Coming Soon</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDashboardPage;
