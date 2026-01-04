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
            <div className="p-6 rounded-lg border border-[#333333] bg-[#111111]">
                <h3 className="text-gray-400 text-sm font-medium">웰컴 미션 (D-2)</h3>
                <ul className="mt-4 space-y-3">
                    {welcomeMetrics.map((m, idx) => (
                        <li key={idx} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                            <span className="text-gray-300 text-sm">{m.label}</span>
                            <span className="font-bold text-white">{m.value}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Streak Breakdown Card */}
            <div className="p-6 rounded-lg border border-[#333333] bg-[#111111]">
                <h3 className="text-gray-400 text-sm font-medium mb-4">스트릭 분포</h3>
                <div className="flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">일반</p>
                        <p className="text-2xl font-bold text-gray-300">{streakCounts["NORMAL"] || 0}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-700"></div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">핫</p>
                        <p className="text-2xl font-bold text-orange-400">{streakCounts["HOT"] || 0}</p>
                    </div>
                    <div className="h-8 w-px bg-gray-700"></div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">레전드</p>
                        <p className="text-2xl font-bold text-purple-400">{streakCounts["LEGEND"] || 0}</p>
                    </div>
                </div>
            </div>

            {/* Golden Hour Card */}
            <div className={`p-6 rounded-lg border ${isGoldenHourActive ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-[#333333]'} bg-[#111111]`}>
                <div className="flex justify-between items-start">
                    <h3 className="text-gray-400 text-sm font-medium">골든아워 (어제 피크)</h3>
                    {isGoldenHourActive && (
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    )}
                </div>
                <div className="mt-2">
                    <p className="text-3xl font-bold text-white">{goldenHourPeak}</p>
                    <p className="text-xs text-gray-500 mt-1">동시접속자 (21:30-22:30 KST)</p>
                </div>
                {isGoldenHourActive && (
                    <div className="mt-4 text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded inline-block">
                        진행 중
                    </div>
                )}
            </div>
        </div>
    );
};
