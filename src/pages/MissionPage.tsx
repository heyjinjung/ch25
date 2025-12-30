// TODO: [VERIFY] Confirm Mission Cards display DIAMOND rewards only (No XP icons) (Ref: D-01).
// TODO: [VERIFY] Confirm "Claim" action updates Diamond Balance in Header/Wallet instantly.
import React, { useEffect, useState } from "react";
import { useMissionStore, MissionData } from "../stores/missionStore";
import MissionCard from "../components/mission/MissionCard";
import AppHeader from "../components/layout/AppHeader";
import SeasonProgressWidget from "../components/season/SeasonProgressWidget";

const MissionPage: React.FC = () => {
    const { missions, fetchMissions, isLoading } = useMissionStore();
    const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'SPECIAL'>('DAILY');

    useEffect(() => {
        fetchMissions();
    }, [fetchMissions]);

    // Filter missions based on active tab
    const filteredMissions: MissionData[] = missions.filter((item: MissionData) => item.mission.category === activeTab);

    return (
        <div className="min-h-screen bg-slate-900 pb-24">
            <div className="p-4 pt-6">
                <AppHeader />

                <h2 className="text-2xl font-bold text-white mb-4 px-1">Missions</h2>

                {/* Level & XP Widget */}
                <SeasonProgressWidget />

                {/* Tabs */}
                <div className="flex p-1 bg-slate-800 rounded-xl mb-6">
                    {(['DAILY', 'WEEKLY', 'SPECIAL'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            {tab.charAt(0) + tab.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* Mission List */}
                <div className="flex flex-col gap-3">
                    {isLoading ? (
                        <div className="text-center py-10 text-slate-500">Loading missions...</div>
                    ) : filteredMissions.length > 0 ? (
                        filteredMissions.map((item: MissionData) => (
                            <MissionCard key={item.mission.id} data={item} />
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                            <p>No missions available in this category yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MissionPage;
