문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: V2 게임 엔진 설계/구현/검증 담당자
상태: SoT

## 1. 목적
V2 게임(룰렛/주사위/복권) 로직의 **기준 동작**과 **공통 규칙**을 SoT로 고정한다. V1 구조를 참고하되, **모든 기준은 V2 SoT**를 따른다.

## 2. 범위
- 게임: 룰렛, 주사위, 복권
- 레이어: 공통 게임 플로우, Config 강제 규칙, 보상/금고 라우팅, 로깅/관측, 팀배틀 연동
- 제외: 텔레그램 SDK/브릿지, V1 리팩토링

## 2.1 V2 게임 구성 (V1 참고, 기준은 V2)
- **룰렛 구성**: 총 4종
   - 고액 룰렛 2종: **GOLD_KEY_TICKET 룰렛**, **DIAMOND_TICKET 룰렛**
   - 체험판 룰렛 1종: **TRIAL 룰렛**
   - 기본 룰렛 1종: **기본 룰렛(ROULETTE_TICKET)**
- **룰렛 티켓 타입 고정**
   - 기본 룰렛: `ROULETTE_TICKET`
   - 체험판 룰렛: `TRIAL_TICKET`
   - 고액 룰렛(골드): `GOLD_KEY_TICKET`
   - 고액 룰렛(다이아): `DIAMOND_TICKET`
- **룰렛 접근 조건 고정**
   - 고액 룰렛은 VIP/WHALE만 접근 가능
   - VIP 일일 제한: GOLD_KEY_TICKET 3회, DIAMOND_TICKET 1회
   - WHALE은 제한 없음
- **복권 퍼즐 합체**: 복권 보상 퍼즐 조각(C1, C2, J, M)을 모두 모으면 **GOLD_KEY_TICKET 1개로 합체**된다.

## 2.2 퍼즐 합체 보상/제작 API 계약 (SoT)
### 2.2.1 기능 요약
- 퍼즐 조각(C1, C2, J, M) 각 1개를 소모하여 **GOLD_KEY_TICKET 1개**를 제작한다.

### 2.2.2 엔드포인트
- `POST /api/v2/exchange/craft`

### 2.2.3 요청 스키마
```json
{
   "target_token_type": "GOLD_KEY_FROM_PUZZLE"
}
```

### 2.2.4 응답 스키마 (성공)
```json
{
   "result": "OK",
   "reward_token": "GOLD_KEY_TICKET",
   "reward_amount": 1,
   "used_token": "PUZZLE_C_J_M",
   "used_amount": 0
}
```

### 2.2.5 실패 조건
- 퍼즐 조각 부족: `NOT_ENOUGH_TOKENS`
- 지원하지 않는 제작 요청: `Unsupported craft target`

### 2.2.6 토큰 소모 규칙
- 필수 소모: `PUZZLE_C1` 1개, `PUZZLE_C2` 1개, `PUZZLE_J` 1개, `PUZZLE_M` 1개
- 지급: `GOLD_KEY_TICKET` 1개

## 3. SoT 우선순위
1) 본 문서
2) 게임 액션 스키마 SoT: docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md
3) 어드민 게임 설정 스키마 SoT: docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md
4) 보상 타입 표준 SoT: docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
5) 보상 매핑 SoT: docs/v2_specs/01_core/v2_reward_mapping_sot_ko.md
6) 티켓 Enum 정합 SoT: docs/v2_specs/01_core/v2_ticket_enum_code_alignment_sot_ko.md
7) 금고 정책 SoT: docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md
8) 골든아워 정책 SoT: docs/v2_specs/02_game/v2_golden_hour_policy_sot_ko.md
9) 팀배틀 SoT: docs/v2_specs/02_game/v2_team_battle_sot_ko.md

## 4. 공통 게임 플로우 (입장 → 결과 → 보상)
1) **입장/자격 검증**
   - Feature 활성화 여부 확인
   - 토큰(티켓) 보유 및 소모 가능 여부 확인
   - 금고 정책(혜택 중단 등) 적용 여부 확인
   - 이벤트/세그먼트 접근 조건 확인
2) **설정 로딩/검증**
   - 활성 Config 단일성 보장
   - 확률/가중치/보상 값 유효성 검증
   - Config Schema 강제 적용(누락/불일치 시 즉시 실패)
3) **결과 산출**
   - 공통 RNG 규칙 적용
   - DDA 적용 기준은 SoT에 맞춰 통일
   - 결과 구조는 Game Action Schema 준수
4) **보상 지급**
   - RewardType 표준 준수
   - 금고 적립(POINT/CC_POINT) 우선
   - 비금고 보상(티켓/아이템/기타) 분리 지급
5) **로깅/관측**
   - 게임 로그 + 공통 이벤트 로그 기록
   - 이벤트/골든아워/세그먼트 정보는 meta에 기록
   - Team Battle/Live Feed 연동은 비차단 방식
   - Team Battle 점수 반영은 게임 결과 반환을 절대 막지 않는다
6) **응답 반환**
   - API 계약 스키마 준수
   - 프론트 파싱 경로 일원화

## 5. Config Schema 강제 규칙
- 모든 게임 설정은 **Admin Game Config Schema**를 만족해야 한다.
- 누락/불일치 발견 시 즉시 실패(InvalidConfig)로 처리한다.
- 이벤트/골든아워 등 확장은 Schema 확장으로만 허용한다.

## 6. 보상/금고 라우팅 원칙
- 금고 SoT는 `vault_locked_balance` 단일 경로를 사용한다.
- 보상 라우팅 우선순위:
  1) POINT/CC_POINT → 금고 적립
  2) GAME_XP → 시즌 XP 경로
  3) 티켓/아이템 → 인벤토리/토큰 지급
- RewardType 문자열은 SoT 기준을 반드시 준수한다.
- **음수 보상 처리**: 주사위 실패 등에서 보상값이 음수일 경우, 금고 차감으로 처리한다.

## 7. 로깅/관측 표준
- 공통 게임 로그 필드: `feature_type`, `reward_type`, `reward_amount`, `dda_applied`
- 이벤트 모드/골든아워 여부는 `meta`에 기록한다.
- 실패해도 게임 결과 반환은 보장한다(비차단).

## 7.1 팀배틀 연동 규칙
- 게임 플레이 결과는 팀배틀 점수 브릿지를 통해 반영할 수 있다.
- 팀배틀 반영 실패는 본 게임 플로우를 중단하지 않는다.
- 팀배틀 스코어링 규칙은 별도 SoT를 따른다.

## 8. 오류/안전 정책
- Config 미존재/불일치: 즉시 실패
- 토큰 부족: 사용자 친화 메시지
- 금고 정책 차단: “입금 후 이용 가능” 메시지 고정
- 동시성: 토큰 차감/로그/보상 지급의 원자성 보장

## 9. 테스트 기준
- 유닛: config 검증, 결과 산출, 보상 라우팅
- 통합: play 요청 시 토큰 차감 + 로그 기록 + 보상 반영
- 웹 검증: Network 탭 기준 응답 스키마 준수

## 10. 변경 이력
- v1.8 (2026-01-19, GitHub Copilot): 룰렛 명칭/제한/퍼즐 합체 표기를 V2 문서 Enum으로 통일
- v1.7 (2026-01-19, GitHub Copilot): 퍼즐 합체 보상 토큰을 V2 문서 표준 Enum으로 통일
- v1.6 (2026-01-19, GitHub Copilot): 룰렛 티켓 명칭을 V2 문서 표준 Enum으로 통일
- v1.5 (2026-01-19, GitHub Copilot): 퍼즐 합체 보상/제작 API 계약 SoT 추가
- v1.4 (2026-01-19, GitHub Copilot): 룰렛 4종 명칭/티켓/접근 조건 및 퍼즐 합체 규칙 고정
- v1.3 (2026-01-19, GitHub Copilot): 룰렛 4종/복권 퍼즐 합체/주사위 음수 보상 규칙 반영
- v1.2 (2026-01-19, GitHub Copilot): 팀배틀 SoT 링크 추가
- v1.1 (2026-01-19, GitHub Copilot): 팀배틀 연동 규칙 보강
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
