import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import { useTelegram } from "../../providers/TelegramProvider";
import { telegramApi } from "../../api/telegramApi";

const RequireAuth: React.FC = () => {
  const { token } = useAuth();
  const { isReady, initData, startParam } = useTelegram();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const allowNonTelegramLogin =
    import.meta.env.DEV;

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
        // 기존에는 /new-user/welcome 으로 리다이렉트했으나, 이제는 Landing 페이지에서 모달로 처리하므로 리다이렉트를 제거한다.

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

  // --- Auto Re-auth on Visibility Change (Fix for Day 2 login mission) ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && initData && !isAuthenticating) {
        // App returned to foreground.
        // We trigger a silent auth refresh to ensure server captures "login" event for daily missions.
        console.log("[RequireAuth] App visible > Triggering silent re-auth for daily check.");

        telegramApi.auth(initData, startParam || undefined)
          .then((response) => {
            // Update local token/user if changed
            login(response.access_token, response.user);
            console.log("[RequireAuth] Silent re-auth success.");
          })
          .catch(e => console.warn("[RequireAuth] Silent re-auth failed", e));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [initData, isAuthenticating, login, startParam]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-black">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-figma-accent/20 border-t-figma-accent rounded-full animate-spin" />
          <div className="absolute inset-0 blur-lg bg-figma-accent/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!token) {
    if (!initData) {
      if (allowNonTelegramLogin) {
        return <Navigate to="/login" state={{ from: location }} replace />;
      }
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[100dvh] bg-[#050505] overflow-hidden text-center p-6 selection:bg-[#30FF75] selection:text-black">

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
                    CC코드지갑<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#30FF75] to-[#20E065]">
                      지민실장
                    </span>
                  </h1>

                  <div className="w-10 h-1 bg-[#30FF75]/30 mx-auto rounded-full" />

                  <div className="text-slate-400 font-medium leading-relaxed text-sm">
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="text-[#30FF75] font-bold text-sm">@jm956_bot</span><br />
                      을 통해 접속해주세요.
                    </p>
                  </div>
                </div>

                {/* Call to Action */}
                <a
                  href="https://t.me/jm956_bot/ccjm"
                  target="_blank"
                  rel="noreferrer"
                  className="group/btn relative flex items-center justify-center gap-3 w-full py-4 rounded-lg bg-figma-primary text-white font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 active:scale-95 uppercase tracking-wide transition-all"
                >
                  <img src="/assets/icon_telegram_button.png" alt="" className="w-8 h-8 object-contain drop-shadow-lg" />
                  <span className="text-sm">텔레그램 접속</span>
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black">
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
