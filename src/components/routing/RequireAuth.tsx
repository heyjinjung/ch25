import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import { useTelegram } from "../../providers/TelegramProvider";

const RequireAuth: React.FC = () => {
  const { token } = useAuth();
  const { isReady, initData } = useTelegram();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-figma-accent/20 border-t-figma-accent rounded-full animate-spin" />
          <div className="absolute inset-0 blur-lg bg-figma-accent/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!token) {
    if (!initData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F0E0E] p-6 text-center overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-figma-accent/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-sm w-full space-y-8 animate-float-slow">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-figma-accent to-emerald-900 flex items-center justify-center shadow-[0_0_50px_rgba(48,255,117,0.3)]">
                <span className="text-4xl">🤖</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
                Telegram <span className="text-figma-accent">Native</span>
              </h2>
              <div className="h-1 w-12 bg-figma-accent mx-auto rounded-full" />
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                이 서비스는 텔레그램 미니앱 전용 서비스입니다.<br />
                <span className="text-figma-accent/80 font-bold">@cc_jm_2026_bot</span>을 통해 입장해주세요.
              </p>
            </div>

            <a
              href="https://t.me/cc_jm_2026_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-block w-full py-4 px-6 rounded-xl bg-figma-accent text-black font-black text-sm uppercase tracking-widest shadow-[0_10px_30px_rgba(48,255,117,0.3)] hover:brightness-110 active:scale-95 transition-all"
            >
              Telegram 입장하기
            </a>
          </div>
        </div>
      );
    }

    // Authenticating state
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
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
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default RequireAuth;
