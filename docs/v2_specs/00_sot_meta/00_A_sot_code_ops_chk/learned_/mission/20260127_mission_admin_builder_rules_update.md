# 2026-01-27 미션관리(어드민) 조립 규칙 명확화 업데이트

## Triage Summary
- 문제: 어드민 미션관리에서 `category(탭)` / `action_type(트리거)` / `logic_key(고유 식별)` / `condition(조건)`의 역할이 UI에서 명확히 드러나지 않아 운영자가 조합 가능 여부를 자주 혼동.
- 핵심 오해:
  - `condition`이 실제 실행 조건(로직 조건)이라고 오해
  - `logic_key` 중복 제한이 “탭(카테고리) 내부만”이라고 오해
  - 골든하워 미션이 “추가 조건” 조합으로만 성립한다고 오해

## Root Cause Hypotheses (ranked)
1) (가장 큼) UI 라벨/설명이 `condition`을 실제 로직 조건처럼 보이게 함
2) `logic_key` 제약(전역 UNIQUE)과 충돌 대상 미션 정보가 UI에서 즉시 확인되지 않음
3) 골든하워 판정이 `logic_key` 네이밍 규칙 기반(문자열 포함)이라는 사실이 UI에 노출되지 않음

## Fix Plan

### Allowed Files
- 프론트 어드민: src/v2/admin/pages/game/MissionManagerPage.tsx
- 문서: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/

### Out of Scope
- 백엔드 미션 판정 로직 변경
- DB 제약 변경(`logic_key` unique 정책 변경)
- 기존 미션 데이터 마이그레이션

### Changes
- Create/Edit 다이얼로그 모두에 “미션 조립 프리뷰”를 노출하여 아래를 한 화면에서 확인 가능하게 함:
  - `category` = 리셋/집계 정책(DAILY/WEEKLY/NEW_USER/SPECIAL)
  - `action_type` = 진행 트리거(update_progress 매칭)
  - `logic_key` = 전역 UNIQUE 식별자(충돌 시 어떤 미션과 충돌하는지 표시)
  - `condition` = 설명/표시용(실제 로직 조건이 아님)
- 프리셋 선택 시 권장 `action_type` 자동 세팅(운영자 실수 감소)
- 골든하워 관련 경고: `logic_key`에 `golden_hour` 포함 + `action_type=PLAY_GAME` 조합을 권장(게임플레이 트리거 기반)

## Patch (What changed)
- 어드민 미션관리 편집(Edit) 다이얼로그에도 Create와 동일한 UX 가드(프리셋→권장 actionType, 표시용 라벨, 조립 프리뷰)를 적용.

## Verify Checklist
- [ ] Create 다이얼로그에서 프리셋 선택 시 `action_type`이 자동 추천값으로 세팅되는지
- [ ] Edit 다이얼로그에서도 동일하게 동작하는지
- [ ] `condition` 라벨이 “설명(표시용)”으로 표시되는지
- [ ] 조립 프리뷰가 category/actionType/logicKey/condition 의미를 정확히 안내하는지
- [ ] logic_key 중복 시 충돌 미션(카테고리/제목) 정보가 포함되어 표시되는지

## Ship Notes
- 운영자 혼란의 80%는 “이 필드가 무엇을 의미하는가” 문제라 판단하여, 로직 변경 없이 UI 프리뷰/경고/자동 추천으로 실수를 줄이는 방향으로 정리.
- 리스크: 프리셋 자동 `action_type` 추천이 기존 운영자의 의도와 다를 수 있어, 자동 세팅 이후에도 사용자가 직접 변경 가능하도록 유지.
