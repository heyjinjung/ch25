# 시즌패스 레벨별 보상 테이블 (2026-01-26 기준)

| 레벨 | 필요 XP | 보상 타입         | 보상 수량 |
|------|---------|------------------|-----------|
| 1    | 0       | TICKET_ROULETTE  | 1         |
| 2    | 20      | TICKET_DICE      | 1         |
| 3    | 50      | TICKET_ROULETTE  | 1         |
| 4    | 60      | TICKET_LOTTERY   | 1         |
| 5    | 100     | TICKET_DICE      | 1         |
| 6    | 120     | GIFTICON_BAEMIN  | 5000      |
| 7    | 160     | TICKET_DICE      | 2         |
| 8    | 200     | TICKET_DICE      | 3         |
| 9    | 300     | TICKET_LOTTERY   | 1         |
| 10   | 500     | GOLD_KEY         | 1         |
| 11   | 700     | TICKET_ROULETTE  | 3         |
| 12   | 1000    | GOLD_KEY         | 1         |
| 13   | 1200    | TICKET_DICE      | 4         |
| 14   | 1400    | TICKET_ROULETTE  | 4         |
| 15   | 1800    | TICKET_LOTTERY   | 3         |
| 16   | 2200    | TICKET_LOTTERY   | 5         |
| 17   | 3000    | GOLD_KEY         | 3         |
| 18   | 4000    | DIAMOND_KEY      | 1         |
| 19   | 5000    | DIAMOND_KEY      | 2         |
| 20   | 6000    | DIAMOND_KEY      | 5         |

- 데이터 출처: backup_20260110.sql의 season_pass_level 테이블 덤프
- 컬럼: (id, season_id, level, required_xp, reward_type, reward_amount, auto_claim, created_at, updated_at)
- 실제 운영 데이터와 정책이 다를 경우, 이 테이블을 기준으로 동기화 필요
