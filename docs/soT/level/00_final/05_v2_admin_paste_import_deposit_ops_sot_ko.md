문서 타입: 운영 SoT (최종)
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: 운영/BE/어드민 FE
상태: SoT

## 1. 목적 (Purpose)
붙여넣기 Import(데일리 입금/게임 로그)가 레벨/XP 및 입금 누적 SoT에 미치는 영향을 **운영 관점에서** 최종 정리한다.

## 2. 범위 (Scope)
- 붙여넣기 Import 입력 포맷(데일리 입금 중심)
- Preview/Import API 계약(선택 Import 포함)
- 시간 파싱 및 중복/과거 데이터 스킵 규칙
- 레벨/XP/입금 SoT 연쇄 업데이트 원칙

## 3. 도메인 연쇄(중요)
- 데일리 입금 Import → `v2_user.total_charge_amount` 업데이트
- 입금 누적 변경은 CC 입금 XP 규칙과 결합될 수 있으므로, XP 적립/레벨 판정이 연동되는 구현에서는 다음을 반드시 보장한다.
  - Primary SoT(`v2_user.level/xp/total_charge_amount`) 우선
  - 레거시 mirror(`user_level_progress`, `external_ranking_data`) 동기화
  - XP 이벤트 로그(`user_xp_event_log`) 기록

## 4. 입력 포맷(데일리 입금)
예시:
- 컬럼: 번호 / 소속 / 이름(아이디) / 닉네임 / 신청날짜 / 충전금액 / 입금자명 / 충전날짜 / 상태

## 5. 시간 파싱 규칙
- 시간 정보가 존재하면(예: `:` 포함) 이를 우선 사용한다.
- 00:00:00으로 들어오는 레거시 데이터는 “최신 기록” 판정에 악영향을 줄 수 있으므로, 최신 기준 계산에서 제외하는 보정이 필요할 수 있다.

## 6. Preview/Import API 규약
### 6.1 상태 분류(Preview)
- `MATCHED`: 유저 매칭됨(Import 가능)
- `NOT_FOUND`: 유저 미등록(Import 불가)
- `DUPLICATE`: 이미 Import됨(Import 불가)
- `SKIPPED_OLD`: DB 최신 기록 이전(Import 불가)

### 6.2 선택 Import
- `selected_indices`가 null이면 전체 처리, 배열이면 해당 인덱스만 처리한다.

## 7. 운영 초기화(주의)
운영 DB 초기화 쿼리는 환경/권한에 따라 위험할 수 있으므로, 실행 전 반드시 영향 범위를 검증한다.
(예: 입금 로그 삭제, 유저 레벨/XP 초기화, 지갑 잔액 초기화)

## 8. 운영 체크리스트
- [ ] Preview에서 상태가 기대대로 분류되는지
- [ ] Import 실행 후 중복 기록이 없는지
- [ ] 최신 시간 기준 스킵 정책이 의도대로 작동하는지

## 9. 관련 문서 (Sources)
- ../20260204_paste_import_enhancement.md
- ../20260204_v2_sot_consolidation.md

## 10. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 레벨 도메인 기준으로 Paste Import 운영 SoT 정렬
