---
Project: Golden
Type: Strategy
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# Golden 프로젝트: 시스템 메타데이터 융합 가이드 (v1)

본 문서는 **현재 구현된 시스템 메타 문서**(스키마/용어/정책)를 Golden 프로젝트에 **정확히 연결**하는 지침입니다.

---

## 1) 목적
- 운영/기획/개발이 **동일한 SoT**를 기반으로 프롬프트/문서를 생산
- Golden 전략/기술 문서가 **실제 시스템 제약**과 충돌하지 않도록 예방

---

## 2) 메타 문서 ↔ Golden 레이어 매핑

| 메타 문서 | 역할 | Golden 적용 레이어 | 사용 목적 |
| --- | --- | --- | --- |
| `2026_core_economy_glossary_ko.md` | 경제 SoT | Strategy/TechSpec | 금고/토큰/인벤 규칙 고정 |
| `2026_game_action_schema_ko.md` | 게임 API 스키마 | TechSpec | 응답 필드/트리거 설계 |
| `2026_admin_game_config_schema_ko.md` | 어드민 설정 표준 | TechSpec | 룰렛/주사위/복권 구성 기준 |
| `2026_notification_feed_schema_ko.md` | 알림 채널 스키마 | Strategy/TechSpec | 인앱 피드/토스트 기준 |
| `2026_ops_plan_execution_result_schema.md` | OPS 실행 결과 | Report | 운영 실행 결과 기록 기준 |
| `2026_progression_schema_ko.md` | 성장/시즌패스 | Strategy/TechSpec | 레벨/XP/보상 구조 고정 |
| `2026_strict_vault_policy.md` | 제재/보안 정책 | Strategy/Report | 금고 제재/제한 정책 반영 |

---

## 3) Golden 프롬프트 작성 원칙

### A. SoT 우선
- **반드시 메타 문서의 SoT를 먼저 인용**하고, Golden 아이디어/기술을 연결합니다.

### B. 제약 고정
- 항상-on 구조, KST 기준, 금액 정수 포맷, 인앱 중심(푸시 미지원)을 **항상 포함**합니다.

### C. 적용 레이어 명시
- 결과물이 **Strategy/TechSpec/Research/Report** 중 어디에 들어갈지 지정합니다.

---

## 4) 서버 배포 진행도/가이드 반영 규칙

### A. 배포 진행도 기록 규칙
- **진행 상태를 항상 문서에 남김**: Draft/Review/Approved + 배포 상태(Planning/In-Progress/Deployed)
- **변경 범위 명시**: Backend/Frontend/DB/Docs 중 영향 범위를 최소 1개 선택
- **검증 결과**: 테스트/스크립트/로그 1개 이상 근거 포함

### B. 배포 가이드 프롬프트 템플릿
```
[Golden/Deploy-Guide]
목표: {배포 목적}
범위: {Backend|Frontend|DB|Docs}
환경: {Local|Staging|Prod}
검증: {테스트/스크립트/로그}
출력: 배포 단계 + 롤백 요약
```

---

## 5) 브랜치 명명 규칙 (Golden 전용)

### A. 기본 규칙
- 신규 Golden 작업은 **`golden`** 또는 **`golden_v1`** 프리픽스 사용
- 예시: `golden/ops-report`, `golden_v1/prompt-guidelines`

### B. 브랜치 명명 프롬프트 템플릿
```
[Golden/Branch]
작업: {작업명 요약}
버전: {golden|golden_v1}
출력: 브랜치명 1개
```

---

## 6) 실전 프롬프트 템플릿
```
[Golden/Meta-Integrated]
목표: {지표/문제}
SoT 근거: {메타 문서 파일명}
적용 레이어: {Strategy|TechSpec|Research|Report}
채널/노출: {UI 위치}
제약: {항상-on, KST, 금액 정수, 푸시 미사용}
출력: {아이디어|카피|스키마|실행계획}
```

---

## 7) 품질 체크리스트
- [ ] SoT 문서 1개 이상 명시됨
- [ ] 적용 레이어가 명확함
- [ ] 제약(항상-on/KST/정수/인앱)이 포함됨
- [ ] 금고 카피 금지어(보상/이벤트/참여/충전) 회피

---

## 8) 예시
```
[Golden/Meta-Integrated]
목표: Ticket Zero 전환율 상승
SoT 근거: 2026_core_economy_glossary_ko.md
적용 레이어: Strategy
채널/노출: Ticket Zero 모달
제약: 항상-on, KST, 금액 정수, 인앱 중심
출력: 카피 A/B 3쌍
```
