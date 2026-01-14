import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { setAuth, useAuth } from "../auth/authStore";
import { useToast } from "../components/common/ToastProvider";

const LoginPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addImageToast } = useToast();
  void addImageToast;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const allowLegacyLogin = import.meta.env.DEV;
  const tg = (window as any).Telegram?.WebApp;
  const isTelegramWebView = Boolean(tg && tg.initData);
  const telegramBotUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) || "jm956_bot";
  const telegramWebappShortName = (import.meta.env.VITE_TELEGRAM_WEBAPP_SHORT_NAME as string | undefined) || "ccjm";
  const telegramOpenUrl = `https://t.me/${telegramBotUsername}/${telegramWebappShortName}`;

  const resolvePostLoginPath = (): string => {
    const state = location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null;
    const from = state?.from;
    if (!from?.pathname || from.pathname === "/login") return "/landing";
    return `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`;
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const trimmedId = externalId.trim();
    if (!trimmedId) {
      setLoading(false);
      setError("ID를 입력해주세요.");
      return;
    }
    try {
      const response = await login({
        external_id: trimmedId,
        password: password || undefined,
      });
      setAuth(response.access_token, response.user);
      navigate(resolvePostLoginPath(), { replace: true });
    } catch (err) {
      console.error("[LoginPage] login error", err);
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      navigate(resolvePostLoginPath(), { replace: true });
    }
  }, [token, navigate, location.state]);

  // Production UX: avoid showing legacy VIP login form to users.
  // If auth failed / initData is missing, guide them back to Telegram entry.
  if (!allowLegacyLogin) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[100dvh] bg-[#050505] overflow-hidden text-center p-6 selection:bg-[#30FF75] selection:text-black">
        <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-[#30FF75]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm mx-auto">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#30FF75]/50 to-transparent opacity-50" />

            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#30FF75] blur-2xl opacity-20 rounded-full" />
                  <img
                    src="/assets/logo_cc_v2.png"
                    alt="Logo"
                    className="w-20 h-auto relative z-10 drop-shadow-[0_0_15px_rgba(48,255,117,0.4)]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  텔레그램 인증이 필요해요
                </h1>
                <p className="text-sm font-medium text-white/65 leading-relaxed">
                  {isTelegramWebView
                    ? "텔레그램 세션 확인에 실패했어요. 잠시 후 다시 시도하거나, 봇에서 다시 열어주세요."
                    : "현재 화면은 텔레그램 앱에서 열어야 이용할 수 있어요. 아래 버튼으로 다시 접속해주세요."}
                </p>
                <p className="text-xs text-white/45">
                  접속 경로: <span className="text-[#30FF75] font-bold">@{telegramBotUsername}</span>
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href={telegramOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-figma-primary text-white font-black shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:brightness-110 active:scale-[0.98] transition"
                >
                  <img src="/assets/icon_telegram_button.png" alt="" className="w-8 h-8 object-contain" />
                  텔레그램으로 열기
                </a>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-black text-white/80 hover:bg-white/10"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/20">
            문제가 계속되면 텔레그램에서 다시 접속해주세요.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto mt-24 w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/30 bg-black/80 p-10 shadow-2xl backdrop-blur-xl">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px]" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-amber-600/10 blur-[80px]" />

      <header className="relative z-10 space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg shadow-amber-500/20">
          <span className="text-2xl">👑</span>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CC CASINO<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">VIP ACCESS</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-amber-500/80">지민코드 전용 포인트서비스</p>
        </div>
      </header>

      {error && <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-center text-sm font-semibold text-rose-200 shadow-inner">{error}</p>}

      <div className="mt-8 space-y-5 relative z-10">
        <div className="space-y-1.5">
          <label className="ml-1 text-xs font-bold text-slate-400">ACCESS ID</label>
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-white/20 transition focus:border-amber-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
            placeholder="부여받은 ID 입력"
          />
        </div>
        <div className="space-y-1.5">
          <label className="ml-1 text-xs font-bold text-slate-400">PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-white/20 transition focus:border-amber-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-amber-500/10"
            placeholder="패스워드 (Optional)"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-4 text-sm font-black text-black shadow-lg shadow-amber-900/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
      >
        {loading ? "AUTHENTICATING..." : "ENTER CASINO"}
      </button>

      <p className="mt-6 text-center text-xs text-white/20">
        PRIVATE SYSTEM · AUTHORIZED PERSONNEL ONLY
      </p>
    </div>
  );
};

export default LoginPage;
