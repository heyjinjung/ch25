문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
문서 티켓 Enum과 코드 Enum의 불일치를 해소하고 단일 기준을 확정한다.

## 2. 범위 (Scope)
- 문서 표준 Enum ↔ 코드 Enum 매핑
- 레거시 Enum 명칭 처리 규칙

## 3. 용어 정의 (Definitions)
- 문서 Enum: V2 문서에서 사용하는 표준 티켓 Enum
- 코드 Enum: 백엔드 코드에 정의된 GameTokenType

## 4. SoT: 문서 Enum ↔ 코드 Enum 매핑표
| 문서 Enum (SoT) | 코드 Enum (GameTokenType) | 상태 | 비고 |
| :--- | :--- | :--- | :--- |
| ROULETTE_TICKET | ROULETTE_COIN | 레거시 | 문서 표준으로 단일화 |
| DICE_TICKET | DICE_TOKEN | 레거시 | 문서 표준으로 단일화 |
| GOLD_KEY_TICKET | GOLD_KEY | 레거시 | 문서 표준으로 단일화 |
| DIAMOND_TICKET | DIAMOND_KEY | 레거시 | 문서 표준으로 단일화 |
| LOTTERY_TICKET | LOTTERY_TICKET | 현행 | 동일 |

## 5. 표준화 규칙
- 신규 문서/기획/스펙에서는 문서 Enum(ROULETTE_TICKET 등)만 사용한다.
- 코드 레거시 Enum은 유지하되, 문서/기획 표기에서 사용하지 않는다.
- 로그/리포트/대시보드에 문서 Enum을 우선 노출한다.

## 6. 운영/검증 (QA)
- [ ] 문서/기획 스펙에서 레거시 Enum 사용 금지
- [ ] 코드 상 매핑 테이블과 문서 Enum 일치 확인

## 7. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
