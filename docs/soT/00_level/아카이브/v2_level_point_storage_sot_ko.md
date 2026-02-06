문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 레벨포인트(level_point)와 DB 저장 필드의 단일 매핑을 확정한다.

## 2. 범위 (Scope)
- 레벨포인트 논리명 ↔ DB 필드 매핑
- 적립/로그 스키마 기준

## 3. 용어 정의 (Definitions)
- 레벨포인트: GAME_XP 보상 타입으로 적립되는 성장 포인트

## 4. SoT: 레벨포인트 저장 매핑
| 논리명(문서) | DB 테이블 | DB 필드 | 설명 |
| :--- | :--- | :--- | :--- |
| level_point | user_level_progress | xp | 현재 보유 레벨포인트 |
| level_point_delta | user_xp_event_log | delta | 레벨포인트 변경 로그 |
| level_point_reward_type | user_level_reward_log | reward_type | 레벨 보상 타입 |

## 5. 표준화 규칙
- 문서/기획의 level_point 표기는 DB의 user_level_progress.xp로 저장한다.
- 레벨포인트 적립은 GAME_XP reward_type으로만 발생한다.
- 레벨 보상 지급 이력은 user_level_reward_log로 기록한다.

## 6. 운영/검증 (QA)
- [ ] level_point가 user_level_progress.xp에 저장되는지 확인
- [ ] GAME_XP 외 적립 경로 금지 확인

## 7. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
