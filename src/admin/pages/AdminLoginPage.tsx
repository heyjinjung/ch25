// src/admin/pages/AdminLoginPage.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { setAdminToken } from "../../auth/adminAuth";
import { userApi } from "../../api/httpClient";

const schema = z.object({
  username: z.string().min(1, "아이디를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

type FormData = z.infer<typeof schema>;

type TokenResponse = {
  access_token: string;
  token_type: string;
  user: { id: number; external_id: string; nickname?: string | null; status?: string | null; level?: number | null };
};

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await userApi.post<TokenResponse>("/api/auth/token", {
        external_id: data.username,
        password: data.password,
      });
      setAdminToken(res.data.access_token);
      navigate("/admin");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === "INVALID_CREDENTIALS") {
        setError("password", { message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      } else {
        setError("password", { message: "로그인에 실패했습니다. 잠시 후 다시 시도하세요." });
      }
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 text-center text-slate-100 shadow-lg shadow-emerald-900/30">
      <h1 className="mb-4 text-2xl font-bold">Admin 로그인</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <input
          {...register("username")}
          placeholder="아이디 (admin)"
          className="rounded px-3 py-2 bg-slate-800 border border-emerald-700 text-slate-100"
        />
        {errors.username && <span className="text-red-400 text-sm">{errors.username.message}</span>}
        <input
          {...register("password")}
          type="password"
          placeholder="비밀번호"
          className="rounded px-3 py-2 bg-slate-800 border border-emerald-700 text-slate-100"
        />
        {errors.password && <span className="text-red-400 text-sm">{errors.password.message}</span>}
        <button type="submit" className="mt-2 rounded bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-700">
          로그인
        </button>
      </form>
    </section>
  );
};

export default AdminLoginPage;
