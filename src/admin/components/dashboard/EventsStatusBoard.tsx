import React from 'react';
import { EventMetric } from '../../api/adminDashboardApi';

interface Props {
    welcomeMetrics: EventMetric[];
    streakCounts: Record<string, number>;
    goldenHourPeak: number;
    isGoldenHourActive: boolean;
}

export const EventsStatusBoard: React.FC<Props> = ({ welcomeMetrics, streakCounts, goldenHourPeak, isGoldenHourActive }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Welcome Mission Card */}
            <div className="admin-card p-6">
                <h3 className="text-admin-meta text-admin-text-secondary font-bold">?∞Ïª¥ ÎØ∏ÏÖò (D-2)</h3>
                <ul className="mt-4 space-y-3">
                    {welcomeMetrics.map((m, idx) => (
                        <li key={idx} className="flex justify-between items-center border-b border-admin-border pb-2 last:border-0 last:pb-0">
                            <span className="text-admin-body text-admin-text-secondary">{m.label}</span>
                            <span className="text-admin-body font-bold text-admin-text-primary">{m.value}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Streak Breakdown Card */}
            <div className="admin-card p-6">
                <h3 className="text-admin-meta text-admin-text-secondary font-bold mb-4">?§Ìä∏Î¶?Î∂ÑÌè¨</h3>
                <div className="flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-admin-meta text-admin-text-secondary mb-1">?ºÎ∞ò</p>
                        <p className="text-admin-title text-admin-text-primary">{streakCounts["NORMAL"] || 0}</p>
                    </div>
                    <div className="h-8 w-px bg-admin-border"></div>
                    <div className="text-center">
                        <p className="text-admin-meta text-admin-text-secondary mb-1">HOT</p>
                        <p className="text-admin-title text-admin-warning">{streakCounts["HOT"] || 0}</p>
                    </div>
                    <div className="h-8 w-px bg-admin-border"></div>
                    <div className="text-center">
                        <p className="text-admin-meta text-admin-text-secondary mb-1">LEGEND</p>
                        <p className="text-admin-title text-admin-brand">{streakCounts["LEGEND"] || 0}</p>
                    </div>
                </div>
            </div>

            {/* Golden Hour Card */}
            <div className={`admin-card p-6 border ${isGoldenHourActive ? 'border-admin-accent ring-1 ring-admin-accent' : 'border-admin-border'}`}>
                <div className="flex justify-between items-start">
                    <h3 className="text-admin-meta text-admin-text-secondary font-bold">Í≥®Îì†?ÑÏõå (?ºÌÅ¨)</h3>
                    {isGoldenHourActive && (
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-admin-accent"></span>
                        </span>
                    )}
                </div>
                <div className="mt-2">
                    <p className="text-admin-title text-admin-text-primary">{goldenHourPeak}</p>
                    <p className="text-admin-meta text-admin-text-secondary mt-1">?àÏãú: 21:30-22:30 KST</p>
                </div>
                {isGoldenHourActive && (
                    <div className="mt-4 text-admin-meta font-bold text-admin-accent bg-admin-hover px-2 py-1 rounded-admin-lg inline-block">
                        ÏßÑÌñâ Ï§?
                    </div>
                )}
            </div>
        </div>
    );
};
