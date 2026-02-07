문서 타입: 변경로그
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/DB/운영
상태: 완료

## 1. 변경 요약
- 분산된 세그먼트 SoT 문서를 2개 문서로 통합
- 최신 문서 우선 규칙에 따라 WINNER 포함 정책을 최우선 반영

## 2. 통합 대상
- 20260202_segment_new_user_window_rule.md
- 20260202_segment_unification_common_vip_whale_at_risk.md
- v2_grade_segment_sot_ko.md
- v2_user_segment_policy_sot_ko.md

## 3. 신규 문서
- 01_segment_policy_sot_ko.md
- 02_segment_ops_db_consistency_ko.md

## 4. 충돌 처리
- 최신일(2026-02-04) 기준으로 WINNER 세그먼트 포함
- 2026-02-02 기준의 NEW 정책과 7일 입금 기준 상향 반영
- 2026-01-18 기준의 grade 값은 최신 표준 키로 대체

## 5. 후속 조치
- 세그먼트 배치 실행 여부 점검
- 통계/타겟팅 화면 키 정합성 확인
