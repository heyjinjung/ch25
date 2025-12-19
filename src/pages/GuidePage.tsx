import React from "react";
import GamePageShell from "../components/game/GamePageShell";

const GuidePage: React.FC = () => {
  return (
    <GamePageShell title="홈페이지 가이드">
      <div className="mx-auto max-w-3xl space-y-12 p-6 text-white">
        <section className="space-y-4 text-center">
          <h1 className="text-4xl font-bold text-cc-lime">CC Casino 가이드</h1>
          <p className="text-xl text-gray-300">
            지민코드 전용 포인트 서비스에 오신 것을 환영합니다.
            <br />
            개인정보 없이 자유롭게 즐기세요.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">🎮</div>
            <h3 className="mb-2 text-xl font-bold text-cc-lime">1. 게임 플레이</h3>
            <p className="text-sm text-gray-400">
              룰렛, 주사위, 복권 등 다양한 미니게임을 즐기고 포인트를 획득하세요.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">📈</div>
            <h3 className="mb-2 text-xl font-bold text-cc-lime">2. 레벨업</h3>
            <p className="text-sm text-gray-400">
              경험치를 쌓아 레벨을 올리고 시즌 패스 보상을 획득하세요.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">🏆</div>
            <h3 className="mb-2 text-xl font-bold text-cc-lime">3. 팀 배틀</h3>
            <p className="text-sm text-gray-400">
              팀에 기여하고 승리하여 더 큰 보상을 함께 나누세요.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-cc-lime/30 bg-gradient-to-b from-cc-lime/10 to-transparent p-8">
          <h2 className="mb-6 text-2xl font-bold">자주 묻는 질문</h2>
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 font-bold text-cc-lime">Q. 티켓은 어떻게 얻나요?</h4>
              <p className="text-gray-300">
                매일 로그인하거나, 특정 미션을 완료하면 티켓을 얻을 수 있습니다. 지민이에게 문의하세요.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-bold text-cc-lime">Q. 포인트는 어디에 쓰나요?</h4>
              <p className="text-gray-300">
                획득한 포인트는 다양한 경품 응모나 레벨업에 사용됩니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </GamePageShell>
  );
};

export default GuidePage;
