# 프로젝트 'Golden' 문서 규칙 (Documentation Policy)

본 문서는 프로젝트 **'Golden'** (리텐션 고도화 및 AI 적응형 엔진 구축 프로젝트)의 효율적인 협업 및 문서 관리를 위한 표준 규칙을 정의합니다.

---

## 1. 문서 명명 규칙 (Naming Convention)

*   **언어**: 모든 기술 사양서 및 전략 문서는 **한국어**를 기본으로 함 (필요 시 영문 병기).
*   **프로젝트 접두어**: 모든 관련 문서는 프로젝트명인 `golden_`을 접두어로 사용함.
    *   예: `golden_strategy_v1.md`, `golden_schema_design.md`
*   **버전 관리**: 중요한 변경이 있을 경우 `_v1`, `_v2` 등의 접미사를 붙여 이력을 관리함.

---

## 2. 폴더 구조 (Folder Structure)

프로젝트 'Golden' 관련 문서는 아래 구조에 따라 저장함.

```text
docs/
└── 09_marketing/
    └── golden/                # 프로젝트 Golden 메인 폴더
        ├── 01_strategy/       # 전략 및 비전 문서
        ├── 02_tech_spec/      # 기술 사양서 및 설계도
        ├── 03_research/       # 데이터 분석 및 외부 사례 조사
        └── 04_report/         # 프로젝트 진행 및 성과 보고서
```

---

## 3. 문서 템플릿 표준 (Standard Template)

모든 `golden_` 문서 상단에는 아래 메타데이터 블록을 포함함.

```markdown
---
Project: Golden
Type: [Strategy / TechSpec / Research / Report]
Author: Antigravity (AI) & USER
Status: [Draft / Review / Approved]
Last Updated: 2026-01-17
---
```

---

## 4. 커뮤니케이션 및 업데이트 규칙

1.  **실시간성**: 새로운 데이터 인사이트(예: NotebookLM 분석 결과)는 발견 즉시 `golden/03_research/` 폴더에 문서화함.
2.  **동기화**: 기술적 변경 사항은 반드시 `adaptive_engine_spec`과 연동하여 업데이트함.
3.  **승인 프로세스**: 모든 `Draft` 문서는 유저의 승인 후 `Status: Approved`로 전환하며, 이후 구현 단계로 진입함.

---

## 5. 기존 문서 정비 계획

기존에 작성된 `retention_` 관련 문서들은 프로젝트 규칙에 따라 다음과 같이 이동 및 이름을 변경함.

*   `retention_strategy_framework.md` -> `golden/golden_master_map.md`
*   `adaptive_engine_spec_v1.md` -> `golden/02_tech_spec/golden_adaptive_engine_v1.md`
*   `system_diagnosis_report_v2.md` -> `golden/01_strategy/golden_diagnosis_v2.md`
