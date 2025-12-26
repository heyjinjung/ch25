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
