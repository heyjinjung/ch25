import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import V2MobileBottomNav from "./V2MobileBottomNav";
import V2AppHeader from "./V2AppHeader";
import V2LiveFeedBar from "./V2LiveFeedBar";
import V2SparkleBackground from "../effects/V2SparkleBackground";
import V2FloatingSideMenu from "./V2FloatingSideMenu";
import V2InboxDrawer from "../inbox/V2InboxDrawer";
import V2MusicSettingsModal from "../settings/V2MusicSettingsModal";
import GoldenHourModal from "../game/GoldenHourModal";
import { useGoldenHourStatus } from "../../hooks/useV2Golden";

const GOLDEN_HOUR_MODAL_KEY = "golden_hour_modal_dismissed";

export default function V2AppLayout() {
  const { data: goldenHour } = useGoldenHourStatus();
  const [showGoldenModal, setShowGoldenModal] = useState(false);

  // 골든아워 모달 표시 로직
  useEffect(() => {
    if (!goldenHour?.enabled) return;

    const shouldShow = goldenHour.isActive || goldenHour.isUpcoming;
    if (!shouldShow) {
      setShowGoldenModal(false);
      return;
    }

    // 오늘 이미 닫았는지 확인
    const today = new Date().toDateString();
    const dismissedKey = `${GOLDEN_HOUR_MODAL_KEY}_${today}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);

    if (!wasDismissed) {
      setShowGoldenModal(true);
    }
  }, [goldenHour]);

  const handleCloseGoldenModal = () => {
    const today = new Date().toDateString();
    const dismissedKey = `${GOLDEN_HOUR_MODAL_KEY}_${today}`;
    sessionStorage.setItem(dismissedKey, "true");
    setShowGoldenModal(false);
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col w-full overflow-x-hidden relative">
      {/* Global Background Particles */}
      <V2SparkleBackground />

      {/* 64px Fixed Header */}
      <V2AppHeader />

      {/* 32px Fixed Live Feed Bar (follows Header) */}
      <V2LiveFeedBar />

      {/* 100px Header + 32px Live Feed Bar Gap */}
      <main className="flex-1 w-full max-w-[391px] mx-auto px-2 pt-[calc(var(--header-offset)+32px)] pb-[var(--nav-offset)] flex flex-col relative z-20">
        <Outlet />
      </main>

      {/* 86.87px Fixed Bottom Navigation */}
      <V2MobileBottomNav />

      {/* Overlays & Floating UI */}
      <V2FloatingSideMenu />
      <V2InboxDrawer />
      <V2MusicSettingsModal />

      {/* 골든아워 알림 모달 */}
      {goldenHour && (
        <GoldenHourModal
          isOpen={showGoldenModal}
          onClose={handleCloseGoldenModal}
          isActive={goldenHour.isActive}
          isUpcoming={goldenHour.isUpcoming}
          minutesUntilStart={goldenHour.minutesUntilStart}
          multiplier={goldenHour.multiplier}
          startTime={goldenHour.startTimeKst}
          endTime={goldenHour.endTimeKst}
        />
      )}
    </div>
  );
}
