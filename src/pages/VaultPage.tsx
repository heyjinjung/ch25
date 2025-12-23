import React from "react";
import { Link } from "react-router-dom";

const VaultPage: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 text-slate-100">
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Vault</p>
        <h1 className="mt-2 text-2xl font-black text-white">금고 시스템 개발 안내</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
          금고 시스템은 현재 개발 중입니다. 해금 방식과 이용 방법은 개발 완료 후 공지드리겠습니다.
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-200/90">
          <p>예정 안내:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>해금 조건 및 단계별 비율</li>
            <li>충전 확인 절차와 처리 예상 시간</li>
            <li>추가 보상/이벤트 적용 여부</li>
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/landing"
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-black shadow-lg transition hover:bg-amber-400"
          >
            홈으로 돌아가기
          </Link>
          <a
            href="https://t.me/jm956"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
          >
            문의하기
          </a>
        </div>
      </div>
    </div>
  );
};

export default VaultPage;
