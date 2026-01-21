import { Link } from "react-router-dom";
import { Gift, Trophy, Calendar, Star } from "lucide-react";

export default function MissionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-black mb-2">미션 & 이벤트</h1>
        <p className="text-white/60 mb-8">다양한 미션을 완료하고 보상을 받으세요</p>

        {/* Daily Missions */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold">데일리 미션</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
              <div>
                <div className="font-bold">첫 로그인</div>
                <div className="text-xs text-white/50">매일 접속 시 보상</div>
              </div>
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
              <div>
                <div className="font-bold">게임 3회 플레이</div>
                <div className="text-xs text-white/50">진행도: 0/3</div>
              </div>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Special Events */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-500/30 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold">특별 이벤트</h2>
          </div>
          <div className="bg-white/5 p-4 rounded-xl">
            <div className="font-bold mb-2">신규 가입 환영 보너스</div>
            <div className="text-sm text-white/70 mb-3">
              첫 입금 시 100% 보너스 지급
            </div>
            <Link
              to="/v2/vault"
              className="inline-block px-4 py-2 bg-orange-500 text-white font-bold rounded-lg text-sm"
            >
              금고로 이동
            </Link>
          </div>
        </div>

        {/* Back Button */}
        <Link
          to="/v2/home"
          className="block w-full py-3 bg-white/10 rounded-xl text-center font-bold hover:bg-white/20 transition"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
