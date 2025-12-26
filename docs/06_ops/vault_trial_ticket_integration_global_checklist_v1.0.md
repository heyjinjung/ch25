# 금고(Vault) × 체험티켓(Trial) 통합 전역 체크리스트 v1.0

- 문서 타입: 전역 구현 체크리스트(Back/Front/DB/Ops/Test)
- 버전: v1.0
- 작성일: 2025-12-23
- 기준 설계 문서: [docs/05_modules/05_module_vault_master_final_trial_ticket_v2.2.md](../05_modules/05_module_vault_master_final_trial_ticket_v2.2.md)
- 목적: “문서에만 있는 설계”를 실제 동작 기능으로 연결하기 위한 **최소 변경 작업 목록 + 검증 기준(DoD)**

---

## 0) Definition of Done (완료 기준)

- [ ] (Trial) ticket=0에서 체험티켓 지급이 기존처럼 정상 동작한다(회귀 없음).
- [ ] (Deposit) **체험티켓으로 플레이한 결과 보상(payout)** 이 금고 `locked`로 적립된다(설정 플래그 ON일 때만).
- [ ] (Idempotency) 동일 게임 결과가 재요청/재시도되어도 **중복 적립이 발생하지 않는다**(earn_event_id 기준).
- [ ] (Expiry) Phase 1 규칙(24h, 추가 적립해도 expires_at 미갱신)이 유지된다.
- [ ] (Unlock) 기존 해금 트리거(외부랭킹 deposit 증가 → locked 감소 + cash 지급)가 그대로 동작한다.
- [ ] (Copy) 프론트 ‘다음 해금 조건’ 문구가 서버 `unlock_rules_json`과 불일치하지 않는다.
- [ ] (Observability) 적립 성공/스킵 사유(환산 불가 등)가 로그/원장(meta)로 남아 운영에서 집계 가능하다.

---

## 1) 스코프/비스코프(정리)

### 1.1 이번 v1.0에 포함

- 체험티켓 플레이 결과 확정 시점에 “금고 적립”을 연결
- 멱등 키(earn_event_id)로 중복 적립 방지
- 최소한의 환산 맵(trial_reward_valuation) 또는 “현금형만 적립” 정책으로 시작

### 1.2 이번 v1.0에서 하지 않음(명시)

- [ ] “금고 누적 1만원 도달 시 자동 해금” 기능 (현 Phase 1 코드/정책에 없음)
- [ ] 신규 테이블을 필수로 추가하는 설계(운영/성능 이슈가 생기면 Phase 2에서 승격)

---

## 2) 현황 체크(레포 스냅샷)

- 금고 단일 기준: `user.vault_locked_balance` (+ mirror `vault_balance`) → [app/models/user.py](../../app/models/user.py)
- 금고 서비스: 만료/무료 fill/예치 증가 해금 → [app/services/vault_service.py](../../app/services/vault_service.py)
- 체험티켓 지급: 게임 지갑 토큰 1장/일 멱등 → [app/services/trial_grant_service.py](../../app/services/trial_grant_service.py)
- 게임 보상 지급: `RewardService.deliver()`가 cash/token으로 분기 → [app/services/reward_service.py](../../app/services/reward_service.py)

핵심 갭
- “trial-play인지” 식별 정보가 현재 결과 로그/이벤트에 없다.
- “trial payout → vault locked 적립” 라우팅이 현재 없다.

---

## 3) 백엔드 작업 체크리스트

### 3.1 플래그/설정 (롤아웃 가드)

- [ ] 설정 추가: `enable_trial_payout_to_vault` (기본 OFF)
- [ ] (선택) 설정 추가: `trial_reward_valuation` (JSON 맵) 또는 “현금형만 적립” 모드
- [ ] (선택) 설정 추가: `trial_payout_games_allowlist` (예: ROULETTE/DICE)

완료 기준
- 기본값 OFF에서 기존 동작이 100% 동일해야 함.

### 3.2 trial-play 식별(최소 변경)

권장 최소안(둘 중 하나 선택)
- [ ] A안: 토큰 소비(consume) 시 `meta`에 `{"is_trial": true}`를 남기고, 결과 로그/이벤트에 그대로 전달
- [ ] B안: trial로 지급된 토큰을 별도 token_type으로 분리(비권장: 스키마/설정 파급이 큼)

완료 기준
- 운영자가 “이 플레이가 trial인지”를 로그/DB로 확인 가능해야 함.

### 3.3 earn_event_id 생성/멱등 체크

- [ ] earn_event_id 규칙 확정
  - 예: `ROULETTE:<roulette_log_id>` / `DICE:<dice_log_id>` 같이 **기존 게임 로그 PK 기반**
- [ ] 멱등 저장 위치 확정(새 테이블 없이 시작)
  - 권장: 기존 로깅/원장(meta_json)에 `earn_event_id` 저장 후, 동일 키 존재 여부 조회

완료 기준
- 동일 결과를 2번 처리해도 vault_locked_balance가 1번만 증가

### 3.4 적립 라우팅(Trial payout → Vault locked)

- [ ] “결과 확정 이후”에만 적립 실행(소모만 있고 취소/에러면 적립 금지)
- [ ] 적립 값 규칙 확정
  - 현금형: payout 금액 그대로
  - 비현금형: valuation 맵에 있는 것만 환산 후 적립
- [ ] 적립 수행 시 Phase 1 룰 준수
  - `vault_locked_balance` 증가
  - `vault_locked_expires_at`은 “첫 적립”에만 설정(추가 적립은 미갱신)
  - `vault_balance` mirror 동기화

완료 기준
- 적립이 켜져도 기존 cash 지급/게임 토큰 지급 로직과 충돌하지 않음

---

## 4) 프론트엔드 작업 체크리스트

### 4.1 서버 룰 기반 카피(드리프트 제거)

- [ ] 홈 배너/설명에서 하드코딩 문구를 줄이고 `unlock_rules_json` 기반 렌더링으로 치환

완료 기준
- 서버 룰 변경 시 프론트 문구가 자동으로 따라감

### 4.2 ticket=0 UX 회귀 방지

- [ ] auto trial grant(사이드바) / 수동 grant(패널 버튼) 흐름 유지
- [ ] 금고 미리보기(vault-status) 표시는 그대로 유지

완료 기준
- trial 적립 기능 ON/OFF가 ticket=0 UX에 영향을 주지 않음

---

## 5) DB/마이그레이션 체크리스트

- [ ] 이번 v1.0 목표는 “신규 테이블 없이” 시작(가능한 범위)
- [ ] 다만 멱등 조회가 느려지거나 운영 요구가 커지면 Phase 2에서 아래 승격 고려
  - 전용 `vault_earn_ledger` (earn_event_id UNIQUE)
  - earn_event_id 인덱스

---

## 6) 테스트 체크리스트

### 6.1 백엔드 단위/통합 테스트

- [ ] 플래그 OFF: 기존 게임/Trial/Vault 플로우가 완전히 동일(회귀 없음)
- [ ] 플래그 ON: trial-play 결과만 vault_locked_balance가 증가
- [ ] 멱등: 동일 결과 2회 처리 시 1회만 적립
- [ ] 만료: expires_at 도래 시 locked=0 + mirror 동기화

### 6.2 운영 E2E(수동 시나리오)

- [ ] ticket=0 → trial 지급 → 게임 1회 플레이 → 결과 확정 → vault/status에서 locked 증가 확인
- [ ] 동일 요청 재시도(네트워크 재전송 가정) → locked가 추가로 증가하지 않음

---

## 7) 릴리즈/관측 체크리스트

- [ ] 로그/메타에 다음 필드가 남는지 확인
  - `source=TRIAL`
  - `earn_event_id`
  - `reward_kind`
  - `valuation_applied` 또는 `skip_reason`
- [ ] 롤아웃: 특정 유저/게임 allowlist부터 시작

