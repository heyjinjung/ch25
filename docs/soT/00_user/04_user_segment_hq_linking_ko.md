문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/OPS
상태: SoT

## 0. 요약
- 세그먼트 SoT는 v2_user_segment.segment이다.
- 신규 유저는 7일간 NEW 보호 정책을 적용한다.
- HQ 잠재유저는 prospect linking으로 연결한다.

## 1. 목적
세그먼트 정책과 HQ 연동, 잠재유저 매칭을 표준화한다.

## 2. 세그먼트 키
### 2.1 허용 키
- NEW, COMMON, VIP, WHALE, AT_RISK, WINNER

### 2.2 기본 규칙
- NEW: 가입 7일 이내 + 입금 없음
- VIP: 마진 100만 이상
- WHALE: 누적 충전 500만 이상
- AT_RISK: 미접속 7일 이상 + 마진 양수
- WINNER: 마진 음수

## 3. 신규 7일 보호
### 3.1 정책
- 신규 가입 후 7일 동안 segment는 NEW 유지
- 실제 세그먼트는 pending_segment로 보관

### 3.2 적용 방식
- KST 09:00 이후 배치로 pending_segment 적용

## 4. HQ 잠재유저 연동
### 4.1 HQProspectiveUser
- 미가입 유저를 보관한다.
- segment는 HQ 기준으로 기록한다.

### 4.2 Prospect Linking
- Admin 수동 연결과 User Self-Link를 지원한다.
- external_nickname 기준 퍼지 매칭을 제공한다.

## 5. HQ CSV Import 연동
### 5.1 매칭 규칙
1) cc_id 정확 일치
2) external_nickname 정확 일치
3) nickname 정확 일치
4) telegram_username 정확 일치

### 5.2 미매칭 처리
- 미매칭 로그를 저장한다.
- 수동 매칭 시 즉시 재처리한다.

## 6. 세그먼트 감사
### 6.1 통계 기준
- v2_user_segment는 시스템 SoT
- v2_user.hq_segment는 참고용

### 6.2 운영 체크
- 신규 7일 정책을 우선 확인한다.
- HQ 잠재유저 카운트와 미가입 수를 분리한다.

## 7. 분류 로직 상세
### 7.1 분류 우선순위
1) CSV에 명시된 세그먼트
2) 마진 음수 -> WINNER
3) 마진 100만 이상 -> VIP
4) 미접속 7일 이상 + 마진 양수 -> AT_RISK
5) 누적 충전 500만 이상 -> WHALE
6) 기본 -> COMMON

### 7.2 신규 보호 적용
- 신규 유저는 분류 결과와 무관하게 NEW 유지
- pending_segment는 보호 기간 종료 후 적용

## 8. 연동 지점
### 8.1 서비스
- hq_margin_import_service
- prospect_linking_service
- segment_service

### 8.2 API
- /api/v2/admin/segments
- /api/v2/admin/prospect/*
- /api/v2/user/link-external

## 9. 매칭 시나리오
### 9.1 Admin 수동 매칭
- 잠재유저 목록 조회
- 유저 검색 후 연결
- 즉시 세그먼트 반영

### 9.2 User Self-Link
- 외부 닉네임 입력
- 퍼지 매칭 결과 반환
- 매칭 성공 시 즉시 적용

## 10. 미매칭 처리
### 10.1 상태 코드
- UNMATCHED: 유저 없음
- AMBIGUOUS: 다중 후보
- MATCHED: 연결 완료

### 10.2 재처리
- 수동 매칭 시 CC 입금 동기화 재처리
- 델타 기준으로 XP/미션 반영

## 11. pending_segment 운영
### 11.1 배치 실행
- 매일 09:00 KST 이후 실행
- pending_segment가 있으면 즉시 적용

### 11.2 API
- POST /api/v2/admin/segments/batch/apply-pending
- GET /api/v2/admin/segments/user/{user_id}/pending

## 12. 리텐션 세그먼트 매핑
- HIGH_ROLLER -> VIP/WHALE
- CASUAL_LOYAL -> COMMON
- NEW_USER -> NEW
- CHURN_RISK -> AT_RISK

## 13. 운영 리스크
- NEW 보호 정책 누락 시 신규 미션 진행 불가
- HQ 세그먼트와 CRM 세그먼트 혼동
- WINNER 세그먼트 비즈니스 로직 미정

## 14. 테스트 케이스
- 신규 가입 7일 이내 -> NEW 유지
- pending_segment 보유 -> 7일 경과 후 적용
- HQ CSV 매칭 성공 -> 세그먼트 갱신
- HQ CSV 미매칭 -> 미매칭 로그 저장
- 사용자 Self-Link -> 세그먼트 즉시 적용

## 14. 운영 체크리스트
- 신규 유저 7일 보호 적용 여부 확인
- pending_segment 처리 결과 확인
- HQ 잠재유저 연결율 확인
- 세그먼트 키 위반 여부 점검

## 15. 세그먼트 영향 도메인
- 금고 출금 조건
- HQ 통계
- 이벤트 타겟팅
- 리텐션 개입 대상

## 16. 참고 문서
- [세그먼트 감사](아카이브/20260204_segment_mapping_audit.md)
- [HQ 마진 세그먼트 검증](아카이브/20260204_hq_margin_segment_verification.md)
- [잠재유저 매칭](아카이브/20260202_prospect_linking_implementation.md)
- [신규 유저 7일 정책](변경로그/20260202_segment_new_user_window_rule.md)

## 17. 변경 이력
- v1.0 (2026-02-07): 아카이브 통합 SoT 5문서 중 4권으로 작성
