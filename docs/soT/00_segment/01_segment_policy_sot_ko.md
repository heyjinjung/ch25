문서 타입: SoT
버전: v1.1
작성일: 2026-02-16
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 0. SoT 요약
- 세그먼트 SoT는 `v2_segment_rule`과 `v2_user_segment.segment`를 기준으로 한다.
- 최신 문서 우선 규칙에 따라 2026-02-04 정책( WINNER 포함 )이 최상위다.
- 기본 세그먼트는 COMMON이며, NEW는 7일 신규 보호 조건을 만족할 때만 적용한다.
- VIP/WHALE의 7일 입금 기준은 3,000,000 / 5,000,000이다.

## 1. 목적
V2 세그먼트 분류 규칙과 운영 기준을 단일 SoT로 정의한다.

## 2. 범위
- 세그먼트 키 표준
- 규칙 저장/평가 기준
- NEW, VIP, WHALE, AT_RISK, WINNER 분류 규칙
- 운영/검증 기준

## 3. 최신 우선 규칙
- 2026-02-04 문서가 가장 최신이므로 WINNER 세그먼트를 포함한다.
- 2026-02-02 문서의 NEW 정책 및 7일 입금 기준 상향을 반영한다.
- 2026-01-18의 grade 값은 최신 표준 키에 의해 대체된다.

## 4. 용어 정의
- 세그먼트: 운영/CRM 타게팅을 위한 유저 분류 키
- 룰: 세그먼트 판정을 위한 조건 집합
- First-match-wins: priority 오름차순의 첫 매칭 규칙이 최종 결과가 됨

## 5. 세그먼트 키 표준
### 5.1 허용 키
- NEW
- COMMON
- VIP
- WHALE
- AT_RISK
- WINNER

### 5.2 표기 규칙
- 영문 대문자/숫자/언더스코어만 허용
- 공백 및 소문자 금지

### 5.3 기본 세그먼트
- 기본값은 COMMON
- 규칙 미매칭 시 기존 세그먼트 유지
- 최초 분류 시 매칭이 없으면 COMMON으로 설정

## 6. 규칙 저장 및 평가 기준
### 6.1 저장소
- 규칙은 `v2_segment_rule`에 저장한다.

### 6.2 평가 순서
- priority 오름차순으로 평가한다.
- enabled=false는 평가하지 않는다.
- 첫 매칭 규칙이 결과를 결정한다.

## 7. 분류 기준 상세
### 7.1 NEW (신규 7일)
- 기준: 가입 7일 이내
- 텔레그램 인증 기반: `telegram_id` 연결 유저만 대상
- 입금 이력 존재 시 NEW 제외

### 7.2 VIP
- 최근 7일 입금 3,000,000 이상

### 7.3 WHALE
- 최근 7일 입금 5,000,000 이상

### 7.4 AT_RISK
- 미접속 7일 이상 + 마진 양수

### 7.5 WINNER
- 마진 < 0 (회사 손해, 유저가 이기는 상태)
- HQ Import 시 자동 분류
- 리텐션 보상 base_rate 3%

### 7.6 COMMON
- 위 조건에 매칭되지 않는 기본 세그먼트

## 8. 평가 주기
- 일 1회 배치 실행(Celery)을 기본으로 한다.
- 운영 필요 시 수동 실행을 허용한다.
- **NEW 자동 만료**: `get_current_segment()` 호출 시 NEW 유저의 7일 보호기간 만료를 실시간 감지하여 인라인 전환한다. 배치 미실행 시에도 안전하게 동작한다.

## 8.1 NEW → 다른 세그먼트 전환 시 동작
1. `segment_service.get_current_segment()` 호출
2. segment=NEW이며 가입 후 7일+09:00 KST 경과 확인
3. `row.previous_segment = "NEW"` 기록 (Grace Period 판정용)
4. `pending_segment` 존재 시 해당 값 적용, 없으면 규칙 재평가
5. DB 커밋 후 새 세그먼트 반환

## 8.2 전환 유예 기간 (Grace Period)
- NEW → 다른 세그먼트 전환 후 **3일간** 기존 NEW 출금 조건 유지
- 판정: `previous_segment = 'NEW'` AND `updated_at`으로부터 3일 이내
- 3일 경과 후 자동으로 새 세그먼트 조건 적용
- 상세 정책은 Vault SoT §7.4 참조

## 9. 입력 데이터 및 조건 필드
### 9.1 데이터 소스
- V2 사용자/활동/입금/게임 지표 테이블

### 9.2 현재 지원 조건 필드
- last_play_at, last_active_at
- days_since_last_play, days_since_last_active
- roulette_plays, dice_plays, lottery_plays
- deposit_amount
- vault_balance
- account_age_days
- is_telegram_linked
- has_charge_history

### 9.3 미지원 필드
- 미지원 필드는 매칭 실패로 처리한다.

## 10. 기본 동작
- 규칙에 매칭되지 않으면 기존 세그먼트를 유지한다.
- 최초 분류 시 매칭이 없으면 COMMON으로 설정한다.

## 11. 충돌 처리 규칙
- 동일 유저가 여러 규칙에 매칭될 경우 priority가 낮은 규칙이 우선한다.
- 최신 문서의 기준이 이전 기준을 덮어쓴다.

## 12. 운영 정책 연계
- 세그먼트는 운영 통계, 이벤트 타겟팅, 리텐션 개입의 기준이 된다.
- 금고 출금 조건에서 NEW/AT_RISK에 강화 조건이 적용될 수 있다.

## 13. 코드베이스 매핑
### 13.1 백엔드
- 규칙 저장: v2_segment_rule
- 세그먼트 결과: v2_user_segment.segment
- 분류 서비스: segment_service

### 13.2 프론트엔드
- 세그먼트 옵션 드롭다운
- 관리자 통계/필터

## 14. SoT 수립일/변경일
- 최초 수립: 2026-01-18 (grade/segment 기본값 정의)
- 핵심 변경: 2026-02-02 (NEW 추가, VIP/WHALE 기준 상향)
- 최신 변경: 2026-02-04 (WINNER 추가)
- 통합 재작성: 2026-02-07

## 15. 운영 체크리스트
- 세그먼트 키 표준 준수 여부
- 룰 우선순위 충돌 여부
- 일 1회 배치 실행 여부
- NEW 판정 조건(텔레그램/입금 이력) 확인
- VIP/WHALE 7일 입금 기준 상향 적용 확인
- WINNER 분류 기준(마진 < 0) 적용 확인

## 16. 예시 규칙 구성
### 16.1 NEW 규칙
- account_age_days <= 7
- is_telegram_linked == true
- has_charge_history == false

### 16.2 VIP 규칙
- deposit_amount_7d >= 3000000

### 16.3 WHALE 규칙
- deposit_amount_7d >= 5000000

### 16.4 AT_RISK 규칙
- days_since_last_active >= 7
- margin_total > 0

### 16.5 WINNER 규칙
- margin_total < 0

## 17. 주의사항
- 세그먼트 키는 DB CHECK 제약조건과 일치해야 한다.
- NEW는 신규 보호 정책이며 운영상 예외 적용은 문서화한다.
- WINNER는 분류만 확정되고 비즈니스 로직은 최소화 상태다.

## 18. 참고 문서
- [20260202_segment_new_user_window_rule.md](20260202_segment_new_user_window_rule.md)
- [20260202_segment_unification_common_vip_whale_at_risk.md](20260202_segment_unification_common_vip_whale_at_risk.md)
- [v2_grade_segment_sot_ko.md](v2_grade_segment_sot_ko.md)
- [v2_user_segment_policy_sot_ko.md](v2_user_segment_policy_sot_ko.md)

## 19. 변경 이력
- v1.1 (2026-02-16): §8 NEW 자동 만료(인라인), §8.1 전환 동작, §8.2 Grace Period 추가, previous_segment 컬럼 반영
- v1.0 (2026-02-07): 세그먼트 SoT 통합 2문서 중 1권 작성
