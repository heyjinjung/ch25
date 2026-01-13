// src/admin/pages/AdminLoginPage.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  User,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Key
} from "lucide-react";
import { setAdminToken } from "../../auth/adminAuth";
import { adminApi } from "../api/httpClient";

const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

type LoginForm = z.infer<typeof loginSchema>;

const AdminLoginPage: React.FC = () => {
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
      // Direct access to auth token endpoint
      // Note: Backend canonical is often /api/auth/token or similar.
      // httpClient uses resolvedBaseURL, and for auth we typically hit /api/auth/token.
      const res = await adminApi.post("/api/auth/token", {
        external_id: data.username,
        password: data.password
      });

      if (res.data.access_token) {
        setAdminToken(res.data.access_token);
        navigate("/admin");
      }
    } catch (err: any) {
      setServerError(
        err.response?.data?.detail || "인증에 실패했습니다. 자격 증명을 확인하세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-admin-brand/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-admin-accent/5 rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700">
        <header className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-admin-sidebar border border-admin-border mb-4 shadow-admin-card">
            <ShieldCheck className="h-8 w-8 text-admin-brand" />
          </div>
          <h1 className="text-3xl font-black text-admin-text-primary tracking-tight">관리자 로그인</h1>
        </header>

        <main className="admin-card-premium p-8 rounded-[2rem] border border-admin-border shadow-admin-card relative overflow-hidden">
          {/* Subtle Glow at top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-admin-brand to-transparent opacity-50" />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest flex items-center gap-2 pl-1">
                <User className="h-3.5 w-3.5" />
                ID
              </label>
              <div className="relative group">
                <input
                  {...register("username")}
                  type="text"
                  placeholder="아이디"
                  className={`admin-input w-full pl-5 pr-4 h-14 bg-admin-sidebar/50 focus:bg-admin-sidebar transition-all ${errors.username ? "border-admin-danger ring-1 ring-admin-danger/20" : ""
                    }`}
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="text-admin-meta text-admin-danger mt-1 flex items-center gap-1.5 px-1 animate-in slide-in-from-left-2">
                  <AlertCircle className="h-3 w-3" />
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest flex items-center gap-2 pl-1">
                <Key className="h-3.5 w-3.5" />
                Password
              </label>
              <div className="relative group">
                <input
                  {...register("password")}
                  type="password"
                  placeholder="비밀번호"
                  className={`admin-input w-full pl-5 pr-4 h-14 bg-admin-sidebar/50 focus:bg-admin-sidebar transition-all ${errors.password ? "border-admin-danger ring-1 ring-admin-danger/20" : ""
                    }`}
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-admin-meta text-admin-danger mt-1 flex items-center gap-1.5 px-1 animate-in slide-in-from-left-2">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="p-4 rounded-xl bg-admin-danger/10 border border-admin-danger/20 flex items-start gap-3 animate-shake">
                <AlertCircle className="h-5 w-5 text-admin-danger mt-0.5 shrink-0" />
                <p className="text-admin-meta text-admin-danger font-bold leading-relaxed">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-admin-primary w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-3 shadow-admin-glow group hover:brightness-110 active:scale-95 transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  로그인
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </main>

        <footer className="mt-12 text-center text-admin-meta text-admin-text-muted space-y-4">
          <p>© 2026 Admin System</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminLoginPage;
