/**
 * V2 Telegram 프로덕션 로그인 페이지
 *
 * 정식 배포 후 사용하는 실제 로그인 화면
 * - 텔레그램 Mini App 전용
 * - 자동 인증 (initData 기반)
 */
import { useState, useEffect, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Shield, Zap, Gift } from "lucide-react";

import { setAuth } from "../../../auth/authStore";
import { v2Client } from "../../api/client";

// Telegram 타입은 src/types/telegram.d.ts에서 전역 정의됨

type LoginState = "init" | "loading" | "success" | "error" | "not-telegram";

const V2TelegramLoginPage: FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<LoginState>("init");
  const [error, setError] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<{
    id: number;
    username?: string;
    first_name?: string;
  } | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // 자동 로그인 시도
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg || !tg.initData) {
      setState("not-telegram");
      return;
    }

    // Telegram 앱 초기화
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;
    if (user) {
      setTelegramUser(user);
    }

    // 자동 인증 시작
    performLogin();
  }, []);

  const performLogin = async () => {
    setState("loading");
    setError(null);

    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) {
        throw new Error("INVALID_TELEGRAM_ENV");
      }

      const res = await v2Client.post("/api/v2/telegram/auth", {
        init_data: tg.initData,
        start_param: tg.initDataUnsafe?.start_param || null,
      });

      const { access_token, refresh_token, is_new_user, user } = res.data;

      setIsNewUser(is_new_user);

      // 토큰 저장
      setAuth(access_token, {
        id: user.id,
        cc_id: user.cc_id,
        nickname: user.nickname,
        telegram_id: user.telegram_id,
        telegram_username: null,
      });

      // Refresh token 저장 (있는 경우)
      if (refresh_token) {
        localStorage.setItem("v2_refresh_token", refresh_token);
      }

      // 성공 피드백
      tg.HapticFeedback?.notificationOccurred("success");

      setState("success");

      // 잠시 후 홈으로 이동
      setTimeout(() => {
        navigate("/home");
      }, 1500);

    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message;
      setError(detail || "인증에 실패했습니다");
      setState("error");

      // 에러 피드백
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
    }
  };

  // 초기 로딩 화면
  if (state === "init" || state === "loading") {
    return (
      <div className="min-h-screen bg-obsidian-bg flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-obsidian-accent opacity-20 animate-ping" />
            <div className="relative h-full w-full rounded-full bg-obsidian-accent flex items-center justify-center">
              <Zap className="h-10 w-10 text-black" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">인증 중...</h1>
            <p className="text-obsidian-muted">잠시만 기다려주세요</p>
          </div>
          <div className="h-6 w-6 mx-auto border-2 border-obsidian-accent/30 border-t-obsidian-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 성공 화면
  if (state === "success") {
    return (
      <div className="min-h-screen bg-obsidian-bg flex items-center justify-center">
        <div className="text-center space-y-6 px-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-obsidian-accent opacity-20 animate-pulse" />
            <div className="relative h-full w-full rounded-full bg-obsidian-accent flex items-center justify-center">
              <Shield className="h-10 w-10 text-black" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              {isNewUser ? "환영합니다!" : "다시 만나서 반가워요!"}
            </h1>
            {telegramUser && (
              <p className="text-lg text-obsidian-accent">
                {telegramUser.first_name}
                {telegramUser.username && (
                  <span className="text-obsidian-muted text-sm ml-2">
                    @{telegramUser.username}
                  </span>
                )}
              </p>
            )}
            {isNewUser && (
              <div className="flex items-center justify-center gap-2 text-amber-400 mt-4">
                <Gift className="h-5 w-5" />
                <span className="text-sm font-medium">신규 가입 보너스 지급!</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-obsidian-muted">
            <div className="h-4 w-4 border-2 border-obsidian-muted/30 border-t-obsidian-muted rounded-full animate-spin" />
            <span className="text-sm">홈으로 이동 중...</span>
          </div>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (state === "error") {
    return (
      <div className="min-h-screen bg-obsidian-bg flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">인증 실패</h1>
            <p className="text-obsidian-muted">{error || "텔레그램 인증에 실패했습니다"}</p>
          </div>
          <button
            type="button"
            onClick={performLogin}
            className="w-full rounded-xl bg-obsidian-accent px-4 py-3 font-bold text-black hover:opacity-90"
          >
            다시 시도
          </button>
          <p className="text-xs text-obsidian-muted">
            문제가 계속되면 고객센터로 문의해주세요
          </p>
        </div>
      </div>
    );
  }

  // 텔레그램 환경이 아닌 경우
  if (state === "not-telegram") {
    return (
      <div className="min-h-screen bg-obsidian-bg flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Send className="h-10 w-10 text-blue-400" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white">
              텔레그램으로 접속해주세요
            </h1>
            <p className="text-obsidian-muted leading-relaxed">
              이 서비스는 텔레그램 Mini App에서만
              <br />
              이용하실 수 있습니다.
            </p>
          </div>
          <a
            href="https://t.me/YOUR_BOT_USERNAME"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-blue-500 px-4 py-3 font-bold text-white hover:opacity-90"
          >
            텔레그램에서 열기
          </a>
          <p className="text-xs text-obsidian-muted">
            위 버튼을 클릭하면 텔레그램 앱으로 이동합니다
          </p>

          {/* 주요 기능 소개 */}
          <div className="pt-6 border-t border-obsidian-border space-y-4">
            <p className="text-sm text-obsidian-muted">주요 기능</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-obsidian-accent/20 flex items-center justify-center mb-2">
                  <Zap className="h-5 w-5 text-obsidian-accent" />
                </div>
                <p className="text-xs text-obsidian-muted">미니게임</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-2">
                  <Gift className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-xs text-obsidian-muted">보상</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-xs text-obsidian-muted">안전한 금고</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default V2TelegramLoginPage;
