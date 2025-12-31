import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import { useTelegram } from "../../providers/TelegramProvider";
import { telegramApi } from "../../api/telegramApi";
import { getNewUserStatus } from "../../api/newUserApi";

const RequireAuth: React.FC = () => {
  const { token } = useAuth();
  const { isReady, initData, startParam } = useTelegram();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const didAttemptRef = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (token) return;
    if (!initData) return;
    if (didAttemptRef.current) return;

    didAttemptRef.current = true;
    setAuthError(null);
    setIsAuthenticating(true);

    telegramApi
      .auth(initData, startParam || undefined)
      .then(async (response) => {
        login(response.access_token, response.user);

        // "신규/기존" 판별은 Telegram 가입 여부가 아니라 외부랭킹 입금 이력(입금액/입금횟수 여부) 기준으로 처리한다.
        try {
          const status = await getNewUserStatus();
          if (status.eligible) {
            navigate("/new-user/welcome", { replace: true });
            return;
          }
        } catch (err) {
          // Fallback: keep legacy behavior if status endpoint is temporarily unavailable.
          // eslint-disable-next-line no-console
          console.warn("[RequireAuth] new-user status check failed; falling back to telegram is_new_user", err);
          if (response.is_new_user) {
            navigate("/new-user/welcome", { replace: true });
            return;
          }
        }

        // If the user landed on a connect-like URL, move them to the main entry.
        if (location.pathname === "/connect" || location.pathname === "/login" || location.pathname === "/") {
          navigate("/landing", { replace: true });
        }
      })
      .catch((err) => {
        console.error("[RequireAuth] telegram auth failed", err);
        setAuthError("텔레그램 인증에 실패했습니다. 잠시 후 다시 시도해주세요.");
        didAttemptRef.current = false;
      })
      .finally(() => {
        setIsAuthenticating(false);
      });
  }, [initData, isReady, location.pathname, login, navigate, startParam, token]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-figma-accent/20 border-t-figma-accent rounded-full animate-spin" />
          <div className="absolute inset-0 blur-lg bg-figma-accent/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!token) {
    if (!initData) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#050505] overflow-hidden text-center p-6 selection:bg-[#30FF75] selection:text-black">

          {/* Background Effects */}
          <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
            <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-[#30FF75]/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
          </div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100"></div>

          <div className="relative z-10 w-full max-w-sm mx-auto">
            {/* Glass Card */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">

              {/* Top Highlight Line */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#30FF75]/50 to-transparent opacity-50" />

              <div className="space-y-8 relative z-10">
                {/* Logo Area */}
                <div className="flex justify-center">
                  <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out">
                    <div className="absolute inset-0 bg-[#30FF75] blur-2xl opacity-20 rounded-full" />
                    <img
                      src="/assets/logo_cc_v2.png"
                      alt="Logo"
                      className="w-24 h-auto relative z-10 drop-shadow-[0_0_15px_rgba(48,255,117,0.4)]"
                    />
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-[0.9]">
                    Telegram<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#30FF75] to-[#20E065]">
                      Native
                    </span>
                  </h1>

                  <div className="w-10 h-1 bg-[#30FF75]/30 mx-auto rounded-full" />

                  <div className="text-slate-400 font-medium leading-relaxed text-sm">
                    <p>이 서비스는 텔레그램 미니앱<br />전용 환경에 최적화되어 있습니다.</p>
                    <p className="mt-2 text-xs text-slate-500">
                      원활한 경험을 위해<br />
                      <span className="text-[#30FF75] font-bold text-sm">@cc_jm_2026_bot</span><br />
                      을 통해 접속해주세요.
                    </p>
                  </div>
                </div>

                {/* Call to Action */}
                <a
                  href="https://t.me/cc_jm_2026_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="group/btn relative block w-full py-4 rounded-xl bg-[#30FF75] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(48,255,117,0.2)] hover:shadow-[0_0_30px_rgba(48,255,117,0.4)] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-black font-black text-sm uppercase tracking-widest">
                    <span>Enter Telegram</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fillOpacity="0" />
                      <path d="M20.5 3l-4 17-5-5-2-4 11-8z" /> {/* Simple Telegram Plane shape approximate or Arrow */}
                      <path d="M2.00098 12.0001L21.001 2.00012L12.001 22.0001L10.001 13.0001L17.001 7.00012L7.00098 12.0001L2.00098 12.0001Z" fill="currentColor" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center opacity-30 invert pointer-events-none">
              <img src="/assets/logo_cc_v2.png" className="w-6 h-auto mx-auto grayscale" alt="Footer Logo" />
            </div>
          </div>
        </div>
      );
    }

    // Authenticating state (Telegram initData exists)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="space-y-6 flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-figma-accent/10 border-t-figma-accent rounded-full animate-spin" />
            <div className="absolute inset-0 bg-figma-accent/20 blur-xl animate-pulse rounded-full" />
          </div>
          <div className="text-center">
            <p className="text-figma-accent font-black tracking-[0.3em] uppercase animate-pulse">
              Authenticating
            </p>
            <p className="text-white/40 text-[10px] mt-1 font-mono">
              Verifying Telegram Session...
            </p>
            {authError && !isAuthenticating ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold text-red-300">{authError}</p>
                <button
                  type="button"
                  onClick={() => {
                    didAttemptRef.current = false;
                    setAuthError(null);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white/80 hover:bg-white/10"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default RequireAuth;
