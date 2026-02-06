문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

## 1. 목적 (Purpose)
V2 경제체계에서 “자산이 어디에 저장되는가(SoT 저장소)”를 단일 기준으로 확정한다.
본 문서는 RewardType/TokenType/ItemType 문서들이 서로 다른 레이어(입력 계약 vs DB 저장) 개념을 혼용하여 발생하는 드리프트를 방지한다.

## 2. 범위 (Scope)
- 자산 분류(Cash/Token/Item)
- 각 분류의 DB SoT(테이블/필드)
- “가상 토큰(VAULT)”의 의미

## 3. 용어 정의 (Definitions)
- Cash: 현금성 자산. 금고에만 존재.
- Token: 게임 내 지갑 토큰(대체 가능, Fungible). UserGameWallet에 존재.
- Item: 인벤토리 아이템(보관/소비/지급대기 포함). UserInventoryItem에 존재.
- 입력 RewardType: 게임/미션/레벨 설정에서 “무엇을 주는가”를 표현하는 상위 타입(문자열).
- 저장 TokenType/ItemType: 실제 DB에 저장되는 구체 타입(지갑 토큰 Enum 또는 인벤토리 문자열).

## 4. SoT: 자산 분류 및 저장소
| 분류 | SoT 저장소 | DB Table.Field | 비고 |
| :--- | :--- | :--- | :--- |
| Cash | Vault | user.vault_locked_balance | 금고포인트(포인트/현금성) 단일 SoT |
| Token | GameWallet | user_game_wallet(token_type,balance) | token_type은 GameTokenType(Enum) |
| Item | Inventory | user_inventory_item(item_type,quantity) | item_type은 문자열(규칙 기반) |

## 5. VAULT(가상 토큰) 규칙
- VAULT는 “지갑 토큰”이 아니라, 상점/설정에서 금고포인트를 지칭하기 위한 가상 타입이다.
- VAULT의 실제 SoT는 언제나 user.vault_locked_balance이다.

## 6. 핵심 결론(드리프트 방지)
1) RewardType은 “입력 계약”이다. 저장소/DB에 1:1로 그대로 저장되는 값이 아니다.
2) 실제 DB 저장은 Token은 GameTokenType, Item은 item_type 문자열 규칙으로 정규화한 뒤 기록한다.
3) 문서/코드가 충돌할 때, “저장소 SoT”는 DB 필드 기준(표 4)으로 고정한다.

## 7. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 최초 정본 생성(자산 분류/저장소 단일화)
