# 퍼즐 컬렉션 → 골드키 교환 SoT

**문서 타입**: SoT (Source of Truth)  
**버전**: v1.0  
**작성일**: 2026-01-31  
**작성자**: GitHub Copilot  
**도메인**: Game / Lottery / Exchange

---

## 1. 개요 (Overview)

복권(Lottery) 게임에서 획득한 퍼즐 조각(C1, C2, J, M)을 모두 모으면 **황금열쇠(GOLD_KEY_TICKET)** 1개로 교환할 수 있다.

### 1.1 비즈니스 목표
- 복권 게임의 재미 요소 강화 (컬렉션 완성 보상)
- 골드룰렛 진입 기회 제공 (황금열쇠 = 골드룰렛 티켓)

### 1.2 관련 문서
- [복권 퍼즐조각 미지급 버그 트러블슈팅](../../../90_troubleshooting/20260131_복권_퍼즐조각_미지급_버그.md)
- [게임 엔진 SoT](../../02_game/v2_game_engine_sot_ko.md)
- [게임 API 계약](../../03_api/v2_game_api_contract_ko.md)

---

## 2. 퍼즐 토큰 정의 (Token Types)

| 토큰 타입 | 설명 | 저장 위치 |
|-----------|------|-----------|
| `PUZZLE_C1` | 퍼즐 C 첫번째 조각 | `user_game_wallet` |
| `PUZZLE_C2` | 퍼즐 C 두번째 조각 | `user_game_wallet` |
| `PUZZLE_J` | 퍼즐 J 조각 | `user_game_wallet` |
| `PUZZLE_M` | 퍼즐 M 조각 | `user_game_wallet` |
| `PUZZLE_C` | **DEPRECATED** - 사용 금지 | 레거시 호환용 |

### 2.1 Enum 정의 (GameTokenType)
```python
# app/models/game_wallet.py
class GameTokenType(str, Enum):
    # ==== Puzzle Pieces (Lottery Collection) ====
    # NOTE: PUZZLE_C is DEPRECATED. Use PUZZLE_C1/C2 instead.
    PUZZLE_C = "PUZZLE_C"    # DEPRECATED - Do not use in new code
    PUZZLE_C1 = "PUZZLE_C1"  # Active: First C piece
    PUZZLE_C2 = "PUZZLE_C2"  # Active: Second C piece
    PUZZLE_J = "PUZZLE_J"    # Active: J piece
    PUZZLE_M = "PUZZLE_M"    # Active: M piece
```

---

## 3. 교환 레시피 (Craft Recipe)

### 3.1 필요 재료
| 토큰 | 수량 |
|------|------|
| PUZZLE_C1 | 1개 |
| PUZZLE_C2 | 1개 |
| PUZZLE_J | 1개 |
| PUZZLE_M | 1개 |

### 3.2 보상
| 토큰 | 수량 |
|------|------|
| GOLD_KEY_TICKET | 1개 |

### 3.3 교환 규칙
- 4개 퍼즐 조각이 모두 1개 이상 있어야 교환 가능
- 교환 시 각 퍼즐 조각 1개씩 소비
- 교환 성공 시 `user_game_wallet_ledger`에 기록

---

## 4. API 명세 (API Specification)

### 4.1 교환 상태 조회
```
GET /api/v2/exchange/craft-status
Authorization: Bearer {token}
```

**Response**:
```json
{
  "can_craft": true,
  "collection": {
    "C1": 1,
    "C2": 1,
    "J": 1,
    "M": 0
  },
  "required": {
    "C1": 1,
    "C2": 1,
    "J": 1,
    "M": 1
  }
}
```

### 4.2 퍼즐 교환 실행
```
POST /api/v2/exchange/craft-puzzle
Authorization: Bearer {token}
```

**Success Response (200)**:
```json
{
  "result": "OK",
  "reward_token": "GOLD_KEY_TICKET",
  "reward_amount": 1,
  "consumed_tokens": {
    "PUZZLE_C1": 1,
    "PUZZLE_C2": 1,
    "PUZZLE_J": 1,
    "PUZZLE_M": 1
  },
  "message": "퍼즐 컬렉션 완성! 황금열쇠 1개 획득"
}
```

**Error Response (400)**:
```json
{
  "detail": "Insufficient PUZZLE_J: need 1, have 0"
}
```

---

## 5. 코드 위치 (Code Location)

### 5.1 백엔드
| 파일 | 설명 |
|------|------|
| `app/v2/services/v2_exchange_service.py` | 교환 서비스 로직 |
| `app/v2/api/exchange_routes.py` | API 라우터 |
| `app/v2/api/routes.py` | 라우터 등록 |

### 5.2 프론트엔드
| 파일 | 설명 |
|------|------|
| `src/v2/api/gameApi.ts` | API 함수 정의 |
| `src/v2/api/v2GameAdapter.ts` | API 어댑터 |
| `src/v2/pages/game/LotteryPage.tsx` | 복권 페이지 (onCraft 호출) |
| `src/v2/components/lottery/LotteryCollectionModal.tsx` | 퍼즐 모음 모달 UI |

---

## 6. 데이터 흐름 (Data Flow)

```
[UI] 퍼즐 모음 버튼 클릭
        ↓
[LotteryCollectionModal] canCraft 확인 (C1≥1, C2≥1, J≥1, M≥1)
        ↓
[UI] 황금열쇠 교환 버튼 클릭
        ↓
[API] POST /api/v2/exchange/craft-puzzle
        ↓
[V2ExchangeService.craft_puzzle_to_gold_key]
        ↓
    1. 잔액 사전 확인 (4종 퍼즐 각 1개 이상)
    2. V2InventoryService.consume_wallet_tokens (4종 각 1개 소비)
    3. V2InventoryService.grant_wallet_tokens (GOLD_KEY_TICKET 1개 지급)
    4. db.commit()
        ↓
[UI] 성공 → queryClient.invalidateQueries (상태 갱신)
```

---

## 7. 테스트 케이스 (Test Cases)

### 7.1 정상 케이스
- [x] C1=1, C2=1, J=1, M=1 → 교환 성공 → GOLD_KEY_TICKET +1
- [x] C1=2, C2=1, J=1, M=1 → 교환 성공 → C1 잔액 1 남음

### 7.2 에러 케이스
- [x] C1=0, C2=1, J=1, M=1 → 400 에러 (Insufficient PUZZLE_C1)
- [x] C1=1, C2=0, J=1, M=1 → 400 에러 (Insufficient PUZZLE_C2)
- [x] 미인증 요청 → 401 에러

---

## 8. 변경 이력 (Changelog)

| 일시 | 버전 | 작업자 | 내용 |
|------|------|--------|------|
| 2026-01-31 | v1.0 | Copilot | 최초 작성 |
| 2026-01-31 | v1.0 | Copilot | PUZZLE_C 폐기, C1/C2/J/M 정상화 |
