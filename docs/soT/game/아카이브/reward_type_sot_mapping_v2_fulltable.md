# v2 미션 보상타입 SoT(enum) 및 정책/운영/DB 매핑표 (확장)

| SoT(enum)                | 정책/운영 값 예시      | DB 값 예시         | 비고/설명                                      |
|--------------------------|-----------------------|--------------------|------------------------------------------------|
| NONE                     | 없음/미지급           | NONE               | 보상 없음, 미지급 등                            |
| DIAMOND                  | 다이아                | DIAMOND            | 다이아몬드(게임 내 재화)                        |
| GOLD_KEY                 | 골드키, GOLDKEY       | GOLD_KEY           | 골드키(특정 해금 아이템)                        |
| DIAMOND_KEY              | 다이아키, DIAMONDKEY  | DIAMOND_KEY        | 다이아몬드 키                                   |
| CASH_UNLOCK              | 금고해금, 언락캐시    | CASH_UNLOCK        | 금고 언락, 현금성 해금                          |
| TICKET_BUNDLE            | 티켓묶음, 번들        | TICKET_BUNDLE      | 여러 티켓 일괄 지급                             |
| TICKET_ROULETTE          | 룰렛티켓, 룰렛        | TICKET_ROULETTE    | 룰렛 게임용 티켓                                |
| TICKET_LOTTERY           | 복권티켓, 복권        | TICKET_LOTTERY     | 복권 게임용 티켓                                |
| TICKET_DICE              | 주사위티켓, 주사위    | TICKET_DICE        | 주사위 게임용 티켓                              |
| POINT                    | 포인트, POINT         | POINT              | 일반 포인트(내부 적립금 등)                     |
| GIFTICON_BAEMIN          | 배민기프티콘          | GIFTICON_BAEMIN    | 배달의민족 기프티콘                             |
| GIFTICON_COMPOSE         | 기프티콘묶음          | GIFTICON_COMPOSE   | 여러 기프티콘 조합                              |
| CHICKEN_GIFTICON_5000    | 치킨5000              | CHICKEN_GIFTICON_5000 | 치킨 기프티콘 5천원권                        |
| CHICKEN_GIFTICON_10000   | 치킨10000             | CHICKEN_GIFTICON_10000 | 치킨 기프티콘 1만원권                       |
| STARBUCKS_GIFTICON_2000  | 스타벅스2000          | STARBUCKS_GIFTICON_2000 | 스타벅스 2천원권                          |
| STARBUCKS_GIFTICON_10000 | 스타벅스10000         | STARBUCKS_GIFTICON_10000 | 스타벅스 1만원권                         |
| PIZZA_GIFTICON_5000      | 피자5000              | PIZZA_GIFTICON_5000 | 피자 기프티콘 5천원권                         |
| PIZZA_GIFTICON_10000     | 피자10000             | PIZZA_GIFTICON_10000 | 피자 기프티콘 1만원권                        |
| GOOGLE_GIFTICON_5000     | 구글5000              | GOOGLE_GIFTICON_5000 | 구글 기프트카드 5천원권                       |
| GOOGLE_GIFTICON_10000    | 구글10000             | GOOGLE_GIFTICON_10000 | 구글 기프트카드 1만원권                      |
| CC_POINT                 | CC포인트              | CC_POINT           | (V2) 크레딧/캐시 포인트                        |
| GAME_XP                  | 경험치, XP            | GAME_XP            | (V2) 게임 경험치                                |
| TICKET                   | 티켓                  | TICKET             | (V2) 통합 티켓(추상화)                         |
| BUNDLE                   | 번들                  | BUNDLE             | (V2) 통합 번들(추상화)                         |
