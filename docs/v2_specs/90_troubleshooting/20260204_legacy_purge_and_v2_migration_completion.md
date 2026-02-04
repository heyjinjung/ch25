# [Core] V2 Legacy Purge 및 서비스 마이그레이션 완료 보고서

**작성일:** 2026-02-04
**상태:** 완료 (Implemented)
**대상:** V2 Vault, Event Service, Workers

## 1. 개요
본 문서는 XMAS 1Week Event System의 "Pure V2 Native" 아키텍처 달성을 위한 마지막 단계인 Legacy Code Purge 및 핵심 서비스(Vault, Ch25Event)의 V2 마이그레이션 완료 내용을 기술합니다.
이로써 `app/api`, `app/models`, `app/services`, `app/schemas` 등 레거시 디렉토리에 대한 모든 런타임 의존성이 제거되었으며, 해당 폴더들은 삭제 가능한 상태(Isolated)가 되었습니다.

## 2. 주요 변경 사항

### 2.1 Vault Service V2 완전 전환
- **목표**: `VaultService`의 레거시 브릿지(`vault_legacy_bridge.py`) 의존성 완전 제거
- **구현 내용**:
  - `record_game_play_earn_event` 로직을 `app/v2/services/vault_service.py`로 이식 (기존 브릿지 호출 제거)
  - `handle_deposit_increase_signal` 로직을 V2 서비스로 이식
  - `_streak_vault_bonus_multiplier`, `vault_accrual_multiplier` 등 헬퍼 메서드 V2 네이티브 구현
  - `app/v2/services/vault_legacy_bridge.py` 파일 삭제

### 2.2 Ch25EventService V2 네이티브 구현
- **목표**: 백그라운드 워커(`ch25_event_worker`)가 레거시 서비스(`app.services`)를 참조하는 문제 해결
- **구현 내용**:
  - `app/v2/services/ch25_event_service.py` 신규 생성 (V2 Native)
  - `app/v2/services/event_service.py`에 `log_participation` 메서드 추가 (이벤트 로깅 지원)
  - `app/workers/ch25_event_worker.py`가 V2 모델(`V2User`)과 V2 서비스를 사용하도록 리팩토링
    - `User.external_id` 조회 제거 → `V2User.cc_id` 조회로 변경

### 2.3 Core System 정리
- **목표**: FastAPI 애플리케이션 진입점(`main.py`)에서 레거시 라우터 제거
- **구현 내용**:
  - `app/main.py`에서 `app.api.routes.api_router` (Legacy) import 및 include 제거
  - `LegacyAdminPathAliasMiddleware` 제거
  - `/api/v2` 프리픽스 라우터(`app.v2.api.routes.router`) 단독 운영 체제 확립

## 3. 검증 결과

### 3.1 의존성 스캔
- `app/v2` 디렉토리 내 `from app.models`, `from app.services` 등의 레거시 import 패턴 전수 검사 결과: **Clean (0건)**
- `app/workers` 디렉토리 내 레거시 import 검사 결과: **Clean (0건)** (celery_app.py 포함)

### 3.2 기능 검증
- **Vault Service**: 게임 플레이 시 금고 적립 로직 정상 동작 확인 (테스트 `tests/v2/services/test_vault_service.py` 통과)
- **Workers**: `ch25_event_worker`가 `V2User`를 정상적으로 조회하고 이벤트를 처리함을 확인

## 4. 향후 계획 (Next Steps)
- **Legacy 폴더 삭제**: 현재 격리된 레거시 폴더(`app/api`, `models`, `services`, `schemas`, `utils`)의 물리적 삭제 (최종 승인 대기)
- **테스트 커버리지**: V2 신규 로직에 대한 테스트 케이스 보강

## 5. 관련 파일
- `app/v2/services/vault_service.py`
- `app/v2/services/ch25_event_service.py`
- `app/workers/ch25_event_worker.py`
- `app/main.py`
