import React, { useEffect, useMemo, useState } from "react";
import { Location, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { clearAuth, getAuthToken, setAuth, useAuth } from "../auth/authStore";
import { isTestModeEnabled } from "../config/featureFlags";

const TEST_ACCOUNT = { user_id: 999, external_id: "test-qa-999" };
const AUTO_LOGIN_FLAG = "xmas_test_auto_login_done";

const LoginPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = useMemo(() => (location.state as { from?: Location })?.from?.pathname || "/", [location.state]);

  const [userId, setUserId] = useState<string>("");
  const [externalId, setExternalId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (payload: { user_id: number; external_id: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(payload);
      setAuth(response.access_token, response.user);
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError("로그인에 실패했습니다. 입력값을 확인해주세요.");
      // eslint-disable-next-line no-console
      console.error("[LoginPage] login error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedId = Number(userId);
    if (Number.isNaN(parsedId) || !externalId.trim()) {
      setError("userId는 숫자, externalId는 문자열이어야 합니다.");
      return;
    }
    await performLogin({ user_id: parsedId, external_id: externalId.trim() });
  };

  const handleTestLogin = () => performLogin(TEST_ACCOUNT);

  // Auto-login once in TEST_MODE when no token exists.
  useEffect(() => {
    if (!isTestModeEnabled) return;
    if (getAuthToken()) return;
    if (!isTestModeEnabled) return;
    if (sessionStorage.getItem(AUTO_LOGIN_FLAG)) return;
    sessionStorage.setItem(AUTO_LOGIN_FLAG, "1");
    handleTestLogin().catch(() => {
      sessionStorage.removeItem(AUTO_LOGIN_FLAG);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If already logged in, redirect away from login page.
  useEffect(() => {
    if (token) {
      navigate(fromPath, { replace: true });
    }
  }, [token, navigate, fromPath]);

  return (
    <div className="mx-auto mt-12 w-full max-w-md space-y-6 rounded-2xl border border-emerald-700/40 bg-slate-900/70 p-8 shadow-xl shadow-emerald-950/40">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">🎄 Xmas Week</p>
        <h1 className="text-2xl font-bold text-white">로그인</h1>
        <p className="text-sm text-slate-400">access_token을 받아야 게임/API 호출이 가능합니다.</p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200" htmlFor="userId">
            userId (number)
          </label>
          <input
            id="userId"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            placeholder="예: 999"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200" htmlFor="externalId">
            externalId (string)
          </label>
          <input
            id="externalId"
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            placeholder="예: test-qa-999"
          />
        </div>

        {error && <p className="text-sm font-semibold text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      {isTestModeEnabled && (
        <div className="space-y-3 rounded-xl border border-indigo-600/40 bg-indigo-900/30 p-4">
          <div className="text-sm font-semibold text-indigo-100">TEST_MODE 전용 빠른 로그인</div>
          <p className="text-xs text-indigo-200">userId={TEST_ACCOUNT.user_id}, externalId="{TEST_ACCOUNT.external_id}"</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleTestLogin}
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              테스트 계정으로 자동 로그인
            </button>
            <button
              type="button"
              onClick={clearAuth}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-400 hover:text-rose-200"
            >
              강제 로그아웃/토큰 폐기
            </button>
          </div>
          <p className="text-[11px] text-indigo-200/80">처음 진입 시 토큰이 없으면 한 번 자동 로그인 시도합니다.</p>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
