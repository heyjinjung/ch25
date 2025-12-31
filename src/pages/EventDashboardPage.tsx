// src/pages/EventDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Trophy, Target, Sparkles, Star } from "lucide-react";
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

                {/* Page Title */}
                <div className="mt-8 mb-8 px-1">
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        이벤트 <Sparkles className="text-[#91F402] w-8 h-8 animate-pulse" />
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 font-medium">참여 가능한 모든 이벤트를 확인하세요</p>
                </div>

                {/* Dashboard Grid */}
                <div className="space-y-4">
                    {/* Level Tower Section */}
                    <Link
                        to="/season-pass"
                        onClick={handleCardClick}
                        className="group relative block w-full overflow-hidden rounded-[28px] border border-white/10 bg-black active:scale-[0.98] transition-all"
                    >
                        <div className="relative z-10 p-6 flex flex-col h-40 justify-center">
                            <div className="max-w-[60%]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                                        <Trophy size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Level Tower</span>
                                </div>
                                <h2 className="text-xl font-black text-white mb-1 group-hover:text-indigo-300 transition-colors">레벨 타워</h2>
                            </div>
                        </div>

                        {/* Background Image */}
                        <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity">
                            <img src="/assets/welcome/levelup_v2.png" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                        </div>
                    </Link>

                    {/* Daily Missions Section */}
                    <Link
                        to="/missions"
                        onClick={handleCardClick}
                        className="group relative block w-full overflow-hidden rounded-[28px] border border-white/10 bg-black active:scale-[0.98] transition-all"
                    >
                        <div className="relative z-10 p-6 flex flex-col h-40 justify-center">
                            <div className="max-w-[60%]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#91F402]/10 border border-[#91F402]/30 flex items-center justify-center text-[#91F402]">
                                        <Target size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-[#91F402] uppercase tracking-widest">Daily Missions</span>
                                </div>
                                <h2 className="text-xl font-black text-white mb-1 group-hover:text-[#91F402] transition-colors">데일리 미션</h2>
                            </div>
                        </div>

                        {/* Background Image */}
                        <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity">
                            <img src="/assets/welcome/mission_v2.png" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                        </div>
                    </Link>

                    {/* Bonus Card */}
                    <div className="p-6 rounded-[32px] border border-dashed border-white/10 bg-white/5 text-center">
                        <Star className="mx-auto text-gray-600 mb-2" size={24} />
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest italic">COMING SOON</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDashboardPage;
