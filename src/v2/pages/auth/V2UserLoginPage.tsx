import { useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import { setAuth } from "../../../auth/authStore";
import { v2Client } from "../../api/client";

const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

type LoginForm = z.infer<typeof loginSchema>;

const V2UserLoginPage: FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "test", password: "1234" },
  });

  const loginWithCredentials = async (username: string, password: string) => {
    const res = await v2Client.post("/api/v2/auth/token", {
      external_id: username,
      password,
    });

    const token = res?.data?.access_token;
    const user = res?.data?.user ?? null;

    if (!token) {
      throw new Error("NO_TOKEN");
    }

    setAuth(token, user);
    navigate("/home");
  };

  const loginWithDevExternalId = async (externalId: string) => {
    const trimmed = externalId.trim();
    if (!trimmed) {
      throw new Error("MISSING_EXTERNAL_ID");
    }

    const res = await v2Client.post("/api/v2/dev/login", {
      external_id: trimmed,
      nickname: trimmed,
      create_if_missing: true,
    });

    const token = res?.data?.access_token;
    const devUser = res?.data?.user ?? null;

    if (!token) {
      throw new Error("NO_TOKEN");
    }

    setAuth(token, {
      id: devUser?.id ?? 0,
      external_id: devUser?.cc_id ?? trimmed,
      nickname: devUser?.nickname ?? trimmed,
      telegram_id: devUser?.telegram_id ?? null,
      telegram_username: devUser?.telegram_username ?? null,
    });
    navigate("/home");
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setServerError(null);

    try {
      await loginWithCredentials(data.username, data.password);
      return;
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === "USER_NOT_FOUND") {
        setServerError(
          "test 계정이 아직 없습니다. 아래 'test 계정 생성(개발환경)'을 눌러주세요",
        );
      } else {
        setServerError(detail || "인증에 실패했습니다. 자격 증명을 확인하세요");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTestUser = async () => {
    setIsLoading(true);
    setServerError(null);

    try {
      await v2Client.post("/api/v2/dev/login", {
        external_id: "test",
        nickname: "test",
        create_if_missing: true,
      });

      await loginWithCredentials("test", "1234");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.response?.data || err?.message;
      const fallback =
        detail === "DEV_LOGIN_DISABLED"
          ? "현재 서버 환경에서 DEV_LOGIN이 꺼져 있습니다. scripts/ 로 test 로드를 하세요"
          : "test 계정 생성에 실패했습니다.";
      setServerError(typeof detail === "string" ? detail : fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevExternalLogin = async () => {
    setIsLoading(true);
    setServerError(null);

    try {
      const externalId = String(getValues("username") || "").trim();
      await loginWithDevExternalId(externalId || "test");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message;
      const fallback =
        detail === "DEV_LOGIN_DISABLED"
          ? "현재 서버 환경에서 DEV_LOGIN이 꺼져 있습니다."
          : detail === "MISSING_EXTERNAL_ID"
            ? "external_id를 입력하세요."
            : "DEV 로그인에 실패했습니다.";
      setServerError(typeof detail === "string" ? detail : fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <header className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-obsidian-surface border border-obsidian-border mb-2">
            <ShieldCheck className="h-8 w-8 text-obsidian-accent" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            유저 로그인 (V2)
          </h1>
          <p className="text-sm text-obsidian-muted">개발용 임시 로그인</p>
        </header>

        <main className="rounded-[2rem] border border-obsidian-border bg-obsidian-surface p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm text-obsidian-muted mb-2">
                아이디
              </label>
              <input
                {...register("username")}
                className="w-full rounded-xl border border-obsidian-border bg-obsidian-bg px-4 py-3 text-white placeholder:text-obsidian-muted focus:outline-none focus:ring-2 focus:ring-obsidian-accent/40"
                placeholder="CC ID"
                autoComplete="username"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-obsidian-muted mb-2">
                비밀번호
              </label>
              <input
                {...register("password")}
                type="password"
                className="w-full rounded-xl border border-obsidian-border bg-obsidian-bg px-4 py-3 text-white placeholder:text-obsidian-muted focus:outline-none focus:ring-2 focus:ring-obsidian-accent/40"
                placeholder="password"
                autoComplete="current-password"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="text-xs text-obsidian-muted hover:text-white transition-colors"
                onClick={() => {
                  setValue("username", "test");
                  setValue("password", "1234");
                }}
                disabled={isLoading}
              >
                test/1234 채우기
              </button>

              <button
                type="button"
                className="text-xs text-obsidian-accent hover:opacity-80 transition-opacity"
                onClick={handleCreateTestUser}
                disabled={isLoading}
              >
                test 계정 생성(개발환경)
              </button>
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-obsidian-border px-4 py-3 text-sm font-bold text-white hover:bg-obsidian-bg/60 transition-colors"
              onClick={handleDevExternalLogin}
              disabled={isLoading}
            >
              DEV 외부ID 로그인 (비번 없음)
            </button>

            {serverError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-obsidian-accent px-4 py-3 font-bold text-black hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "로그인중.." : "로그인"}
            </button>
          </form>
        </main>

        <footer className="mt-10 text-center text-xs text-obsidian-muted">
          /login 성공 후 /home
        </footer>
      </div>
    </div>
  );
};

export default V2UserLoginPage;
