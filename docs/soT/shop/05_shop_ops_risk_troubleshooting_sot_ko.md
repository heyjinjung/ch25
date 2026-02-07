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

## 3. Empty Shop Risk
- 증상: 상품 목록이 비어 있음
- 원인: UI Config 누락/빈 배열
- 대응: 기본 Config 주입/알림

## 4. benefits_suspended 미적용
- 증상: 제재 유저 구매 가능
- 원인: 서비스 레이어 체크 누락
- 대응: purchase 진입 차단

## 5. CostType 불일치
- 증상: INVALID_COST_TYPE 오류
- 원인: POINT/CC_POINT 미정규화
- 대응: 정규화 로직 적용

## 6. UI 캐시 미갱신
- 증상: 구매 후 금고 잔액 미반영
- 원인: react-query 키 불일치
- 대응: v2-vault-status 무효화

## 7. FK 누락
- 증상: 로그 고아 데이터
- 원인: v2_shop_order FK 미설정
- 대응: FK 추가 권장

## 8. 운영 체크리스트
- [ ] UI Config 유효성
- [ ] cost_type 정규화
- [ ] benefits_suspended 차단
- [ ] 구매 로그 적재
- [ ] 금고 잔액 동기화

## 9. 증거 기반 RCA
- 로그와 DB 제약조건으로 증명
- 추측 금지

## 10. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 05 작성
