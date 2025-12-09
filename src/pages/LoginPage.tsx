import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { setAuth, useAuth } from "../auth/authStore";

const LoginPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await login({
        external_id: externalId,
        password: password || undefined,
      });
      setAuth(response.access_token, response.user);
      navigate("/home", { replace: true });
    } catch (err) {
      console.error("[LoginPage] login error", err);
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      navigate("/home", { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="mx-auto mt-16 w-full max-w-md space-y-6 rounded-2xl border border-emerald-700/50 bg-slate-900/70 p-10 shadow-xl shadow-emerald-950/30">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">XMAS Week</p>
        <h1 className="text-2xl font-bold text-white">테스트 계정으로 로그인</h1>
        <p className="text-sm text-slate-400">관리자가 안내한 ID/비밀번호만 입력하세요.</p>
      </header>

      {error && <p className="rounded-lg border border-rose-500/40 bg-rose-900/40 p-3 text-sm font-semibold text-rose-100">{error}</p>}

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-300">External ID (필수)</label>
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="w-full rounded-lg border border-emerald-800 bg-slate-900 px-3 py-2 text-slate-100"
            placeholder="ID를 입력하세요"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-emerald-800 bg-slate-900 px-3 py-2 text-slate-100"
            placeholder="설정된 경우만 입력"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60"
      >
        {loading ? "로그인중.." : "로그인"}
      </button>
    </div>
  );
};

export default LoginPage;
