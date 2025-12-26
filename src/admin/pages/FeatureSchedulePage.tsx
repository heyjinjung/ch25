// src/admin/pages/FeatureSchedulePage.tsx
import React from "react";
import { Plus } from "lucide-react";

const FeatureSchedulePage: React.FC = () => {
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#91F402]">기능 일정</h2>
          <p className="mt-1 text-sm text-gray-400">날짜별 feature_type을 운영합니다.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black"
        >
          <Plus size={18} className="mr-2" />
          새 일정 업서트
        </button>
      </header>

      <div className="rounded-lg border border-[#333333] bg-[#111111] p-6 shadow-md">
        <div className="rounded-lg border border-[#333333] bg-[#0A0A0A] p-4 text-sm text-gray-200">
          <p className="font-medium text-white">연동 준비 중</p>
          <p className="mt-1 text-gray-400">스케줄 조회 API 연동 전까지는 샘플 데이터가 없습니다.</p>
        </div>

        <div className="mt-6 rounded-lg border border-[#333333] bg-[#0A0A0A] p-4">
          <p className="text-sm font-medium text-[#91F402]">예정 UX</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-400">
            <li>기간(시작/종료)별 feature_type 지정</li>
            <li>현재 적용 중인 일정 확인</li>
            <li>업서트(추가/수정) 및 비활성화</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FeatureSchedulePage;
