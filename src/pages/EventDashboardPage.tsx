// src/pages/EventDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
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
                                {/* Title removed per user request - already in background image */}
                                <p className="text-gray-400 text-[10px] font-medium mb-3">시즌 패스 보상을 획득하세요</p>
                                <div className="inline-flex items-center bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    보상 받기
                                </div>
                            </div>
                        </div>

                        {/* Background Image */}
                        <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity">
                            <img src="/assets/welcome/levelup_v2.png" className="w-full h-full object-cover" alt="Level Tower" />
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
                                {/* Title removed per user request - already in background image */}
                                <p className="text-gray-400 text-[10px] font-medium mb-3">매일 보너스 다이아몬드 받기</p>
                                <div className="inline-flex items-center bg-[#91F402]/20 text-[#91F402] text-[10px] font-black px-3 py-1 rounded-full border border-[#91F402]/30 group-hover:bg-[#91F402] group-hover:text-black transition-all">
                                    미션 수행
                                </div>
                            </div>
                        </div>

                        {/* Background Image */}
                        <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity">
                            <img src="/assets/welcome/mission_v2.png" className="w-full h-full object-cover" alt="Daily Missions" />
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
