문서 타입: 게임 정책/로직
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/개발/운영 팀
상태: SoT

# V2 Golden Hour Policy SoT (골든아워 정책)

## 1. 목적
특정 시간대 또는 조건 하에 게임 보상 효율이 증대되는 **골든아워(Golden Hour)** 시스템의 작동 규칙, 배율(Multiplier), 발동 조건을 정의한다.

## 2. 골든아워 정의 (Definition)
- **Golden Hour**: 서버 전체 또는 특정 세그먼트 유저에게 적용되는 **보상 부스팅(Boosting)** 상태.
- **효과**: 획득 경험치(XP) 및 재화(Point) 획득량에 `Multiplier`가 적용된다. (단, 희귀 재화인 Diamond, GoldKey 등은 제외될 수 있음).

## 3. 설정 스키마 (Configuration)
`GoldenHourConfig` (Redis/DB)에 의해 제어된다.

| 필드 | 타입 | 설명 | 기본값 |
| :--- | :--- | :--- | :--- |
| `enabled` | bool | 전체 활성화 여부 | `false` |
| `manual_override` | enum | `AUTO` (스케줄), `FORCE_ON` (강제), `FORCE_OFF` (중지) | `AUTO` |
| `multiplier` | float | 적용 배율 (예: 1.5, 2.0) | `2.0` |
| `start_time_kst` | string | 시작 시각 (HH:mm) | `20:00` |
| `end_time_kst` | string | 종료 시각 (HH:mm) | `22:00` |
| `base_amount_gate` | int | 최소 입장/베팅 금액 제한 (Optional) | `null` |

---

## 4. 작동 로직 (Logic)

### 4.1. 스케줄링 (Auto Mode)
- 매일 지정된 `start_time_kst` ~ `end_time_kst` 사이에 자동 활성화된다.
- **기본 스케줄**: 매일 20:00 ~ 22:00 (KST).

### 4.2. 배율 적용 (Multiplier Application)
- **공식**: `FinalReward = BaseReward * Multiplier`
- **적용 대상**:
    - 룰렛/다이스 당첨 시 `POINT` 보상.
    - 게임 플레이 시 `GAME_XP` (Level Point) 획득량.
- **비적용 대상**:
    - 랭킹 보상, 미션 완료 보상, 출석 보상 (고정 보상 제외).

### 4.3. UI 표시
- 활성화 시 메인 화면 상단에 **"GOLDEN HOUR x2.0"** 배너가 노출되어야 한다.
- 게임 내 심볼/이팩트가 "Gold" 테마로 변경된다.

---

## 5. 관리 및 운영
- 운영자는 어드민 패널(`admin_vault_ops`)을 통해 실시간으로 `manual_override`를 변경할 수 있다.
- 변경 내역은 `OpsLog`에 기록되어야 한다.

## 6. 변경 이력
- v1.0 (2026-01-19, Antigravity Agent): 최초 정의.
