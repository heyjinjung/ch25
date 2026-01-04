import React, { useEffect, useState } from 'react';
import { DailyOverviewResponse, EventsStatusResponse, getDailyOverview, getEventsStatus } from '../api/adminDashboardApi';
import { RiskMonitorCard } from '../components/dashboard/RiskMonitorCard';
import { SettlementCard } from '../components/dashboard/SettlementCard';
import { EventsStatusBoard } from '../components/dashboard/EventsStatusBoard';

type Tab = 'daily' | 'events';

export const AdminOpsDashboard: React.FC = () => {
    const [dailyData, setDailyData] = useState<DailyOverviewResponse | null>(null);
    const [eventsData, setEventsData] = useState<EventsStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('daily');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [d, e] = await Promise.all([getDailyOverview(), getEventsStatus()]);
            setDailyData(d);
            setEventsData(e);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading || !dailyData || !eventsData) {
        return <div className="p-10 text-center text-gray-500">Loading Operations Dashboard...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Operations Dashboard (Daily Routine)</h1>
                <p className="text-gray-400 text-sm mt-1">Monitor traffic, risk, and revenue for the First 2 Weeks Plan.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#333333]">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`
                            whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                            ${activeTab === 'daily'
                                ? 'border-[#91F402] text-[#91F402]'
                                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}
                        `}
                    >
                        Daily Overview (09:00)
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`
                            whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                            ${activeTab === 'events'
                                ? 'border-[#91F402] text-[#91F402]'
                                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}
                        `}
                    >
                        Events Status (Real-time)
                    </button>
                </nav>
            </div>

            {/* Tab Panels */}
            {activeTab === 'daily' && (
                <div className="animate-fadeIn">
                    <h2 className="text-lg font-semibold text-gray-200 mb-4">Retention Risk & Settlement</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RiskMonitorCard
                            riskCount={dailyData.risk_count}
                            streakRiskCount={dailyData.streak_risk_count}
                        />
                        <SettlementCard
                            missionPercent={dailyData.mission_percent}
                            vaultPayoutRatio={dailyData.vault_payout_ratio}
                            totalVaultPaid={dailyData.total_vault_paid}
                            totalDeposit={dailyData.total_deposit_estimated}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'events' && (
                <div className="animate-fadeIn">
                    <h2 className="text-lg font-semibold text-gray-200">Events Status Board</h2>
                    <EventsStatusBoard
                        welcomeMetrics={eventsData.welcome_metrics}
                        streakCounts={eventsData.streak_counts}
                        goldenHourPeak={eventsData.golden_hour_peak}
                        isGoldenHourActive={eventsData.is_golden_hour_active}
                    />
                </div>
            )}
        </div>
    );
};
