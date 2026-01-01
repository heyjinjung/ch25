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
                        className="group relative block w-full overflow-hidden rounded-[28px] border border-white/10 bg-black transition active:scale-[0.98] hover:-translate-y-0.5 hover:border-white/20 hover:ring-2 hover:ring-white/10"
                    >
                        {/* Background Image */}
                        <img
                            src="/assets/welcome/levelup_v2.png"
                            className="absolute inset-0 z-0 h-full w-full object-cover object-left-top transition-transform duration-200 group-hover:scale-[1.02]"
                            alt="Level Tower"
                        />

                        <div className="relative z-10 flex h-44 items-end justify-end p-5">
                            <div className="max-w-[85%] rounded-2xl border border-white/10 bg-black/45 p-4">
                                <h3 className="text-lg font-black text-white">시즌 패스</h3>
                                <div className="mt-3 inline-flex items-center justify-center rounded-full bg-indigo-500/20 px-4 py-2 text-sm font-black text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                                    보상 받기
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Daily Missions Section */}
                    <Link
                        to="/missions"
                        onClick={handleCardClick}
                        className="group relative block w-full overflow-hidden rounded-[28px] border border-white/10 bg-black transition active:scale-[0.98] hover:-translate-y-0.5 hover:border-white/20 hover:ring-2 hover:ring-white/10"
                    >
                        {/* Background Image */}
                        <img
                            src="/assets/welcome/mission_v2.png"
                            className="absolute inset-0 z-0 h-full w-full object-cover object-left-top transition-transform duration-200 group-hover:scale-[1.02]"
                            alt="Daily Missions"
                        />

                        <div className="relative z-10 flex h-44 items-end justify-end p-5">
                            <div className="max-w-[85%] rounded-2xl border border-white/10 bg-black/45 p-4">
                                <h3 className="text-lg font-black text-white">데일리 미션</h3>
                                <div className="mt-3 inline-flex items-center justify-center rounded-full bg-[#91F402]/20 px-4 py-2 text-sm font-black text-[#91F402] ring-1 ring-inset ring-[#91F402]/30">
                                    미션 수행
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Bonus Card */}
                    <div className="rounded-[32px] border border-dashed border-white/10 bg-white/5 p-6 text-center">
                        <Star className="mx-auto mb-2 text-gray-500" size={24} />
                        <p className="text-sm font-bold text-gray-300">준비 중</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDashboardPage;
