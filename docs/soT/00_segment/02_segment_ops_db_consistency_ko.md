문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/DB/운영
상태: SoT

## 0. SoT 요약
- 세그먼트 저장은 `v2_user_segment`가 기준이다.
- 규칙 저장은 `v2_segment_rule`이 기준이다.
- 최신 정책은 2026-02-04 WINNER 포함 규칙을 따른다.
- 정합성 검증은 DB/서비스/운영 지표를 모두 포함한다.

## 1. 목적
세그먼트 영역의 DB 스키마, 운영 정합성, 검증 절차를 통합한다.

## 2. 범위
- DB 테이블/컬럼/제약조건
- 세그먼트 연동 흐름
- 운영 지표/통계
- 정합성 점검 및 트러블슈팅

## 3. 데이터 모델 맵
### 3.1 v2_user_segment
- user_id (PK, FK -> v2_user.id)
- segment (CRM 세그먼트)
- pending_segment (7일 후 적용할 세그먼트, NEW 보호기간용)
- **previous_segment** (직전 세그먼트, Grace Period 판정용) — 2026-02-16 추가
- total_margin, total_charge
- inactive_days
- updated_at (onupdate=utcnow, 세그먼트 전환 시각)

### 3.2 v2_segment_rule
- priority, enabled
- condition_json
- segment

### 3.3 hq_prospective_user
- nickname, cc_id
- segment
- is_joined

### 3.4 v2_user
- hq_segment (참고용)
- telegram_id, telegram_username

## 4. 제약조건
### 4.1 FK
- v2_user_segment.user_id -> v2_user.id
- hq_prospective_user.linked_user_id -> v2_user.id

### 4.2 CHECK
- segment IN (NEW, COMMON, VIP, WHALE, AT_RISK, WINNER)

### 4.3 UNIQUE
- v2_user.cc_id
- v2_user.telegram_id

## 5. 인덱스 기준
- v2_user_segment.user_id (PK)
- v2_user_segment.segment (조회 최적화)
- v2_segment_rule.priority
- hq_prospective_user.nickname

## 6. 연동 흐름
### 6.1 규칙 평가
1) v2_segment_rule 로드
2) priority 오름차순 평가
3) 첫 매칭 규칙 결과 적용

### 6.2 HQ CSV Import
1) HQ 데이터 파싱
2) V2User 매칭 시 세그먼트 갱신
3) 미매칭은 잠재유저로 보관

### 6.3 운영 배치
- 일 1회 배치로 세그먼트 갱신
- 운영 필요 시 수동 실행

## 7. 정합성 기준
### 7.1 정책 정합성
- NEW/VIP/WHALE 기준이 최신 문서와 일치
- WINNER 포함 여부 확인

### 7.2 데이터 정합성
- 세그먼트 키가 허용 목록 내인지 확인
- 미매칭 유저 비율 확인

### 7.3 운영 정합성
- 통계/이벤트 타겟팅/UI가 동일 키를 사용

## 8. 운영 지표
- 세그먼트별 유저 수
- 신규 NEW 비율
- VIP/WHALE 전환율
- AT_RISK 비율
- WINNER 분포

## 9. 운영 리스크
- 규칙 누락으로 COMMON 과다 분류
- NEW 판정 누락으로 출금 조건 완화
- WINNER 분류 미반영으로 리텐션 전략 누락

## 10. 운영 점검 SQL
```sql
-- 세그먼트별 분포
SELECT segment, COUNT(*) FROM v2_user_segment GROUP BY segment;

-- 허용되지 않은 세그먼트 확인
SELECT segment, COUNT(*) FROM v2_user_segment
WHERE segment NOT IN ('NEW','COMMON','VIP','WHALE','AT_RISK','WINNER')
GROUP BY segment;
```

## 11. 운영 절차
### 11.1 일일 점검
- 세그먼트 배치 실행 여부 확인
- 신규 NEW 비율 확인

### 11.2 주간 점검
- VIP/WHALE 기준 상향 반영 확인
- WINNER 분류 정상 여부 확인

## 12. 트러블슈팅 가이드
### 12.1 세그먼트 미갱신
- 배치 실행 로그 확인
- rule enabled 상태 확인

### 12.2 통계 불일치
- UI 필터 기준과 DB 기준 비교
- hq_segment와 segment 혼동 여부 확인

## 13. 운영 체크리스트
- 세그먼트 키 표준 준수
- 룰 우선순위 충돌 여부
- 배치 실행 여부
- 미매칭 잠재유저 처리 여부
- 통계 화면 키 정합성

## 14. SoT 수립일/변경일
- 최초 수립: 2026-01-18 (grade/segment 기본값)
- 주요 변경: 2026-02-02 (NEW 추가, VIP/WHALE 기준 상향)
- 최신 변경: 2026-02-04 (WINNER 추가)
- 통합 재작성: 2026-02-07

## 15. 참고 문서
- [20260202_segment_new_user_window_rule.md](20260202_segment_new_user_window_rule.md)
- [20260202_segment_unification_common_vip_whale_at_risk.md](20260202_segment_unification_common_vip_whale_at_risk.md)
- [v2_grade_segment_sot_ko.md](v2_grade_segment_sot_ko.md)
- [v2_user_segment_policy_sot_ko.md](v2_user_segment_policy_sot_ko.md)

## 16. 변경 이력
- v1.0 (2026-02-07): 세그먼트 SoT 통합 2문서 중 2권 작성
