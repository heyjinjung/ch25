문서 타입: API SoT Master
버전: v2.0 (Integrated)
작성일: 2026-02-06
최종 검증: 2026-01-30 (배포 전 최종 검증 기준)
상태: Master SoT

# Golden V2 API Master Source of Truth (SoT)

> [!IMPORTANT]
> 본 문서는 Golden V2 프로젝트의 API 설계, 구현, 검증 및 배포에 관한 모든 정보를 하나로 통합한 마스터 SOT 문서입니다. 
> 13개의 하위 문서(계약서, 매핑, 체크리스트, 테스트 로그)를 학습하여 최신 상태를 반영하고 있습니다.

---

## 1. 프로젝트 및 API 개요 (Overview)

Golden V2 API는 기존 v1 시스템의 의존성을 제거하고, `app.v2` 네임스페이스를 기반으로 하는 독립적이고 현대적인 API 아키텍처를 지향합니다.

### 1.1 핵심 원칙
- **V2 Only**: 모든 라우트는 `/api/v2/` 프리픽스를 사용하며 v1 엔드포인트 재사용을 금지합니다.
- **Single Source of Truth**: 모든 변경의 기준은 본 문서와 연동된 OpenAPI 명세입니다.
- **Strict UUID**: 모든 외부 식별자 및 세션 키는 UUID 형식을 준수합니다.
- **09:00 KST Reset**: 모든 비즈니스 로직(출석, 미션, 운영일)은 한국 시간 오전 9시를 기준으로 초기화됩니다.
- **KST API Response**: 모든 datetime 응답은 KST(`Asia/Seoul`)로 변환하여 표기하며, ISO 8601 형식(`+09:00`)을 준수합니다.
- **Slugger (Naming Rule)**: FE 라우팅/백엔드 API/문서 슬러그는 소문자+하이픈(`-`)을 표준으로 하며 동일 의미 혼용을 금지합니다. (기준: `docs/SOT/00_api/v2_slugger_sot_ko.md`)

### 1.2 서비스 범위 (Scope)
- **Auth/User**: Telegram 기반 인증, 분리된 V2 유저 모델, RBAC 보안.
- **Vault & Economy**: Locked Balance 전용 금고 체계, Ledger 기반 거래 기록.
- **Game Engine**: Roulette, Dice, Lottery 엔진 및 보상 로직.
- **Mission & Streak**: 일간/위클리/웰컴 미션 및 연속 출석 시스템.
- **Inventory & Shop**: 아이템 인벤토리 및 V2 상점 시스템.
- **Golden Intervention**: ROI 계산기, Circuit Breaker, Daily Nudge, Rollback.

---

## 2. API 설계 규격 (API Contract SoT)

### 2.1 공통 통신 규칙
- **Base URL**: `/api/v2/`
- **Authentication**: `Authorization: Bearer <token>` (JWT 기반)
- **Datetime Format**: ISO 8601 (KST 변환 처리), 예: `2026-02-06T19:00:00+09:00`
- **Datetime Policy (UTC 저장 / KST 표기)**: DB 저장은 UTC를 유지하고, API 응답은 KST(+09:00)로 변환해 표기합니다. Naive datetime은 UTC로 간주 후 KST 변환합니다. (기준: `docs/SOT/00_api/v2_kst_api_response_policy_v1.0.md`)
- **Error Format**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "사용자 메시지 (Korean)",
      "trace_id": "uuid"
    }
  }
  ```

### 2.2 도메인별 대표 엔드포인트
| 도메인 | 기본 경로 | 설명 |
| :--- | :--- | :--- |
| Auth/User | `/api/v2/auth/*`, `/api/v2/user/*` | 토큰 발급, 내 정보 조회 |
| Game | `/api/v2/dice/*`, `/api/v2/roulette/*` | 게임 플레이 및 결과 |
| Vault | `/api/v2/vault/*` | 금고 잔액 및 출금 요청 |
| Mission | `/api/v2/mission/*`, `/api/v2/streak/*` | 미션 목록 및 보상 클레임 |
| Shop | `/api/v2/shop/*`, `/api/v2/inventory/*` | 상품 구매 및 인벤토리 관리 |
| Admin | `/api/v2/admin/*` | 관리자 대시보드 및 운영 기능 |

---

## 3. 기능 및 흐름 매핑 (v1 → v2 Migration)

| 구분 | V1 상태 | V2 구현/이관 상태 | 검증 근거 |
| :--- | :--- | :--- | :--- |
| **인증** | 레거시 | **V2 Telegram Auth** | `test_telegram_auth.py` PASSED |
| **금고** | Available/Locked | **Locked Only (SoT)** | `vault_service.py` Locked 단일화 |
| **XP/레벨** | Season Pass 병행 | **Unified Level System** | Season Pass 폐기 및 XP 통합 |
| **게임** | v1 Engine | **Standardized V2 Engine** | 원장 분리 검증 완료 |
| **미션** | v1 Mission | **09:00 KST Reset Mission** | 경계 테스트(00:00-09:00) PASSED |

---

## 4. 백엔드 테스트 및 검증 전략 (Testing Flow)

### 4.1 마스터 테스트 순서도 (Summary)
1. **Phase 1 (Env)**: DB Schema 및 Enum 정합성 검증 (SoT vs Code).
2. **Phase 2 (Economy)**: Vault Locked Balance 및 Ledger 무결성 검증.
3. **Phase 3 (Game)**: 확률 엔진 및 보상 지급 로직 검증.
4. **Phase 4 (Admin)**: RBAC 보안 및 운영 도구 기능 검증.
5. **Phase 5 (E2E)**: 가입 → 입금 → 플레이 → 보상 → 출금 통합 시나리오.

### 4.2 주요 검증 결과 (2026-01-24 기준)
- **전체 커버리지**: 목표 80% 이상 달성 (핵심 경제 서비스 포함).
- **인증(Auth)**: 100% 검증 완료.
- **Admin Ops**: 32개 주요 시나리오 PASSED.
- **Economy**: Ticket Zero, Vault Service 상태 전이 검증 완료.

---

## 5. 최종 배포 및 운영 준비 (Deployment Readiness)

최종 배포 전 마스터 체크리스트(`1차_2026_v2_final_deployment_master_checklist_ko.md`)의 핵심 요약입니다.

### 5.1 보안 및 안정성
- [x] **JWT_SECRET**: 강력한 값 설정 필요 (운영 정책 준수).
- [x] **DEV_LOGIN_ENABLED**: 프로덕션 배포 시 반드시 `false` 설정.
- [x] **Circuit Breaker**: Vault(10만), Ticket(30장) 한도 설정 완료.
- [x] **RBAC**: 일반 유저의 Admin API 접근 차단 및 로깅 확인.

### 5.2 인프라 및 DB
- [x] **Alembic Migration**: `upgrade head` 적용 상태 확인.
- [x] **KST 타임존**: DB(UTC 저장) vs API(KST 표기) 분리 적용 및 09시 리셋 동기화.
- [x] **Datetime Mapping**: Pydantic/Serializer 수준에서 모든 datetime 필드 KST 변환 완료.
- [x] **Redis**: Circuit Breaker 및 캐시 연결 정상.

---

## 6. 최종 검증 로그 및 증거 (Final Verification)

| 영역 | 상태 | 최종 업데이트 | 증거 파일 (Artifacts) |
| :--- | :---: | :--- | :--- |
| **Auth** | ✅ PASS | 2026-01-24 | `auth_token_response_v2.json` |
| **Game** | ✅ PASS | 2026-01-24 | `dice_play_response_retry.json` |
| **Vault** | ✅ PASS | 2026-01-24 | `vault_withdraw_response_v2.json` |
| **Mission** | ✅ PASS | 2026-01-24 | `mission_daily_claim_response_v2.json` |
| **Admin** | ✅ PASS | 2026-01-24 | `admin_ops_status_response_v2.json` |

---

## 7. 향후 계획 및 유지보수
- Stub으로 구현된 일부 API(Golden 일부, Team Battle 고도화) 로직 구체화.
- Public 시나리오(사용자 전체 루프)에 대한 자동화 스모크 테스트 보강.
- 지속적인 Sentry 모니터링 및 ROI 기반 마케팅 개입 분석.

---
*본 문서는 Golden V2의 최상위 명세서로서 하위 모든 문서의 내용을 포괄하며, 변경 사항 발생 시 가장 먼저 업데이트되어야 합니다.*
