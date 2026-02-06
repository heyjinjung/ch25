문서 타입: SoT (최종)
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/운영/FE
상태: SoT

## 1. 목적 (Purpose)
레벨/XP(레벨포인트)의 **저장소(SoT)·동기화·로그·롤백 원칙**을 최종 확정한다.

## 2. 범위 (Scope)
- Primary SoT 및 레거시 Mirror 테이블
- XP 이벤트 로그/레벨 보상 로그의 의미와 필수 기록 규칙
- 듀얼라이트(동기화) 시 트랜잭션/정합성 원칙

## 2.1 한눈에 보는 저장 구조
| 레이어 | 역할 | SoT 우선순위 | 테이블 |
|---|---|---:|---|
| Primary | 현재 레벨/XP의 단일 기준 | 1 | `v2_user` |
| Mirror | 레거시 호환(읽기/조인) | 2 | `user_level_progress` |
| Audit | 원천/증감 감사 | 3 | `user_xp_event_log` |
| Idempotency | 중복 보상 방지 | 3 | `user_level_reward_log` |

## 3. Primary SoT
### 3.1 사용자 테이블
- `v2_user.level`: 현재 레벨
- `v2_user.xp`: 현재 누적 XP

### 3.2 업데이트 원칙
- 신규 로직(서비스/어드민/임포트)은 **반드시 `v2_user`를 우선 업데이트**한다.
- 레벨 판정은 `v2_user.xp`를 기준으로 수행한다.

## 4. 레거시 Mirror(동기화)
### 4.1 목적
- 과거 레거시 로직/리포트/조회 호환성 유지

### 4.2 동기화 대상
- `user_level_progress.level`
- `user_level_progress.xp`

### 4.3 동기화 규칙
- `v2_user` 변경이 발생하면 같은 트랜잭션(가능한 범위)에서 `user_level_progress`도 함께 동기화한다.
- Mirror는 “정합성 보조장치”이며, SoT 판단의 기준점이 아니다.

## 5. 이벤트/보상 로그
### 5.1 XP 이벤트 로그
- 테이블: `user_xp_event_log`
- 필수 필드:
  - `user_id`
  - `source`: 적립/조정 원천 식별자(예: `CC_DEPOSIT`, `ADMIN_ADJUST` 등)
  - `delta`: XP 증감량(정수)
  - `meta`: 상세 문맥(JSON)

필수 규칙:
- XP가 변하면 반드시 `user_xp_event_log`에 기록한다.
- source는 운영/분석에서 구분 가능한 수준으로 안정적으로 유지한다.

### 5.2 레벨 보상 로그
- 테이블: `user_level_reward_log`
- 의미: “레벨 N을 달성했을 때의 보상을 지급(또는 지급 시도)했다”는 **idempotency 키** 역할

필수 규칙:
- 특정 유저/레벨 조합에 대해 중복 지급이 발생하지 않도록 `user_level_reward_log` 기반으로 멱등 처리한다.

### 5.3 제약조건(필수)
아래 제약은 문서가 아니라 **실제 DB 계약**으로 간주한다.

- `user_level_reward_log`: `(user_id, level)` 유니크
  - 목적: “레벨 N 보상은 유저당 1회”를 DB 차원에서 강제
- `user_xp_event_log`: `id` PK(감사 로그는 append-only)

권장 규칙(운영):
- XP 이벤트는 삭제/수정 대신 “정정 이벤트(음수/양수 delta)”로 보정하고, meta에 사유/티켓을 남긴다.

## 6. 레벨 보상표 저장
- 테이블: `v2_level_reward_table`
- 레코드가 존재할 경우, 서비스는 이를 “운영 SoT”로 사용한다.
- 비어 있을 경우(예외), 하드코딩 fallback이 동작할 수 있으나 이는 운영 정책으로 권장되지 않는다.

### 6.1 보상표 변경 관리(운영)
- `v2_level_reward_table`은 운영 중 수정될 수 있으므로, 변경 시 다음을 필수로 수행한다.
  - 변경 전/후 스냅샷 백업(SQL export)
  - 변경 사유/적용일/담당자 기록(운영 로그)
  - 변경 직후 “테이블 1~20 정합성 검증 쿼리” 실행

## 7. 정합성/트랜잭션 원칙
- XP 적립/조정 1회 작업에서 다음이 함께 일어나야 한다.
  - `v2_user.xp` 업데이트
  - (가능하면 동일 트랜잭션에서) `user_level_progress.xp` mirror
  - `user_xp_event_log` 기록
  - 신규 달성 레벨에 대해 `user_level_reward_log` 기록(+ 자동 지급 시 지급 처리)

### 7.1 동시성(레이스) 원칙
- XP 증가는 경쟁 상태가 발생할 수 있으므로, 가능하면 유저 행 단위 잠금이 필요하다.
  - 예: `SELECT ... FOR UPDATE`(DB 지원 시)로 `v2_user`를 잠근 뒤 XP를 갱신
- 동일 유저에 대해 동시에 XP가 증가할 때도 보상 지급이 중복되지 않도록,
  - `user_level_reward_log` 유니크 제약 + 선조회(존재하면 skip)를 함께 사용한다.

### 7.2 커밋 경계
- 보상 지급(인벤/금고 반영)이 동일 트랜잭션에 들어가지 못하는 경우가 있으므로,
  - 최소한 `user_level_reward_log`가 먼저 기록되어 멱등 기준점이 생기도록 처리한다.
  - 지급 실패 시 재시도 시나리오(운영/배치)에서 로그를 기준으로 “미지급”을 판별할 수 있어야 한다.

## 8. 롤백/운영 조치 원칙
- 레벨 롤백은 Primary SoT(`v2_user`)와 Mirror(`user_level_progress`)를 **동시에** 맞춘다.
- 레벨/XP 롤백 시에도 XP 이벤트 로그/보상 로그 정책(멱등/감사)을 고려해, 필요한 경우 운영 메모(meta)로 남긴다.

### 8.1 롤백 표준 SQL 템플릿
```sql
-- 1) Primary SoT
UPDATE v2_user
SET level = :level, xp = :xp
WHERE id = :user_id;

-- 2) Legacy Mirror
UPDATE user_level_progress
SET level = :level, xp = :xp
WHERE user_id = :user_id;
```

권장:
- 롤백 실행 후 “SoT/Mirror 불일치 탐지 쿼리”로 즉시 검증한다.

## 9. 운영 검증 SQL
### 9.1 보상표 존재 여부
```sql
SELECT COUNT(*) AS cnt FROM v2_level_reward_table;
```

### 9.2 SoT/Mirror 정합성
```sql
SELECT u.id, u.level AS v2_level, p.level AS legacy_level,
     u.xp AS v2_xp, p.xp AS legacy_xp
FROM v2_user u
LEFT JOIN user_level_progress p ON p.user_id = u.id
WHERE p.user_id IS NULL
  OR u.level <> p.level
  OR u.xp <> p.xp;
```

### 9.3 XP 이벤트 대비 스냅샷 검증(개념)
운영 환경에서 “스냅샷 XP”가 “이벤트 합계”와 항상 동일하다고 보장하긴 어렵지만,
재계산/감사 목적의 sanity check로 활용할 수 있다.

```sql
SELECT user_id, SUM(delta) AS sum_delta
FROM user_xp_event_log
WHERE user_id = :user_id
GROUP BY user_id;
```

## 9. 관련 문서 (Sources)
- ../20260204_v2_sot_consolidation.md
- ../07.level.md
- ../v2_level_point_storage_sot_ko.md
- ../v2_db_level_reward_table_ko.md

## 10. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 레벨/XP 저장·동기화·로그·롤백 최종 정렬
- v1.1 (2026-02-07, GitHub Copilot): 제약/동시성/검증 SQL 보강
