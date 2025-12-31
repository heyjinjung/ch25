// src/pages/MissionPage.tsx
import React, { useEffect, useState } from "react";
import { useMissionStore, MissionData } from "../stores/missionStore";
import MissionCard from "../components/mission/MissionCard";
import { ChevronRight, Target, Trophy, Sparkles } from "lucide-react";
import { useHaptic } from "../hooks/useHaptic";

const MissionPage: React.FC = () => {
    const { missions, fetchMissions, isLoading } = useMissionStore();
    const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'SPECIAL'>('DAILY');
    const { impact } = useHaptic();

    useEffect(() => {
        fetchMissions();
    }, [fetchMissions]);

    const handleTabChange = (tab: 'DAILY' | 'WEEKLY' | 'SPECIAL') => {
        impact('light');
        setActiveTab(tab);
    };

    // Filter missions based on active tab
    const filteredMissions: MissionData[] = missions.filter((item: MissionData) => item.mission.category === activeTab);

    const unclaimedCount = missions.filter(m => m.progress.is_completed && !m.progress.is_claimed).length;

    return (
        <div className="min-h-screen bg-[#0A0A0A] pb-24 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-600/10 to-transparent pointer-events-none" />
            <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[10%] left-[-10%] w-80 h-80 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 p-4 pt-6 max-w-md mx-auto">

                {/* Page Title & Summary */}
                <div className="mt-8 mb-6 px-1 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            Missions <Sparkles className="text-[#91F402] w-6 h-6 animate-pulse" />
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">달성하고 다이아몬드 보상을 받으세요</p>
                    </div>
                    {unclaimedCount > 0 && (
                        <div className="bg-[#91F402] text-black text-[10px] font-black px-2 py-1 rounded-full animate-bounce">
                            {unclaimedCount} CLAIM READY
                        </div>
                    )}
                </div>

            </div>

            {/* Tabs - Glassmorphic */}
            <div className="flex p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-6 relative">
                {(['DAILY', 'WEEKLY', 'SPECIAL'] as const).map(tab => {
                    const isActive = activeTab === tab;
                    const count = missions.filter(m => m.mission.category === tab && m.progress.is_completed && !m.progress.is_claimed).length;

                    return (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 relative overflow-hidden ${isActive
                                ? "text-white"
                                : "text-gray-500 hover:text-gray-300"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-100 transition-opacity" />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                                {tab === 'DAILY' && <Target size={14} />}
                                {tab === 'WEEKLY' && <Trophy size={14} />}
                                {tab === 'SPECIAL' && <Sparkles size={14} />}
                                {tab.charAt(0) + tab.slice(1).toLowerCase()}
                                {count > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#91F402] shadow-[0_0_8px_#91F402]" />
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Mission List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <div className="w-10 h-10 border-4 border-[#91F402]/30 border-t-[#91F402] rounded-full animate-spin" />
                        <p className="text-sm font-bold text-gray-400">Loading missions...</p>
                    </div>
                ) : filteredMissions.length > 0 ? (
                    filteredMissions.map((item: MissionData) => (
                        <MissionCard key={item.mission.id} data={item} />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/5 rounded-[32px] border border-dashed border-white/10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Target className="text-gray-600 w-8 h-8" />
                        </div>
                        <h3 className="text-white font-bold mb-1">No missions available</h3>
                        <p className="text-gray-500 text-xs">현재 카테고리에 활성화된 미션이 없습니다.</p>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="mt-10 mb-4 text-center">
                <button className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors">
                    View Season Rules <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default MissionPage;
