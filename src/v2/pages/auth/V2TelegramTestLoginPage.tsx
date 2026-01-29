/**
 * V2 Telegram 테스트 로그인 페이지
 *
 * 정식 배포 전 텔레그램 테스트 중 사용하는 화면
 * - 모든 데이터가 정식 배포 후 초기화된다는 경고 표시
 * - 개발/테스트용 간편 로그인 제공
 */
import { useState, useEffect, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Send, Sparkles } from "lucide-react";

import { setAuth } from "../../../auth/authStore";
import { v2Client } from "../../api/client";

// Telegram 타입은 src/types/telegram.d.ts에서 전역 정의됨

const V2TelegramTestLoginPage: FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<{
    id: number;
    username?: string;
    first_name?: string;
  } | null>(null);
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);
  const [devCcId, setDevCcId] = useState("");

  useEffect(() => {
    // Telegram WebApp 환경 감지
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTelegramEnv(true);
      tg.ready();
      tg.expand();

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramUser(user);
      }
    }
  }, []);

  // 텔레그램 인증으로 로그인
  const handleTelegramLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) {
        throw new Error("텔레그램 환경이 아닙니다");
      }

      const res = await v2Client.post("/api/v2/telegram/auth", {
        init_data: tg.initData,
        start_param: tg.initDataUnsafe?.start_param || null,
      });

      const { access_token, user } = res.data;

      setAuth(access_token, {
        id: user.id,
        cc_id: user.cc_id,
        nickname: user.nickname,
        telegram_id: user.telegram_id,
        telegram_username: null,
      });

      navigate("/home");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message;
      setError(detail || "텔레그램 인증에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // 개발용 CC ID 로그인 (비밀번호 없이)
  const handleDevLogin = async () => {
    if (!devCcId.trim()) {
      setError("CC ID를 입력하세요");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await v2Client.post("/api/v2/dev/login", {
        cc_id: devCcId.trim(),
        nickname: devCcId.trim(),
        create_if_missing: true,
      });

      const { access_token, user } = res.data;

      setAuth(access_token, {
        id: user.id,
        cc_id: user.cc_id,
        nickname: user.nickname,
        telegram_id: user.telegram_id,
        telegram_username: user.telegram_username,
      });

      navigate("/home");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message;
      if (detail === "DEV_LOGIN_DISABLED") {
        setError("개발 모드가 비활성화되어 있습니다");
      } else {
        setError(detail || "로그인에 실패했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        {/* 경고 배너 */}
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-300 text-sm mb-1">
                테스트 환경 안내
              </h3>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                현재 <span className="font-bold text-white">정식 배포 전 테스트</span> 중입니다.
                <br />
                지금 쌓은 모든 데이터(포인트, 아이템 등)는
                <br />
                <span className="font-bold text-red-300">정식 오픈 시 전부 초기화</span>됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 헤더 */}
        <header className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-obsidian-surface border border-obsidian-border mb-2">
            <Send className="h-8 w-8 text-obsidian-accent" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            텔레그램 로그인
          </h1>
          <p className="text-sm text-obsidian-muted">Beta Test</p>
        </header>

        {/* 메인 카드 */}
        <main className="rounded-[2rem] border border-obsidian-border bg-obsidian-surface p-8">
          <div className="space-y-5">
            {/* 텔레그램 환경인 경우 */}
            {isTelegramEnv && telegramUser && (
              <>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-obsidian-bg border border-obsidian-border">
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {telegramUser.first_name}
                      {telegramUser.username && (
                        <span className="text-obsidian-muted font-normal ml-2">
                          @{telegramUser.username}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-obsidian-muted">ID: {telegramUser.id}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTelegramLogin}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-obsidian-accent px-4 py-3 font-bold text-black hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    "인증 중..."
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      테스트 참여하기
                    </>
                  )}
                </button>
              </>
            )}

            {/* 텔레그램 환경이 아닌 경우 (개발자용) */}
            {!isTelegramEnv && (
              <>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 text-center">
                    텔레그램 앱 외부에서 접속하셨습니다.
                    <br />
                    개발자 모드로 테스트할 수 있습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-obsidian-muted mb-2">
                    테스트 CC ID
                  </label>
                  <input
                    type="text"
                    value={devCcId}
                    onChange={(e) => setDevCcId(e.target.value)}
                    placeholder="test 또는 원하는 ID 입력"
                    className="w-full rounded-xl border border-obsidian-border bg-obsidian-bg px-4 py-3 text-white placeholder:text-obsidian-muted focus:outline-none focus:ring-2 focus:ring-obsidian-accent/40"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-obsidian-accent px-4 py-3 font-bold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? "로그인 중..." : "개발 모드 로그인"}
                </button>
              </>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        </main>

        {/* 푸터 */}
        <footer className="mt-10 text-center text-xs text-obsidian-muted">
          테스트 데이터는 정식 오픈 시 초기화됩니다
        </footer>
      </div>
    </div>
  );
};

export default V2TelegramTestLoginPage;
