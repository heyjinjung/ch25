// src/admin/pages/FeatureSchedulePage.tsx
import React from "react";
import { Plus } from "lucide-react";

const FeatureSchedulePage: React.FC = () => {
  return (
    <section className="admin-page-container">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-admin-title text-admin-text-primary">기능 일정</h2>
          <p className="mt-1 text-admin-body text-admin-text-secondary">기간별 feature_type 운영 일정을 관리합니다.</p>
        </div>
        <button
          type="button"
          className="btn-admin-primary"
        >
          <Plus size={18} className="mr-2" />
          일정 추가
        </button>
      </header>

      <div className="admin-card p-6">
        <div className="admin-card p-4">
          <p className="text-admin-body text-admin-text-primary font-bold">연동 준비 중</p>
          <p className="mt-1 text-admin-body text-admin-text-secondary">조회/저장 API 연동 전까지는 UI 스켈레톤만 제공합니다.</p>
        </div>

        <div className="mt-6 admin-card p-4">
          <p className="text-admin-body font-bold text-admin-brand">UX 체크</p>
          <ul className="mt-2 list-disc pl-5 text-admin-body text-admin-text-secondary">
            <li>기간(시작/종료)과 feature_type 지정</li>
            <li>현재 적용 중인 일정 확인</li>
            <li>일정 추가/수정 및 비활성화</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FeatureSchedulePage;
