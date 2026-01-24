# 🛒 개발 로그: 상점 구매 즉시지급(키/티켓) + 기프티콘 지급대기 유지

**작성일**: 2026-01-06  

---

## 1. 개요
기존 “다이아 → 교환권 → 사용” 2단계 흐름 중, **키/티켓류는 상점 구매 시 자동으로 교환권을 즉시 소비(auto-fulfill)** 하여 지갑에 바로 반영되도록 정책을 단순화했습니다.

- 즉시지급 대상: `GOLD_KEY`, `DIAMOND_KEY`, `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`
- 유지 대상: 기프티콘류(`BAEMIN_GIFTICON_*`)는 **인벤토리에 지급대기 아이템으로 남겨** 운영자가 수동 발송/관리할 수 있도록 유지

---

## 2. 변경 사항

### 2.1 백엔드 (구매 즉시지급)
- `POST /api/shop/purchase`
  - 구매 트랜잭션 내에서 `VOUCHER_*` 적립 후 즉시 `use_voucher`를 호출하여 지갑으로 전환
  - 응답에 `reward_token`, `reward_amount`, `auto_fulfilled`를 포함하여 클라이언트가 “즉시지급”을 표기할 수 있게 함

- 복권 티켓 상점 상품 추가
  - `PROD_TICKET_LOTTERY_1` (DIAMOND 10 → `LOTTERY_TICKET` 1 즉시지급)

### 2.2 프론트 (표시/안내)
- 상점 구매 성공 토스트를 `reward_token/reward_amount` 기반으로 표기(없으면 기존 `granted` fallback)

### 2.3 운영 (기프티콘)
- 기프티콘은 기존대로 인벤토리 아이템(`BAEMIN_GIFTICON_5000/10000/20000`)로 적립되어 지급대기 상태 유지
- 어드민 인벤토리 API로 조회/조정 가능

### 2.4 운영 (외부플랫폼/지급대기)
- 컴포즈 아아 기프티콘: `COMPOSE_AMERICANO_GIFTICON_3000` (지급대기)
- 씨씨코인: 사용자 지갑 지급 대신 `CC_COIN_GIFTICON`(= “씨씨코인깁콘”) 지급대기로 적립 후 운영자가 관리자 화면에서만 완료 처리

### 2.5 씨씨포인트 (금고 즉시 적립)
- `CC_POINT`는 `vault_locked_balance`로 즉시 적립되도록 처리(게임 보상 200원과 동일한 Vault(locked) 구조)

---

## 3. 검증 체크리스트
- 키/티켓 상품 구매 후 교환권이 남지 않고 지갑 수량이 즉시 증가
- 동일 `Idempotency-Key` 재요청 시 중복 지급/차감 없음
- 레거시 교환권은 `POST /api/inventory/use`로 계속 사용 가능
- 기프티콘은 인벤토리에 남고(지급대기), 사용 불가
