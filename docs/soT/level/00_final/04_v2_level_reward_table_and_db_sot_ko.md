문서 타입: SoT (최종)
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/기획/운영/FE
상태: SoT

## 1. 목적 (Purpose)
V2 레벨 1~20의 **필요 XP/보상 정의/DB 저장 규격/코드 정규화 규칙**을 최종 확정한다.

## 2. 범위 (Scope)
- 레벨 1~20 필요 XP
- 레벨별 보상(아이템 코드/수량/페이로드)
- `v2_level_reward_table` 저장 스키마 해석 및 정규화(서비스 deliver 타입 변환)

## 3. 레벨 보상표(SoT) 원본 근거
- 원본 테이블 덤프(2026-01-26): `season_pass_level` 기준
- SoT 문서화(한글 표기): `v2_level_reward_table_sot_ko.md`

## 4. 레벨 1~20 보상표 (최종)
표의 `reward_type`은 DB 저장 시 사용되는 “원천 코드”를 의미하며, 서비스에서 deliver 타입으로 정규화될 수 있다.

| level | required_xp | reward_type (source) | reward_amount | 비고 |
|---:|---:|---|---:|---|
| 1 | 0 | TICKET_ROULETTE | 1 | |
| 2 | 20 | TICKET_DICE | 1 | |
| 3 | 50 | TICKET_ROULETTE | 1 | |
| 4 | 60 | TICKET_LOTTERY | 1 | |
| 5 | 100 | TICKET_DICE | 1 | |
| 6 | 120 | GIFTICON_BAEMIN | 5000 | 배민 5,000원권 |
| 7 | 160 | TICKET_DICE | 2 | |
| 8 | 200 | TICKET_DICE | 3 | |
| 9 | 300 | TICKET_LOTTERY | 1 | |
| 10 | 500 | GOLD_KEY | 1 | |
| 11 | 700 | TICKET_ROULETTE | 3 | |
| 12 | 1000 | GOLD_KEY | 1 | |
| 13 | 1200 | TICKET_DICE | 4 | |
| 14 | 1400 | TICKET_ROULETTE | 4 | |
| 15 | 1800 | TICKET_LOTTERY | 3 | |
| 16 | 2200 | TICKET_LOTTERY | 5 | |
| 17 | 3000 | GOLD_KEY | 3 | |
| 18 | 4000 | DIAMOND_KEY | 1 | |
| 19 | 5000 | DIAMOND_KEY | 2 | |
| 20 | 6000 | DIAMOND_KEY | 5 | |

## 5. DB 저장 규격
### 5.1 테이블
- `v2_level_reward_table`

### 5.2 컬럼 해석
- `level` (PK)
- `required_xp` (NOT NULL)
- `reward_type` (NOT NULL)
  - 본 문서의 `reward_type (source)`를 저장한다.
- `reward_amount` (NOT NULL)
  - 기프티콘처럼 금액 의미를 가질 수 있다.
- `reward_payload` (NULL)
  - 기프티콘/번들 등 확장 메타데이터 저장용

권장 payload 예시:
- `GIFTICON_BAEMIN`:
  - `{ "amount": 5000, "brand": "BAEMIN" }`

## 6. 서비스 정규화(Reward Deliver Type)
레벨 보상 지급 시 서비스는 `reward_type`을 내부 전달 타입으로 정규화할 수 있다.
예:
- `TICKET_ROULETTE` → `ROULETTE_TICKET`
- `TICKET_DICE` → `DICE_TICKET`
- `TICKET_LOTTERY` → `LOTTERY_TICKET`
- `GOLD_KEY` → `GOLD_KEY_TICKET`
- `DIAMOND_KEY` → `DIAMOND_TICKET`

정규화 매핑은 서비스의 type map을 기준으로 한다.

## 7. 운영/검증 (QA)
- [ ] DB `v2_level_reward_table` 행이 1~20을 모두 포함하는지
- [ ] required_xp가 본 문서 표와 일치하는지
- [ ] reward 지급 멱등성이 `user_level_reward_log`로 보장되는지

## 8. 관련 문서 (Sources)
- ../v2_level_reward_table_sot_ko.md
- ../level_reward_table_20260126.md
- ../v2_db_level_reward_table_ko.md

## 9. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 보상표(원본 코드/DB 스키마/정규화) 최종 통합
