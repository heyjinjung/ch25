문서 타입: SoT (최종)
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

## 1. 목적 (Purpose)
레벨(LEVEL) 도메인의 **최종 SoT**(정의/용어/불변 규칙/데이터 기준점)를 단일 문서로 확정한다.

## 2. 범위 (Scope)
- 레벨/XP(=레벨포인트) 용어 및 불변 규칙
- SoT(Primary) 데이터 소스 및 레거시 동기화 원칙
- API 호환 규약(Season Pass 폐기, legacy 필드 처리)

## 3. 결론 요약 (TL;DR)
- V2는 **단일 레벨 시스템**만 사용한다. (Season Pass 개념은 정책적으로 폐기)
- 레벨포인트는 내부적으로 **XP(GAME_XP 개념)**이며, 금고(Vault) 재화와 **완전히 분리**된다.
- 2026-02-04부터 레벨/XP의 Primary SoT는 `v2_user.level`, `v2_user.xp`이다.
- 레거시 호환을 위해 `user_level_progress.level/xp`는 **동기화(mirror)** 대상이며, 신규 로직의 기준점이 아니다.

## 4. 용어 정의 (Definitions)
- 레벨(Level): 유저 성장 단계(정수, 최소 1)
- XP / 레벨포인트(Level Point): 레벨 업을 위한 누적 포인트(정수, 최소 0)
  - 문서/기획에서 “레벨포인트”라고 부르면, 시스템 내부에서는 “XP”로 취급한다.
- Reward(레벨 보상): 특정 레벨 달성 시 지급되는 보상(아이템/티켓/기프티콘 등)

### 4.1 도메인 경계 (Domain Boundaries)
- 레벨 도메인은 “성장(Progression)” 영역이며, 다음 하위 도메인과 경계가 있다.
  - **Vault(금고)**: 현금성 포인트(locked/available) 및 원장 기록. XP와 분리.
  - **Inventory/Wallet(인벤/지갑)**: 티켓/토큰/아이템(예: 기프티콘) 지급.
  - **Ops/Import(운영 반입)**: 입금/게임로그/환전 등 외부 데이터를 내부 SoT로 반영.

경계 원칙:
- XP 적립은 “원천 이벤트(입금/어드민/미션/게임 등)”에 의해 발생하지만, Vault 잔액과 동치가 아니다.
- 레벨 보상은 지급 결과가 Inventory/Vault에 반영될 수 있으나, “레벨 도메인에서의 멱등성”은 `user_level_reward_log`로 보장한다.

## 5. 불변 규칙 (Invariants)
### 5.1 단일 성장 축
- V2 성장 축은 **레벨/XP** 하나로 통일한다.
- “Season Pass”는 **정책적으로 폐기**되며, 신규 기능/데이터 설계에 포함하지 않는다.

### 5.2 금고 재화와 분리
- XP 적립/차감은 Vault 잔액/원장과 독립적이다.
- “입금/미션/게임” 등 이벤트가 XP에 영향을 주더라도, Vault 잔액 변동과는 별도로 기록/추적한다.

### 5.3 시간대 원칙
- 모든 비즈니스 로직 기준 시간대는 `Asia/Seoul` (KST)이다.
- 레벨 도메인에서 “일일/당일” 기준이 등장할 경우(예: 일일 제한/집계), 운영일 기준(오전 9시 리셋) 정책과 충돌하지 않도록 명시해야 한다.
  - 현재 레벨/XP 정책은 **일일 XP 한도 없음**(2026-01-28 폐기)이다.

## 6. SoT(Primary) 데이터 기준
### 6.1 Primary SoT (2026-02-04~)
- `v2_user.level` (INT, default 1)
- `v2_user.xp` (INT, default 0)

### 6.2 레거시 동기화(Mirror)
- `user_level_progress.level`
- `user_level_progress.xp`
- 목적: 과거 코드/쿼리/리포트의 호환성 유지
- 주의: 신규 정책/검증의 기준점은 반드시 Primary SoT(`v2_user`)이다.

### 6.3 핵심 테이블/필드 상세 (DB Contract)
레벨 도메인에서 실질적으로 참조/갱신되는 핵심 테이블은 아래 4개로 정리한다.

| 구분 | 테이블 | 핵심 필드 | 의미 |
|---|---|---|---|
| Primary SoT | `v2_user` | `level`, `xp` | 현재 레벨/누적 XP(최종 기준) |
| Mirror | `user_level_progress` | `level`, `xp` | 레거시 호환용 미러(동기화 대상) |
| Audit | `user_xp_event_log` | `source`, `delta`, `meta` | XP 변동 감사 로그(원천/증감/문맥) |
| Idempotency | `user_level_reward_log` | `(user_id, level)` 유니크 | 레벨 보상 중복 지급 방지 키 |

불변 규칙(데이터 관점):
- `v2_user.level >= 1`
- `v2_user.xp >= 0`
- `user_level_progress.*`는 `v2_user.*`를 따라가도록 동기화한다.
- XP가 변하면 `user_xp_event_log`를 반드시 남긴다.

주의(구현 차이):
- DB timestamp는 일부는 `UTC(datetime.utcnow)` 기반, 일부는 DB `NOW()` 기반일 수 있다.
  - 정책은 “KST 기준 운영”이지만, 저장된 timestamp의 timezone 일관성은 별도 검증 포인트로 관리한다.

## 7. API/응답 규약
- 일부 레거시 게임 응답에 `season_pass` 필드가 존재할 수 있으나, V2 정책상 **항상 null** 반환(또는 미노출)로 정렬한다.

### 7.1 최소 API 계약(요약)
- 유저 스냅샷(인증/유저 조회 등)에서 최소 다음이 일관되게 노출되어야 한다.
  - `level` (Int)
  - (노출 정책에 따라) `xp` 또는 `level_point`
- 레거시 호환 필드로 `season_pass`가 존재할 경우:
  - V2 정책상 사용하지 않으므로, **항상 null**로 응답을 정렬한다.

### 7.2 레벨 상태 계산(개념)
레벨 상태 화면/응답은 일반적으로 아래 값을 필요로 한다.
- 현재 레벨/현재 XP
- 다음 레벨의 required_xp
- 다음 레벨까지 남은 XP
- (선택) 이미 지급된 레벨 보상 로그

레벨 요구조건/보상은 `v2_level_reward_table`을 운영 SoT로 사용한다.

## 8. 대표 시나리오 (End-to-End)
### 8.1 CC 입금 → XP 증가 → 레벨 상승 → 보상 지급
1) 운영 반입(Import) 또는 CC 입금 반영으로 유저의 누적 입금이 갱신된다.
2) 정책에 따라 XP가 증가한다(100,000원당 20XP, 일일 한도 없음).
3) XP가 증가하면 레벨 보상표 기준으로 달성 레벨을 재계산한다.
4) 새로 달성된 레벨이 있다면, `user_level_reward_log`에 기록하고(멱등), 보상을 지급한다.
5) 레거시 호환을 위해 `user_level_progress`도 동기화한다.

## 9. 운영 검증 (SQL 체크리스트)
### 9.1 SoT/Mirror 정합성
```sql
-- Primary vs Mirror 불일치 탐지
SELECT u.id, u.level AS v2_level, p.level AS legacy_level,
       u.xp AS v2_xp, p.xp AS legacy_xp
FROM v2_user u
LEFT JOIN user_level_progress p ON p.user_id = u.id
WHERE p.user_id IS NULL
   OR u.level <> p.level
   OR u.xp <> p.xp;
```

### 9.2 보상 로그 멱등성
```sql
-- (user_id, level) 중복이 존재하면 정책 위반
SELECT user_id, level, COUNT(*) AS cnt
FROM user_level_reward_log
GROUP BY user_id, level
HAVING COUNT(*) > 1;
```

### 9.3 XP 이벤트 감사
```sql
-- 특정 유저의 XP 변동 근거 추적
SELECT id, source, delta, created_at
FROM user_xp_event_log
WHERE user_id = :user_id
ORDER BY id DESC
LIMIT 100;
```

## 8. 관련 문서 (Sources)
- ../20260204_v2_sot_consolidation.md
- ../20260128_level_daily_xp_limit_discarded_update.md
- ../v2_level_point_sot_ko.md
- ../v2_level_point_storage_sot_ko.md
- ../v2_progression_schema_ko.md

## 9. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 레벨 도메인 최종 SoT(5문서 체계) 중 개요 확정
- v1.1 (2026-02-07, GitHub Copilot): 도메인 경계/흐름/검증 SQL 보강
