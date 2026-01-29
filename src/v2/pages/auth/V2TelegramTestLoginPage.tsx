/**
 * V2 Telegram 테스트 로그인 페이지
 *
 * 정식 배포 전 텔레그램 테스트 중 사용하는 화면
 * - 모든 데이터가 정식 배포 후 초기화된다는 경고 표시
 * - 개발/테스트용 간편 로그인 제공
 */
import { useState, useEffect, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, TestTube, Sparkles, Send, ChevronRight } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 경고 배너 */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-300 text-lg mb-1">
                테스트 환경 안내
              </h3>
              <p className="text-sm text-amber-200/90 leading-relaxed">
                현재 <span className="font-bold text-white">정식 배포 전 테스트</span> 중입니다.
                <br />
                지금 쌓은 모든 데이터(포인트, 아이템, 기록 등)는
                <br />
                <span className="font-bold text-red-300">정식 오픈 시 전부 초기화</span>됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 헤더 */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/40 mb-4">
            <TestTube className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Beta Test</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            <span className="bg-gradient-to-r from-[#30FF75] to-[#00D4FF] bg-clip-text text-transparent">
              텔레그램 테스트
            </span>
          </h1>
          <p className="text-sm text-gray-400">
            정식 오픈 전 체험 버전
          </p>
        </header>

        {/* 메인 카드 */}
        <main className="rounded-3xl bg-[#1a1a1a] border border-[#333] p-6 space-y-6">
          {/* 텔레그램 환경인 경우 */}
          {isTelegramEnv && telegramUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#252525] border border-[#333]">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {telegramUser.first_name}
                    {telegramUser.username && (
                      <span className="text-gray-400 font-normal ml-2">
                        @{telegramUser.username}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">Telegram ID: {telegramUser.id}</p>
                </div>
              </div>

              <button
                onClick={handleTelegramLogin}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#30FF75] to-[#00D4FF] text-black font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    테스트 참여하기
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* 텔레그램 환경이 아닌 경우 (개발자용) */}
          {!isTelegramEnv && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300 text-center">
                  텔레그램 앱 외부에서 접속하셨습니다.
                  <br />
                  개발자 모드로 테스트할 수 있습니다.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  테스트 CC ID
                </label>
                <input
                  type="text"
                  value={devCcId}
                  onChange={(e) => setDevCcId(e.target.value)}
                  placeholder="test 또는 원하는 ID 입력"
                  className="w-full rounded-xl border border-[#333] bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#30FF75]/40"
                  disabled={isLoading}
                />
              </div>

              <button
                onClick={handleDevLogin}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <TestTube className="h-5 w-5" />
                    개발 모드 로그인
                  </>
                )}
              </button>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-300 text-center">{error}</p>
            </div>
          )}
        </main>

        {/* 푸터 안내 */}
        <footer className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-500">
            테스트 참여 시 수집되는 데이터는 서비스 개선에만 사용됩니다.
          </p>
          <p className="text-xs text-gray-600">
            문의: @support_channel
          </p>
        </footer>
      </div>
    </div>
  );
};

export default V2TelegramTestLoginPage;
