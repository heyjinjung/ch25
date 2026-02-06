문서 타입: SoT
버전: v2.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 1. 목적 (Purpose)
V2 미션 관련 용어와 SoT 기준을 단일 문서로 확정한다.

## 2. 범위 (Scope)
- 미션 정의/보상/진행/승인
- V2 보상 매핑 기준

## 3. 용어 정의 (Definitions)
- 미션: 운영자가 설정하는 목표/보상 정책
- SoT: 지급/진행 상태를 판단하는 기준 테이블/필드

## 4. 미션 용어 표 (SoT)
| 용어(권장) | 코드/키워드 | SoT(테이블.필드) | 정의 | 주의사항 |
| --- | --- | --- | --- | --- |
| 미션 정의 | Mission | mission | 운영자가 생성/편집하는 미션 정책(보상 타입/수량 포함) | 운영 변경은 어드민 미션 관리에서 수행 |
| 미션 보상 타입 | MissionRewardType | mission.reward_type | 미션 전용 보상 타입 enum | 지급 매핑은 V2 보상 매핑 SoT를 따른다 |
| 미션 로직 키 | logic_key | mission.logic_key | 미션을 식별하는 유니크 키 | 이미 수령한 유저(진행/claimed)에 소급 영향 제한 |
| 유저 미션 진행 | Progress | user_mission_progress | 유저별 진행/완료/수령 상태 | is_claimed가 지급 여부 SoT |
| 승인 워크플로우 | Approval | approval_status | 승인 필요 미션의 지급 통제 | 미승인 지급 차단이 기본 |
| 미션 종류 | DAILY | mission.category | 데일리 미션 | 주기: 일 단위 |
| 미션 종류 | WEEKLY | mission.category | 위클리 미션 | 주기: 주 단위 |
| 미션 종류 | NEW_USER | mission.category | 신규전용 미션 | 가입 후 7일간 유효, 4종 Starter 미션 제공 (CC채널가입 폐기) |
| 미션 종류 | SPECIAL_EVENT | mission.category | 특별이벤트 미션 | 이벤트 기간 한정 |

## 5. 미션 카테고리/보상타입 매핑 (Mapping SoT)
각 미션 종류별로 설정 가능한 보상 타입의 제약사항을 정의합니다.

| 미션 종류 (Category) | 허용 보상 타입 (MissionRewardType) | 설명 |
| :--- | :--- | :--- |
| **DAILY** (일일) | `POINT`, `ROULETTE_TICKET`, `DICE_TICKET` | 소액 포인트 및 데일리 티켓 지급. |
| **WEEKLY** (주간) | `DIAMOND`, `GOLD_KEY_TICKET`, `LOTTERY_TICKET` | 희소 재화 및 상위 티켓 지급. |
| **NEW_USER** (신규) | `BUNDLE` (Starter Pack), `GIFTICON_*` | 정착 지원 패키지 또는 첫 구매 기프티콘. |
| **SPECIAL_EVENT** | `ALL` (제약 없음) | 이벤트 성격에 따라 유연하게 적용. |

**참고 문서**:
- [보상 매핑 SoT](../01_core/v2_reward_mapping_sot_ko.md) (지급 경로 상세)

## 6. 운영/검증 (QA)
- [ ] mission.reward_type ↔ V2 보상 매핑 일치 확인
- [ ] is_claimed가 지급 SoT로 유지되는지 확인

## 7. 변경 이력
- v2.0 (2026-01-19, GitHub Copilot): v1 용어를 V2 SoT로 이관
