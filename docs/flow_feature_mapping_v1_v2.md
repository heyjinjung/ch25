# Flow / Feature Mapping: V1 → V2

문서 목적: V1에서 V2로 이전되는 주요 기능/라우트/서비스의 매핑을 한눈에 파악할 수 있도록 정리합니다. 팀 내 전환 작업(리팩토링·검증·배포)을 할 때 참고 SoT로 사용하세요.

## 요약
- 대상: 게임 엔진(Roulette/Dice/Lottery), Vault(금고), Mission/Reward, Admin(설정·강제 지급), Real-time(골든, 퍼블리시/스트림)
- 범위: `app/v2/*`, `src/v2/*` 우선. Legacy(`app/` 직접 참조) 경로는 점검 후 제거.

## 주요 매핑 포인트
- Game Play
  - V1: `/api/game/roulette/play` → V2: `/api/v2/roulette/play`
  - V1: shared reward ledger → V2: `v2_vault_locked_balance`를 단일 SoT로 사용
- Vault / Ledger
  - V1: `user.cash_balance` 일부 사용 경로 존재(레거시) → V2: 모든 신규 지급은 `user.vault_locked_balance`로만 write
- Admin Configs
  - V1 admin 페이지 설정(Shop/Prize) → V2: `app/v2/admin` + `app/core/config` 반영 로직으로 마이그레이션
- Real-time / Golden
  - V1: 채널/스트림 혼용 가능 → V2: Redis 채널(`golden:v2:events:*`) 및 Stream(`stream:raw_logs`) 명확화

## 전환/검증 체크리스트
- 모든 V2 엔드포인트가 `/api/v2/*`로 정리되었는가
- 금고 관련 write가 `vault_locked_balance`로 일원화되었는가
- 골든/퍼블리시 경로: 퍼블리시(JSON 문자열), 스트림(xadd string values) 규칙 준수
- 백엔드 로그, 테스트 스위트(phase2~5)로 증거화 완료

## 변경 이력
- 2026-01-24: 문서 생성/갱신 — Phase 5 E2E 완료 보고 반영 (단, 골든 실시간은 프로덕션 검증 권장)

---
