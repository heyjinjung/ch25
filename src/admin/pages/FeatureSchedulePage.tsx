// src/admin/pages/FeatureSchedulePage.tsx
import React from "react";
import Button from "../../components/common/Button";

const FeatureSchedulePage: React.FC = () => {
  return (
    <section className="space-y-4 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Feature 스케줄</h1>
          <p className="text-sm text-slate-300">TODO: 날짜별 feature_type을 관리하는 UI를 추가합니다.</p>
        </div>
        <Button variant="secondary">새 스케줄 업서트</Button>
      </div>
      <div className="rounded-lg border border-emerald-800/50 bg-slate-900 p-4 text-slate-200">
        <p>스케줄 조회 API 연동 전까지는 샘플 데이터가 없습니다.</p>
      </div>
    </section>
  );
};

export default FeatureSchedulePage;
