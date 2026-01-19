문서 타입: 설계
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: V2 게임 엔진 설계/구현 담당자
상태: Draft

## 1. 목적
V2에서 룰렛/주사위/복권의 공통 흐름을 표준화하여, 웹 환경에서 **일관된 게임 로직 검증**과 **Config Schema 강제 적용**이 가능하도록 한다.

## 2. 범위
- 대상 게임: 룰렛, 주사위, 복권
- 레이어: API 계약, 서비스 공통 흐름, 설정/보상 검증, 로깅/관측
- 제외: 텔레그램 SDK/브릿지, V1 코드 리팩토링

## 3. SoT 우선순위/참조 문서
- 게임 액션 스키마 SoT: docs/v2_specs/02_game/v2_game_action_schema_sot_ko.md
- 어드민 게임 설정 스키마 SoT: docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md
- 보상 타입 표준 SoT: docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
- 보상 매핑 SoT: docs/v2_specs/01_core/v2_reward_mapping_sot_ko.md
- 티켓 Enum 정합 SoT: docs/v2_specs/01_core/v2_ticket_enum_code_alignment_sot_ko.md
- 금고 정책 SoT: docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md
- 골든아워 정책 SoT: docs/v2_specs/02_game/v2_golden_hour_policy_sot_ko.md

## 4. 공통 게임 플로우 (입장 → 결과 → 보상)
1) **입장/자격 검증**
   - Feature 활성화 여부
   - 토큰(티켓) 보유/소모 가능 여부
   - 금고 정책(혜택 중단 등) 적용 가능성
   - 이벤트/세그먼트 접근 조건
2) **설정 로딩/검증**
   - 활성 Config 단일성 보장
   - 확률/가중치/보상 값 유효성 검증
   - Config Schema 강제 적용(누락/잘못된 필드 즉시 실패)
3) **결과 산출**
   - 공통 RNG + DDA 적용 기준 통일
   - 결과 구조는 Game Action Schema에 맞춤
4) **보상 지급**
   - RewardType 표준 준수
   - 금고 적립 경로(POINT/CC_POINT) 우선
   - 비금고 보상(티켓/아이템) 분리 지급
5) **로깅/관측**
   - 게임 로그 + 공통 이벤트 로그 기록
   - 내부 스트림/피드/팀배틀 브릿지(있으면)
6) **응답 반환**
   - API 계약 스키마 준수
   - 프론트에서 동일한 파싱 경로 사용 가능하도록 구조 통일

## 5. 공통 인터페이스(개념)
- `get_status(user_id, today)` : 토큰 잔액/일일 사용량/설정 정보 반환
- `play(user_id, now, request_id)` : 결과 산출 + 보상 지급 + 로그 기록
- `validate_config(config)` : 스키마/가중치/보상 범위 검증
- `resolve_reward(outcome, config)` : RewardType/Amount 산출

## 6. Config Schema 강제 적용 원칙
- 모든 게임 설정은 **Admin Game Config Schema**를 만족해야 한다.
- 누락/불일치 시 즉시 실패(InvalidConfig)로 처리한다.
- 이벤트/골든아워 등 추가 규칙은 **Schema 확장** 방식으로만 허용한다.

## 7. 보상/금고 라우팅 원칙
- 금고 SoT는 `vault_locked_balance` 단일 경로를 사용한다.
- 보상 라우팅 우선순위:
  1) POINT/CC_POINT → 금고 적립
  2) GAME_XP → 시즌 XP 경로
  3) 티켓/아이템 → 인벤토리/토큰 지급
- RewardType 문자열은 SoT 기준을 반드시 준수한다.

## 8. 로깅/관측 표준
- 공통 게임 로그에 `feature_type`, `reward_type`, `reward_amount`, `dda_applied` 포함
- 이벤트 모드/골든아워 여부는 meta에 기록
- 필요한 경우 Team Battle/Live Feed 연동은 **비차단** 방식으로 처리

## 9. 오류/안전 정책
- Config 미존재/불일치: 즉시 실패(HTTP 400/500 정책은 API 계약에 따름)
- 토큰 부족: 사용자 친화 메시지
- 금고 정책 차단: “입금 후 이용 가능” 정책 메시지 고정
- 동시성: 로그/보상/토큰 차감 원자성 보장

## 10. 테스트 전략
- 유닛: config 검증, 결과 산출, 보상 라우팅
- 통합: play 요청 시 토큰 차감 + 로그 기록 + 보상 반영
- 웹 검증: Network 탭 기준 응답 스키마 준수

## 11. V1 대비 변경 요약
- 공통 흐름을 명시적 단계로 분리
- Config Schema 강제 적용 범위를 확대
- 보상 라우팅을 금고 SoT 기준으로 일원화

## 12. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
