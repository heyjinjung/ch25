[작성일: 2026-02-07]
[상태: SoT]
[도메인: SHOP]

# 상점 GOLDEN_TICKET 보상 정규화

## 개요
상점 상품 설정에 레거시 보상 타입(`GOLDEN_TICKET`)이 존재할 경우,
지급 경로가 인벤토리로 라우팅되어 룰렛 티켓 차감이 실패하는 문제를 방지한다.

## 변경 내용
- 상점 응답/구매 경로에서 `GOLDEN_TICKET`을 `GOLD_KEY_TICKET`으로 정규화.
- 레거시 값은 API 계층에서 표준 Enum으로 변환 후 처리.

## 수정 파일
- app/v2/api/routes.py

## 검증 방법
1) `v2_shop_products`에 `reward_type=GOLDEN_TICKET` 설정
2) 구매 후 `user_game_wallet.GOLD_KEY_TICKET` 증가 확인
3) `/api/v2/roulette/play` 정상 차감 확인

## 변경 이력
- v1.0 (2026-02-07): GOLDEN_TICKET 정규화 추가
