# V2 Backend Master Test Flowchart & Checklist (V2 전용)

문서 타입: 가이드
버전: v2.0
작성일: 2026-01-24
작성자: Antigravity (User Request Based)
상태: Draft
근거: V2 전용 재검증 요구 (Legacy v1 근거 제거, SoT 일치성 재검증 필요)

## 0. 개요 (Overview)

이 문서는 V2 백엔드(`app/v2/`)와 프론트(`src/v2/`) 전용으로 바닥부터 재검증하는 전체 테스트 순서도입니다. 기존의 v1 기반 검증 결과는 신뢰하지 않고, "현재 코드·SoT"를 기준으로 전수 재검증합니다.

### 핵심 원칙
1. **V2-Only**: 검증 대상은 오직 `app/v2/` 및 `src/v2/`로 한정. Legacy `app/`/`src/legacy` 참조 불허.
2. **SoT First**: 테스트 작성 전 도메인 SoT(문서)와 코드의 상수/Enum/스키마 일치 여부를 반드시 확인.
3. **Bottom-Up**: Schema → Core Logic → Service → API → Scenario 순서로 진행.
4. **Evidence-Rich**: 모든 통과/실패 증거(로그, DB row, Redis, 스크린샷, 네트워크 캡처)를 문서화.
5. **Fail-Fast**: 검증 실패 시 즉시 중단 후 수정/재시도.

---

## 1. 테스트 순서도 (Master Flowchart)

(이전 문서의 mermaid 차트를 V2 전용으로 유지. 필요한 경우 간소화/세분화하여 사용.)

```mermaid
graph TD
    Start([1. Start: Clean V2 Environment]) --> EnvCheck[Check V2 Config & DB Connection]
    EnvCheck --> SchemaSync[Verify V2 Enum/Schema vs SoT Doc]
    SchemaSync --> IsSchemaValid{SoT Match?}
    IsSchemaValid -- No --> FixSchema[Fix V2 Constants/Enums]
    FixSchema --> SchemaSync
    IsSchemaValid -- Yes --> Phase2_Core

    subgraph P2 [Phase 2: Core Economy (V2)]
      Phase2_Core[Vault & Ledger Integrity (V2)]
      Phase2_Core --> VaultTest[Unit Test: V2 Vault Locked Balance]
      VaultTest --> ShopFlow[Service Test: V2 Shop Buy & Inventory]
      ShopFlow --> TicketZero[Service Test: V2 TicketZero]
    end

    P2 --> IsEconomySafe{Economy Secure?}
    IsEconomySafe -- No --> FixEconomy[Fix V2 Logic & Retry]
    FixEconomy --> Phase2_Core
    IsEconomySafe -- Yes --> Phase3_Game

    subgraph P3 [Phase 3: Game Engine (V2)]
      Phase3_Game[Game Logic Standardization (V2)]
      Phase3_Game --> EngineTest[Unit Test: V2 Roulette/Dice/Lottery Logic]
      EngineTest --> RewardTest[Unit Test: V2 Reward Distribution]
      RewardTest --> GameAPI[API Test: /api/v2/* play endpoints]
    end

    P3 --> IsGameValid{Game Logic Valid?}
    IsGameValid -- No --> FixGame[Fix Engine/Probability in V2]
    FixGame --> Phase3_Game
    IsGameValid -- Yes --> Phase4_Ops

    subgraph P4 [Phase 4: Admin & Ops (V2)]
      Phase4_Ops[Admin Ops & Security (V2)]
      Phase4_Ops --> AuthTest[Security: V2 RBAC & Auth]
      AuthTest --> OpsExecution[Service: Ops Plan & Result]
      OpsExecution --> ResourceMgmt[Backend: User/Vault/Mission/Game Config (V2)]
    end

    P4 --> IsOpsReady{Ops Ready?}
    IsOpsReady -- No --> FixOps[Fix Permissions/Logic]
    FixOps --> Phase4_Ops
    IsOpsReady -- Yes --> Phase5_Integ

    subgraph P5 [Phase 5: Full Scenario (V2 E2E)]
      Phase5_Integ[E2E Scenario (V2)]
      Phase5_Integ --> Flow1[Scenario: SignUp -> Deposit -> Play -> Vault]
      Flow1 --> Flow2[Scenario: Lose All -> Bailout -> Play Again]
      Flow2 --> Flow3[Scenario: Admin Intervention -> User Inbox]
    end

    P5 --> FinalCheck{All Pass?}
    FinalCheck -- No --> Debug[Debug & Fix]
    Debug --> Phase5_Integ
    FinalCheck -- Yes --> End([Ready to Ship])
```

---

## 2. 단계별 체크리스트 (V2 전용)

(중요: 각 항목은 `tests/v2_tests/` 하위에 테스트가 존재해야 하며, 증거가 문서에 남아야 합니다.)

### Phase 1: 환경 및 SoT 정합성
- [ ] `alembic current`에서 오류 없음, `alembic heads` 최신 마이그레이션 반영
- [ ] `app.v2` 모듈만 로드 가능한지 확인(ImportError/NameError 없음)
- [ ] Reward/Item/Game 관련 Enum/Schema가 SoT와 일치
- [ ] Router Prefix가 `/api/v2`로 일관되게 적용

### Phase 2: 코어 경제 (V2)
- [ ] V2 Vault Locked Balance 단위/동기 검증 (동시성 테스트 포함)
- [ ] CC Deposit Idempotency (Delta 기반 포인트/XP 지급)
- [ ] Shop Purchase → Inventory 적재 원자성 검증
- [ ] TicketZero Eligibility 및 쿨다운 검증
- [x] Withdrawal Tier (1/1/3/5) 적용 검증
  - 실행: `pytest -q tests/v2_tests/phase2_core/test_v2_vault_withdrawal_tiers.py`

### Phase 3: 게임 엔진 (V2)
- [ ] Dice/Roulette/Lottery V2 로직 단위 테스트
- [ ] Golden Hour 트리거/배수 적용 검증
- [ ] Game -> Reward 지급 시 V2 Vault/ledger 적재 확인

### Phase 4: Admin & Ops (V2)
- [ ] Admin RBAC (일반 유저 호출 시 403)
- [ ] Ops Plan Execution 스키마/로그 적재 확인
- [ ] Admin UI Config(Shop) 변경 시 AppUiConfig 반영 검증

### Phase 5: 통합 시나리오 (V2 E2E)
- [x] New User Journey (SignUp → Welcome → Play → Reward)
- [x] Gambler's Loop (Lose → Bailout → Play)
- [x] Admin Intervention (Admin 지급 → Inbox → 유저 확인)
  - 실행: `python -m pytest -q tests/v2_tests/phase5_public/test_verify_full_scenario_v2.py -s`

---

## 3. 실행 가이드 (핵심)

- 최소 회귀: `docker compose exec backend pytest -q tests/v2_tests/phase4_admin`
- 파이썬 컴파일 체크: `docker compose exec backend python -m compileall -q app/v2`
- Phase 5 E2E: `python -m pytest -q tests/v2_tests/phase5_public/test_verify_full_scenario_v2.py -s`
- 결과 규칙: `실행일`, `커맨드`, `결과(pass/fail)`, `핵심 경고/특이사항(한 줄)` 기록

---

## 5. 변경 이력
- v2.2 (2026-01-24, GitHub Copilot): 출금 회차 기준(1/1/3/5) 적용 검증 추가
- v2.1 (2026-01-24, GitHub Copilot): Phase 5 E2E 실행 및 체크리스트 완료 반영

---

## 4. 산출물 & 문서화
- 모든 검증 결과(명령/시간/결과 스니펫)는 `docs/v2_specs/00_sot_meta/v2_verification_test_logs_YYYYMMDD.md`에 추가
- 실패 시 티켓: `golden-v2-migration` 생성 및 링크 기재

---

> 주의: 본 문서는 V2 전용 검증 표준입니다. V1 근거(코드/테스트/문서)에 의존하지 말고, 각 검증은 반드시 V2 코드에서 직접 실행해 증거를 남기세요.
