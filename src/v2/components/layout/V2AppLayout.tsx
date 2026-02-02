import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import V2MobileBottomNav from "./V2MobileBottomNav";
import V2AppHeader from "./V2AppHeader";
import V2LiveFeedBar from "./V2LiveFeedBar";
import V2SparkleBackground from "../effects/V2SparkleBackground";
import V2FloatingSideMenu from "./V2FloatingSideMenu";
import V2InboxDrawer from "../inbox/V2InboxDrawer";
import V2MusicSettingsModal from "../settings/V2MusicSettingsModal";
import GoldenHourModal from "../game/GoldenHourModal";
import { useGoldenHourStatus } from "../../hooks/useV2Golden";
import { useAuth, setAuth } from "../../../auth/authStore";
import { v2Client } from "../../api/client";

const GOLDEN_HOUR_MODAL_KEY = "golden_hour_modal_dismissed";

export default function V2AppLayout() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data: goldenHour } = useGoldenHourStatus();
  const [showGoldenModal, setShowGoldenModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // 인증 가드: 토큰 없으면 텔레그램 재인증 시도
  useEffect(() => {
    const checkAuth = async () => {
      // 이미 토큰이 있으면 OK
      if (token) {
        setAuthChecked(true);
        return;
      }

      // 텔레그램 환경인지 확인
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        // 자동 재인증 시도
        try {
          console.log(
            "[V2AppLayout] No token, attempting Telegram auto-auth...",
          );
          const res = await v2Client.post("/api/v2/telegram/auth", {
            init_data: tg.initData,
            start_param: tg.initDataUnsafe?.start_param || null,
          });

          const { access_token, refresh_token, user: authUser } = res.data;

          setAuth(access_token, {
            id: authUser.id,
            cc_id: authUser.cc_id,
            nickname: authUser.nickname,
            telegram_id: authUser.telegram_id,
            telegram_username: null,
          });

          if (refresh_token) {
            localStorage.setItem("v2_refresh_token", refresh_token);
          }

          console.log("[V2AppLayout] Auto-auth successful");
          setAuthChecked(true);
        } catch (err) {
          console.error(
            "[V2AppLayout] Auto-auth failed, redirecting to login",
            err,
          );
          navigate("/login", { replace: true });
        }
      } else {
        // 텔레그램 환경이 아니면 로그인 페이지로
        console.log("[V2AppLayout] Not in Telegram, redirecting to login");
        navigate("/login", { replace: true });
      }
    };

    checkAuth();
  }, [token, navigate]);

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

  // 인증 체크 중 로딩 화면
  if (!authChecked) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#30FF75] border-t-transparent" />
          <p className="text-sm font-semibold text-white/80">인증 확인 중...</p>
        </div>
      </div>
    );
  }

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
