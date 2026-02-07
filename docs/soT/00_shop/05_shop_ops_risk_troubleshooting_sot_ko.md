문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 Shop/Exchange 통합 SoT 05 - 운영/리스크/트러블슈팅

## 1. 목적
- 상점/교환소 운영 리스크와 대응 절차를 정리한다.
- 트러블슈팅 기준을 통합한다.

## 2. 주요 리스크
- Empty Shop Risk
- benefits_suspended 미적용
- CostType 불일치
- UI 캐시 미갱신
- FK 누락

## 2.1 리스크 우선순위
- P0: benefits_suspended 미적용
- P0: 금고 SoT 불일치
- P1: Empty Shop Risk
- P1: CostType 불일치
- P2: UI 캐시 미갱신
- P2: FK 누락

## 2.2 알림 기준
- P0 발생 시 즉시 알림
- P1은 30분 이내 확인
- P2는 일일 점검

## 3. Empty Shop Risk
- 증상: 상품 목록이 비어 있음
- 원인: UI Config 누락/빈 배열
- 대응: 기본 Config 주입/알림

### 3.1 점검 절차
1) ui_configs 키 존재 확인
2) value_json 파싱 확인
3) visible 필터링 확인
4) 기본 Config 적용 여부 확인

### 3.2 예방 수칙
- 기본 상품 1종 이상 유지
- 운영 변경 전 백업
- 변경 후 즉시 호출 검증

## 4. benefits_suspended 미적용
- 증상: 제재 유저 구매 가능
- 원인: 서비스 레이어 체크 누락
- 대응: purchase 진입 차단

### 4.1 확인 포인트
- HTTP 403 반환 여부
- benefits_suspended 계산 경로 확인
- 금고 정책 SoT와 일치 확인

### 4.2 재현 절차
1) 7일 미입금 유저 준비
2) 구매 요청 수행
3) 403 반환 확인

## 5. CostType 불일치
- 증상: INVALID_COST_TYPE 오류
- 원인: POINT/CC_POINT 미정규화
- 대응: 정규화 로직 적용

### 5.1 정규화 체크
- 응답 JSON cost_type 확인
- purchase 입력 cost_type 확인
- VAULT alias 처리 여부 확인

### 5.2 예방 수칙
- UI Config 저장 시 정규화
- 응답 시 정규화

## 6. UI 캐시 미갱신
- 증상: 구매 후 금고 잔액 미반영
- 원인: react-query 키 불일치
- 대응: v2-vault-status 무효화

### 6.1 확인 포인트
- 구매 성공 후 쿼리 재호출
- 헤더/금고 화면 동기화

### 6.2 대응
- react-query 키 정합성 확인
- v2-vault-status 무효화

## 7. FK 누락
- 증상: 로그 고아 데이터
- 원인: v2_shop_order FK 미설정
- 대응: FK 추가 권장

### 7.1 권장 제약조건
- v2_shop_order.user_id -> v2_user.id
- ON DELETE SET NULL

### 7.2 운영 영향
- 삭제 유저 로그 고아 데이터 발생
- 보고/집계 오류 가능

## 8. 운영 체크리스트
- [ ] UI Config 유효성
- [ ] cost_type 정규화
- [ ] benefits_suspended 차단
- [ ] 구매 로그 적재
- [ ] 금고 잔액 동기화

## 8.1 일일 점검
- 상품 목록 0건 여부
- 구매 실패율 급증 여부
- INVALID_COST_TYPE 발생 여부

## 8.2 주간 점검
- v2_shop_order 로그 누락 여부
- 구매 후 잔액/지급 정합성

## 9. 장애 보고 포맷
| 항목 | 내용 |
| --- | --- |
| 대상 기능 | 상점 구매/상품 조회 |
| HTTP Status | 400/403/500 |
| 영향 범위 | 특정 유저/전체 |
| 재현 빈도 | 항상/간헐 |

## 10. 증거 기반 RCA
- 로그와 DB 제약조건으로 증명
- 추측 금지

### 10.1 로그 확인
- 백엔드 에러 로그
- DB 제약조건 위반
- 구매 로그 존재 여부

### 10.2 DB 확인
- v2_shop_order 최근 기록
- user.vault_locked_balance 값
- user_game_wallet 잔액

### 10.3 쿼리 예시
```sql
SELECT * FROM v2_shop_order ORDER BY id DESC LIMIT 5;
SELECT vault_locked_balance FROM user WHERE id = ?;
```

## 11. 에러 코드 매핑
- INVALID_COST_TYPE: cost_type 정규화 실패
- INSUFFICIENT_BALANCE: 잔액 부족
- BENEFITS_SUSPENDED: 제재 유저 차단
- MISSING_SKU: sku 누락

## 12. 증거 수집 체크리스트
- 요청/응답 스니펫
- 최근 로그 200라인
- DB 조회 결과
- UI 재현 스크린샷
- 구매 상품 스냅샷 JSON

## 12.1 수집 우선순위
- 1순위: 에러 로그/스택트레이스
- 2순위: DB 제약조건
- 3순위: UI 재현 캡처

## 13. 운영 테스트 기준
- 구매 성공 후 잔액 반영
- 공백 Config 시 알림
- CostType 확장 결제
- benefits_suspended 차단

## 13.1 테스트 케이스 상세
- VAULT 결제 성공
- DIAMOND 결제 성공
- ROULETTE_TICKET 결제 성공
- INVALID_COST_TYPE 실패
- BENEFITS_SUSPENDED 차단

## 14. 모니터링 지표
- 구매 성공률
- 구매 실패율
- 결제 타입 분포
- 혜택 중단 차단율

## 15. 운영 런북 요약
1) 장애 인지
2) 영향 범위 확인
3) 로그/DB 증거 확보
4) 임시 완화 적용
5) 원인 분석 및 문서화

## 15.1 임시 완화 예시
- 기본 Config 주입
- 구매 기능 임시 비활성화
- 알림 채널 공지

## 16. 재현 템플릿
- 대상 기능: 상점 구매
- HTTP Status: 400/403/500
- 영향 범위: 특정/전체
- 재현 빈도: 항상/간헐

## 16.1 재현 단계 예시
1) 상품 조회
2) 구매 요청 전송
3) 응답 코드 확인
4) 잔액/지급 확인

## 17. 공통 오해
- 금고 잔액은 `vault_locked_balance`만 사용
- available/legacy 합산 금지
- 기프티콘은 결제 수단 아님

## 17.1 공통 실수
- POINT/CC_POINT 정규화 누락
- UI Config 변경 후 미검증
- purchase_limit_per_user 미적용

## 18. 운영 알림 예시
- "Shop Config Empty" 알림
- "Benefits Suspended Block" 알림
- "Invalid CostType" 알림

## 18.1 알림 후속 조치
- 운영자 확인 기록
- 원인 분류
- 재발 방지 항목 업데이트

## 19. 운영 기록 보관
- 장애 기록 문서화
- 변경 이력 반영

## 19.1 보관 위치
- docs/SOT/shop/변경로그

## 20. 관련 문서
- 06.shop.md
- 06.shop_patch_guide.md
- 20260127_shop_purchase_vault_balance_ui_refresh_fix.md
- 20260127_shop_cost_type_fix.md
- 20260205_shop_cost_type_expansion.md
- v2_sot_shop_ko.md

## 21. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 05 작성
