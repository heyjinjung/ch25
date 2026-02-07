문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 Shop/Exchange 통합 SoT 02 - 상품 UI Config

## 1. 목적
- `v2_shop_products` UI Config의 구조와 검증 규칙을 표준화한다.
- 공백 리스크를 최소화한다.
- CostType 확장 정책을 반영한다.

## 2. 범위
- 상점 상품 목록 조회
- 운영 설정(JSON) 구조
- 필수/선택 필드
- 검증 규칙

## 3. SoT 우선순위
- 최신 날짜 문서 우선
- 금고 SoT: `user.vault_locked_balance`
- CostType 확장(2026-02-05) 적용

## 4. 저장 위치
- UI Config 저장소(`ui_configs`)
- 키: `v2_shop_products`
- 값: JSON 배열

## 5. 상점 공백 리스크
- 키가 없거나 비어있으면 빈 배열 반환
- 운영 알림/기본 Config 필요

## 6. 스키마 개요
- `v2_shop_products`는 배열이다.
- 각 항목은 상품 객체다.

## 7. 필수 필드
- product_id: string
- title: string
- reward_type: string
- reward_amount: int
- cost_type: string
- cost_amount: int
- visible: bool
- sort_order: int

## 8. 선택 필드
- description: string
- image_url: string
- badge: string
- stock_limit: int|null
- purchase_limit_per_user: int|null
- tags: string[]
- starts_at: string|null
- ends_at: string|null

## 9. 필드 상세 설명
### 9.1 product_id
- 고유 식별자
- sku와 동일하게 취급한다.
- 대소문자 구분을 유지한다.

### 9.2 title
- 사용자 노출 명칭
- 최대 길이는 UI 정책에 따른다.

### 9.3 reward_type
- RewardType 표준 Enum 사용
- 티켓은 `_TICKET` 접미사 준수
- 기프티콘은 `{BRAND}_GIFTICON_{AMOUNT}`

### 9.4 reward_amount
- 정수
- 1 이상

### 9.5 cost_type
- CostType 표준 Enum 사용
- POINT/CC_POINT는 VAULT로 정규화

### 9.6 cost_amount
- 정수
- 1 이상
- 통화 단위는 Vault 포인트 기준

### 9.7 visible
- true: 노출
- false: 응답에서 필터링 가능

### 9.8 sort_order
- 오름차순 정렬
- 중복 가능(운영 합의 필요)

### 9.9 purchase_limit_per_user
- null: 무제한
- 정수: 유저당 제한

### 9.10 stock_limit
- null: 무제한
- 0: 품절 처리

## 10. 비용 타입(CostType) 규칙
- VAULT/POINT/CC_POINT는 Vault로 정규화한다.
- 게임 토큰은 GameWallet에서 차감한다.
- 기프티콘은 결제 수단에서 제외한다.

### 10.1 CostType 목록
- VAULT
- POINT
- CC_POINT
- DIAMOND
- ROULETTE_TICKET
- DICE_TICKET
- LOTTERY_TICKET
- GOLD_KEY_TICKET
- DIAMOND_TICKET
- TRIAL_TICKET
- GOLD_KEY_FRAGMENT
- DIAMOND_FRAGMENT
- PUZZLE_C1
- PUZZLE_C2
- PUZZLE_J
- PUZZLE_M

## 11. 보상 타입(RewardType) 규칙
- 보상 타입은 표준 Enum을 사용한다.
- 티켓은 `_TICKET` 접미사 규칙 준수.
- 기프티콘은 `{BRAND}_GIFTICON_{AMOUNT}` 규칙 준수.

### 11.1 기프티콘 허용 브랜드
- CHICKEN
- STARBUCKS
- PIZZA
- GOOGLE

### 11.2 금액 표기
- KRW 정수
- 100원 단위 절사 권장

## 12. 정규화 규칙
- cost_type: POINT/CC_POINT -> VAULT
- reward_type: legacy `_COIN`, `_TOKEN` -> `_TICKET`
- product_id: 고유 키 유지

## 13. 검증 규칙
- reward_amount >= 1
- cost_amount >= 1
- sort_order는 정수
- starts_at < ends_at (둘 다 있을 때)
- visible=false는 응답 필터 가능

### 13.1 검증 의사코드
```text
if not products:
  return []

for p in products:
  assert p.product_id
  assert p.title
  assert p.reward_type
  assert p.reward_amount >= 1
  assert p.cost_amount >= 1
```

## 14. 샘플 JSON (표준)
```json
[
  {
    "product_id": "PROD_TICKET_COIN_1",
    "title": "룰렛 티켓 1장",
    "description": "오늘 바로 사용 가능",
    "reward_type": "ROULETTE_TICKET",
    "reward_amount": 1,
    "cost_type": "VAULT",
    "cost_amount": 1000,
    "visible": true,
    "sort_order": 10,
    "tags": ["ticket", "roulette"],
    "badge": "HOT"
  }
]
```

## 15. 샘플 JSON (DIAMOND 결제)
```json
[
  {
    "product_id": "PROD_GOLD_KEY_1",
    "title": "골드키 교환권",
    "reward_type": "GOLD_KEY_TICKET",
    "reward_amount": 1,
    "cost_type": "DIAMOND",
    "cost_amount": 30,
    "visible": true,
    "sort_order": 10
  }
]
```

## 16. 샘플 JSON (토큰 결제)
```json
[
  {
    "product_id": "PROD_PUZZLE_C1",
    "title": "퍼즐 조각 C1",
    "reward_type": "PUZZLE_C1",
    "reward_amount": 1,
    "cost_type": "ROULETTE_TICKET",
    "cost_amount": 5,
    "visible": true,
    "sort_order": 30
  }
]
```

## 17. 운영 절차(등록)
1) Admin UI에서 JSON 입력
2) 유효성 검증
3) 저장 후 GET 호출 확인
4) 구매 테스트로 정상 동작 확인

## 18. 운영 절차(수정)
1) 변경 전 JSON 백업
2) 변경 사항 적용
3) 상품 목록 확인
4) 알림 발송(필요 시)

## 19. 운영 절차(장애)
1) 공백 발생 여부 확인
2) JSON 파싱 실패 확인
3) 기본 Config 주입
4) 로그/알림 기록

## 20. 운영 체크리스트
- [ ] 키 존재 여부 확인
- [ ] JSON 파싱 성공 확인
- [ ] cost_type 정규화 확인
- [ ] reward_type 표준 확인
- [ ] visible 필터 동작 확인

## 21. 실패 시나리오
- 키 없음: 빈 배열 반환
- JSON 오류: 빈 배열 반환
- 금액 0: 필터 또는 오류
- 잘못된 reward_type: 구매 실패 가능

## 22. 장애 대응
- 공백 발생 시 기본 Config 주입
- Sentry/Slack 알림 등록
- 운영자용 점검 체크리스트 배포

## 23. API 연동
- GET /api/v2/shop/products
- POST /api/v2/shop/purchase

## 24. 관련 테이블
- ui_configs
- v2_shop_order

## 25. 보안/권한
- 운영자만 수정 가능
- 변경 시 로그 기록

## 26. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 02 작성
