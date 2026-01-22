// src/v2/pages/missions/MissionsPage.tsx
import { useV2Missions, useV2ClaimMission } from "../../hooks/useV2Mission";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import "./MissionRedesign.css";

const ASSET_PATH = "/src/v2/public/assets/07mission";

export default function MissionsPage() {
  const { data, isLoading, error, refetch } = useV2Missions();
  const claimMutation = useV2ClaimMission();

  const handleClaim = async (missionId: string) => {
    try {
      triggerHaptic("medium");
      await claimMutation.mutateAsync(missionId);
      triggerNotification("success");
      refetch();
    } catch {
      triggerNotification("error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-[#25AD82] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-6 text-center">
        <p className="text-white/40">미션을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  const { missions = [], streak_info } = data;

  return (
    <div className="mission-redesign-container">
      <img src={`${ASSET_PATH}/mission (1).svg`} className="mission-bg-overlay" alt="" />

      {/* Header Arena: Half-circle Chart & Character */}
      <div className="mission-header-arena mt-8">
        <div className="half-circle-chart-container">
          <img src={`${ASSET_PATH}/Ellipse 1.svg`} className="chart-ellipse-bg" alt="" />
          <img src={`${ASSET_PATH}/icon.svg`} className="casino-logo-chart" alt="CC" />
          <span className="mission-progress-label">미션 진행</span>
        </div>
        
        <img src={`${ASSET_PATH}/Frame 2.png`} className="character-frame-img" alt="Character" />
      </div>

      {/* 7-Day Streak Grid */}
      <div className="streak-grid-container">
        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
          const isComplete = (streak_info?.current_streak || 0) >= num;
          const isToday = (streak_info?.current_streak || 0) + 1 === num;
          return (
            <div 
              key={num} 
              className={`streak-day-box ${isComplete ? 'complete' : isToday ? 'current' : ''}`}
            >
              {/* Optional: Add icon.svg if streak is active */}
              {isComplete && <img src={`${ASSET_PATH}/icon.svg`} className="w-3" alt="" />}
            </div>
          );
        })}
      </div>

      {/* Scrollable Mission Container (570px) */}
      <div className="mission-list-scrollarea">
        {missions.map((mission) => (
          <div key={mission.id} className="mission-promo-card">
            <div className="mission-text-content">
              <span className="mission-title">{mission.title}</span>
              <span className="mission-desc">진행도: {mission.progress || 0}/{mission.target}</span>
            </div>
            
            {!mission.is_claimed && mission.is_completed ? (
               <img 
                 src={`${ASSET_PATH}/button.svg`} 
                 className="mission-claim-btn" 
                 alt="Claim"
                 onClick={() => handleClaim(mission.id)}
               />
            ) : (
               <div className="w-[45px] h-[75px] opacity-20 flex items-center justify-center">
                 <img src={`${ASSET_PATH}/Vector-1.svg`} className="w-4 h-4" alt="" />
               </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {missions.length === 0 && (
          <div className="py-12 text-center opacity-30 italic text-xs">
            현재 진행 가능한 미션이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
