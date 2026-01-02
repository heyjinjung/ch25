// src/pages/EventDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useHaptic } from "../hooks/useHaptic";

const EventDashboardPage: React.FC = () => {
    const { impact } = useHaptic();

    const handleCardClick = () => {
        impact("medium");
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] relative overflow-hidden flex flex-col">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-600/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-80 h-80 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 px-4 pt-2 pb-24 w-full">
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

                        <div className="relative z-10 flex h-44 items-end p-4">
                            <div className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="truncate text-sm font-black text-white">시즌패스</div>
                                    <div className="shrink-0 inline-flex items-center justify-center rounded-full bg-indigo-500/20 px-4 py-2 text-sm font-black text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                                        보상받기
                                    </div>
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

                        <div className="relative z-10 flex h-44 items-end p-4">
                            <div className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="truncate text-sm font-black text-white">미션</div>
                                    <div className="shrink-0 inline-flex items-center justify-center rounded-full bg-[#91F402]/20 px-4 py-2 text-sm font-black text-[#91F402] ring-1 ring-inset ring-[#91F402]/30">
                                        미션수행
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
};

export default EventDashboardPage;
