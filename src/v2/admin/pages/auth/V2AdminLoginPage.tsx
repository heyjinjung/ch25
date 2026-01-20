import { useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import { setAdminToken } from "../../../../auth/adminAuth";
import { v2Client } from "../../../api/client";

const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

type LoginForm = z.infer<typeof loginSchema>;

const V2AdminLoginPage: FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await v2Client.post("/api/auth/token", {
        external_id: data.username,
        password: data.password,
      });

      const token = res?.data?.access_token;
      if (token) {
        setAdminToken(token);
        navigate("/v2/admin/dashboard");
        return;
      }

      setServerError("인증에 실패했습니다. 자격 증명을 확인하세요.");
    } catch (err: any) {
      setServerError(
        err?.response?.data?.detail ||
          "인증에 실패했습니다. 자격 증명을 확인하세요.",
      );
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
            관리자 로그인 (V2)
          </h1>
          <p className="text-sm text-obsidian-muted">/v2/admin 전용 로그인</p>
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
                placeholder="external_id"
                autoComplete="username"
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
              />
              {errors.password && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

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
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default V2AdminLoginPage;
