// src/admin/pages/FeatureSchedulePage.tsx
import React from "react";
import { Plus } from "lucide-react";

const FeatureSchedulePage: React.FC = () => {
  return (
    <section className="admin-page-container">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-admin-title text-admin-text-primary">기능 ?�정</h2>
          <p className="mt-1 text-admin-body text-admin-text-secondary">기간�?feature_type ?�영 ?�정??관리합?�다.</p>
        </div>
        <button
          type="button"
          className="btn-admin-primary"
        >
          <Plus size={18} className="mr-2" />
          ?�정 추�?
        </button>
      </header>

      <div className="admin-card p-6">
        <div className="admin-card p-4">
          <p className="text-admin-body text-admin-text-primary font-bold">?�동 준�?�?/p>
          <p className="mt-1 text-admin-body text-admin-text-secondary">조회/?�??API ?�동 ?�까지??UI ?�켈?�톤�??�공?�니??</p>
        </div>

        <div className="mt-6 admin-card p-4">
          <p className="text-admin-body font-bold text-admin-brand">UX 체크</p>
          <ul className="mt-2 list-disc pl-5 text-admin-body text-admin-text-secondary">
            <li>기간(?�작/종료)�?feature_type 지??/li>
            <li>?�재 ?�용 중인 ?�정 ?�인</li>
            <li>?�정 추�?/?�정 �?비활?�화</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FeatureSchedulePage;
