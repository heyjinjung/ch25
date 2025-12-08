import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { setAuth, useAuth } from "../auth/authStore";

const TEST_ACCOUNT = { user_id: 999, external_id: "test-qa-999" };

const LoginPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(TEST_ACCOUNT);
      setAuth(response.access_token, response.user);
      navigate("/home", { replace: true });
    } catch (err) {
      console.error("[LoginPage] login error", err);
      setError("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
    <div className="mx-auto mt-16 w-full max-w-md space-y-8 rounded-2xl border border-emerald-700/50 bg-slate-900/70 p-10 shadow-xl shadow-emerald-950/30">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">XMAS Week</p>
        <h1 className="text-2xl font-bold text-white">테스트 계정으로 로그인</h1>
        <p className="text-sm text-slate-400">
          버튼을 누르면 테스트 계정(`user_id=999`, `external_id=test-qa-999`)으로 로그인하여 홈으로 이동합니다.
        </p>
      </header>

      {error && <p className="rounded-lg border border-rose-500/40 bg-rose-900/40 p-3 text-sm font-semibold text-rose-100">{error}</p>}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60"
      >
        {loading ? "로그인 중..." : "테스트 계정으로 로그인"}
      </button>

      <p className="text-center text-xs text-slate-500">
        인증이 완료되면 시즌패스, 게임, 코인 잔액이 보이는 홈으로 이동합니다.
      </p>
    </div>
  );
};

export default LoginPage;
