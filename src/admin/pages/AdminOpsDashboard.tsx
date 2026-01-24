import React, { useEffect, useState } from 'react';
import { DailyOverviewResponse, EventsStatusResponse, getDailyOverview, getEventsStatus } from '../api/adminDashboardApi';
import RiskMonitorCard from '../components/dashboard/RiskMonitorCard';
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
        return <div className="admin-page-container text-center text-admin-text-secondary">?´ì˜ ?€?œë³´?œë? ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>;
    }

    return (
        <div className="admin-page-container">
            <div>
                <h1 className="text-admin-title text-admin-text-primary">?´ì˜ ?€?œë³´??/h1>
                <p className="text-admin-body text-admin-text-secondary mt-1">?¸ë˜??ë¦¬ìŠ¤???•ì‚° ì§€?œë? ???”ë©´?ì„œ ?ê??©ë‹ˆ??</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-admin-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`
                            whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                            ${activeTab === 'daily'
                                ? 'border-admin-brand text-admin-brand'
                                : 'border-transparent text-admin-text-secondary hover:border-admin-border hover:text-admin-text-primary'}
                        `}
                    >
                        ?°ì¼ë¦??ê? (09:00)
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`
                            whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                            ${activeTab === 'events'
                                ? 'border-admin-brand text-admin-brand'
                                : 'border-transparent text-admin-text-secondary hover:border-admin-border hover:text-admin-text-primary'}
                        `}
                    >
                        ?´ë²¤???„í™© (?¤ì‹œê°?
                    </button>
                </nav>
            </div>

            {/* Tab Panels */}
            {activeTab === 'daily' && (
                <div className="animate-fadeIn">
                    <h2 className="text-admin-subtitle text-admin-text-primary mb-4">ë¦¬í…??ë¦¬ìŠ¤??& ?•ì‚°</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RiskMonitorCard
                            riskCount={dailyData.risk_count}
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
                    <h2 className="text-admin-subtitle text-admin-text-primary">?´ë²¤???„í™© ë³´ë“œ</h2>
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
