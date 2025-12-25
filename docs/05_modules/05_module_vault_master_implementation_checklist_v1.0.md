# Vault(금고) Phase 1 구현 체크리스트

- 문서 타입: 체크리스트
- 버전: v1.9
- 작성일: 2025-12-25
- 작성자: BE팀
- 대상 독자: 백엔드/프론트엔드 개발자, QA, 운영

## 1. 목적/범위/용어
- 목적: `05_module_vault_master_final_trial_ticket_v2.2.md`의 설계·정책을 실제 코드/플래그/테스트에 반영하기 위한 실행 체크리스트를 제공한다. 현 레포 구현(locked 단일 기준, 24h 만료, free fill 1회, deposit 해금)을 보존하면서 확장을 검증한다.
- 범위: Phase 1(Reset) 구현 + 체험티켓 결과 적립 연결 + ticket=0 경험 동기화. Phase 2/3 확장은 제외하고 가드레일 수준만 언급.
- 용어: locked/available/expired, expires_at, recommended_action, VaultEarnEvent(earn_event_id/earn_type/amount/source/reward_kind), trial_reward_valuation 맵.

## 2. 선행 준비(플래그/설정/데이터)
- [x] `enable_trial_payout_to_vault` 플래그 기본값 false로 추가(환경/설정 레이어).
- [x] `trial_reward_valuation` 맵(게임별 reward_id → 금액) 정의 후 기본값 비어있는 상태로 배포(미정의 보상은 적립 SKIP을 기본값으로 확인).
- [x] ticket0 카피/CTA 운영 API(`/api/admin/ui-copy/ticket0`)에 금고 메시지 템플릿 등록(OPEN_VAULT_MODAL 시 금액/조건 변수 포함 확인).
- [x] Vault UI unlock rule JSON을 운영이 편집 가능하도록 admin 입력 경로 추가: `/api/admin/vault-programs/{program_key}/unlock-rules` (응답 스키마 버전 표기 포함).
- [x] 일일/주간 trial 지급 캡 설정(`trial_weekly_cap`, `trial_daily_cap`, `tiered_grant_enabled`, `enable_trial_grant_auto`) 값 정리.
- [x] 12/25~12/27 Vault 적립 2배 플래그/환경변수 설정: `VAULT_ACCRUAL_MULTIPLIER_ENABLED`, `VAULT_ACCRUAL_MULTIPLIER_VALUE`, `VAULT_ACCRUAL_MULTIPLIER_START_KST`, `VAULT_ACCRUAL_MULTIPLIER_END_KST`(기본 OFF). 기간은 KST 기준이며 종료/플래그 OFF 시 자동 1.0 복귀.
- [x] unlock_rules_json에 Gold 인출율(30/50/70), Diamond 해금 조건(Diamond Key ≥ 2 + Gold 누적 ≥ 1,000,000), 시드 이월 범위(10~30%, 기본 20%) 값을 운영이 수정 가능하도록 설정 저장 위치/포맷 확정.
- [x] downtime/배너 일정(12/28, 12/31, 1/5) 및 12/31 백업/초기화 스크립트 경로 확정.
	- 배너 저장소: `ui_config` 키 `downtime_banner` (FE: 상단 배너, 활성 구간에만 노출)
	- 운영 설정 API: `PUT /admin/api/ui-config/downtime_banner`
		- 요청 바디는 `{ "value": ... }` 래핑이 필요함 (UiConfigUpsertRequest)
		- 예시(시간은 운영 확정 값으로 수정):
			- `{ "value": { "enabled": true, "windows": [
					{"start_kst":"2025-12-28T00:00:00+09:00","end_kst":"2025-12-28T02:00:00+09:00","message":"12/28 00:00~02:00 점검 예정입니다."},
					{"start_kst":"2025-12-31T00:00:00+09:00","end_kst":"2025-12-31T02:00:00+09:00","message":"12/31 00:00~02:00 점검 예정입니다."},
					{"start_kst":"2026-01-05T00:00:00+09:00","end_kst":"2026-01-05T02:00:00+09:00","message":"1/5 00:00~02:00 점검 예정입니다."}
				] } }`
	- 확인 API: `GET /api/ui-config/downtime_banner`
	- 백업/초기화:
		- 백업 스크립트: `scripts/backup.sh` (기본 경로: `/root/backups/xmas-event`)
		- 초기화 SQL(파괴적 TRUNCATE): `scripts/reset_post_season.sql`
		- 통합 실행 스크립트(백업 → 초기화): `scripts/xmas_2025_12_31_backup_and_reset.sh`

## 3. 백엔드 구현 체크리스트
- [x] 비용 소모 + 결과 확정 지점에 VaultEarnEvent 생성/호출 연결(게임별 결과 핸들러 기준). 기존 로그/보상 파이프라인과 중복 호출되지 않는지 확인.
- [x] earn_event_id 생성 규칙 확정(게임 결과 ID 기반) 후 멱등 삽입/검증 구현(존재 시 SKIP, 금액 증분 없음 확인).
- [x] VaultEarnEvent 로깅 스키마 추가: earn_event_id, earn_type, amount, source, reward_kind, game_type, token_type, payout_raw, created_at(인덱스와 UNIQUE 제약 포함).
- [x] 적립 단위 적용: 기본 +200/판, DICE LOSE 추가 +100, amount 합산 뒤 vault_locked_balance 증가.
- [x] 해금 임계금액(10,000원) 도달 시 expires_at = now +24h 세팅, 이후 적립 시 갱신 금지(Fixed Window). 해금/만료 후 다시 도달 시 신규 세팅.
- [x] trial 결과 적립: trial-play 식별을 위해 `trial_token_bucket`(trial-origin 토큰 잔량) 추가 후, trial 소비 플레이에서만 reward를 Vault로 라우팅(플래그 `enable_trial_payout_to_vault`). POINT는 reward_amount를 그대로 적립, 그 외는 `trial_reward_valuation` 맵으로 환산. 미환산/비금액형은 0-amount SKIP 이벤트로 로깅.
- [x] ticket=0 recommended_action/cta_payload 유지: `GET /api/vault/status`에서 (ticket=0 && 미만료 locked>0)일 때만 `recommended_action=OPEN_VAULT_MODAL` + `cta_payload` 반환(상태 조회는 자동 시드 없음 유지).
- [x] free fill once(POST /api/vault/fill) 멱등/1회 제한 확인, locked/mirror 동기화 검증(기존 로직에 earn_event_id 연동 안 함 확인).
- [x] 해금 트리거: 입금 증가 신호→locked 감소+cash 지급 로직 재확인(부분/전액 정책은 현행 유지). AdminExternalRankingService → VaultService 위임 경로에 부수 효과 없는지 확인.
- [x] Admin tick helper(`/admin/api/vault2/tick`)가 earn_event_id 멱등과 충돌하지 않는지 검사(보정 작업 시 중복 적립 방지).
- [x] Unlock rule JSON 반환(`/api/vault/status` 응답) 형식 확정(스키마 버전 포함) 및 프론트 하드코딩 제거 계획 반영(프론트 캐싱/버전 호환성 포함). Gold 인출율(30/50/70), Diamond 해금 조건(Key/1,000,000), 시드 이월 10~30% 범위를 포함.
- [x] 12/25~12/27 전용 accrual multiplier 적용 로직 추가 및 `/api/vault/status`에 `accrual_multiplier` 노출, 기간 종료/플래그 OFF 시 즉시 1.0 복귀.

## 4. DB/마이그레이션
- [x] VaultEarnEvent 로그 테이블 추가 및 인덱스/UNIQUE 적용(earn_event_id UNIQUE, user_id+created_at 인덱스).
- [x] trial-play 식별을 위한 `trial_token_bucket` 테이블 추가(사용자/토큰별 trial-origin 잔량).
- [x] trial_reward_valuation 설정을 위한 KV/JSON 보관 위치 확정(VaultProgram.config_json) 및 접근 경로 구현(운영 변경 시 핫 리로드 지원).
- [x] 기존 user 테이블 컬럼(vault_locked_balance, vault_balance, vault_locked_expires_at) 값 초기 상태 점검 및 기본값 확인(마이그레이션 시 기존 데이터 보존: COALESCE/backfill 확인됨).
- [x] unlock_rules_json 값 저장/캐싱 위치 정의(VaultProgram 테이블, admin API).
- [x] vault_accrual_multiplier 설정 저장소(VaultProgram.config_json)와 유효 기간 필드(시작/종료 시각) 정의.

## 5. 프론트엔드 연동 체크리스트
- [x] `GET /api/vault/status` 응답 필드(locked_balance, available_balance, expires_at, recommended_action, cta_payload, unlock_rules_json) 최신 스펙 반영(캐시/스테일 데이터 여부 점검).
- [x] 홈 배너/티켓0 패널/모달에서 "다음 해금 조건" 문구를 unlock_rules_json 기반으로 노출(하드코딩 제거, fallback 카피 정의).
- [x] ticket=0 진입 시 Vault Modal 자동 오픈 여부 플래그 점검, 중복 오픈 방지(홈 배너/패널 중복 노출 UX 확인).
- [x] 체험티켓 플레이 후 금고 적립 알림/스낵바 UI 추가 여부 결정 및 텍스트 정렬(금액 포맷/시간대 일관성 확인).
- [x] 만료(expired) 상태 시 손실 메시지/다음 행동 CTA 노출 확인(중복 만료 토스트 방지, 홈/모달 메시지 정합성).
- [x] 모든 고가/금액형 보상(10,000포인트 이상, Gold/Diamond 해금, 시드 지급, 시즌패스 10레벨 보상)에 "관리자 지급" 라벨 고정, 자동 수령/정산 버튼 제거.
- [x] 시즌패스 10레벨 보상 카드에 Diamond Key/시드 30,000/XP 부스터 강조 + 관리자 지급 문구 병기.
- [x] Ticket Zero 모달 카피: “10레벨만 달성 시 Diamond Key 확정” CTA 및 unlock_rules_json 조건과 일치하는 텍스트 확인.
- [x] 12/25~12/27 2배 적립 기간 배지/타이머 노출 여부 결정 및 UX 확인(기간 종료 후 숨김).

## 6. QA/테스트 시나리오
- [x] 단판 적립: 비용 소모 + 결과 확정 시 locked +200 적용, LOSE 시 +100 추가 검증.
- [x] 멱등: 동일 earn_event_id 중복 호출 시 1회만 적립(로그에서 SKIP 확인).
- [x] trial 결과: reward_id 맵 없음 → 적립 SKIP(0-amount 로그), 맵 존재 → locked 적립; 플래그 OFF 시 적립 안 됨 확인(RewardService 분기 중복 지급 여부 확인).
- [x] 만료: 최초 적립 후 24h 경과 시 locked=0, expired 상태 전달 확인(타이머 갱신 없음, 현 만료 잡/쿼리와 충돌 없는지 확인).
- [x] 해금: 입금 증가 신호 → locked 감소+cash 증가, unlock_rules_json 표시와 카피 일치 확인.
- [x] ticket=0 흐름(서버): ticket=0 + 미만료 locked>0 → `recommended_action=OPEN_VAULT_MODAL` + `cta_payload` 반환(단위 테스트로 검증).
- [x] 회귀: free fill 1회 제한, vault_balance mirror 동기화, Admin tick 호출 시 상태 깨짐 없는지 확인(earn_event_id와 독립적이어야 함).
- [x] 12/25~12/27 2배 기간: multiplier=2.0 적용 확인, 기간 종료/플래그 OFF 시 1.0 복귀(단위 테스트로 고정).
- [x] (서버) unlock_rules_json 값 검증: Gold 인출율 30/50/70, Diamond 조건(Key≥2 + 1,000,000), 시드 이월 10~30% 범위 반환(단위 테스트로 고정).
- [x] (FE) unlock_rules_json 기반 렌더링 값과 카피/표시 일치 확인.
- [x] "관리자 지급" 라벨 노출 회귀: Gold/Diamond/시드/고액 보상 및 시즌패스 10레벨 카드에 모두 표시, 자동 수령 버튼 미노출 확인.
- [x] Ticket Zero 모달 카피/CTA가 “10레벨만 달성 시 Diamond Key 확정”으로 표준화되어 있는지 확인.
- [x] downtime 배너 일정(12/28, 12/31, 1/5) 노출/교체, 12/31 백업/초기화 절차 실행 여부 확인.

## 7. 관측/알림
- [x] 적립/스킵/만료/해금 로그 대시보드 쿼리 정의(earn_event_id 기준, user_id 파티션 포함). 
- [x] trial 적립 SKIP 사유(valuation 없음/amount<=0/reward_kind 누락) 집계 메트릭 추가(알림 임계값 설정 여부 판단).
- [x] expires_at 임박/만료 이벤트 알림(옵스/슬랙) 필요 여부 결정.
- [x] 12/25~12/27 multiplier ON/OFF 이벤트, unlock_rules_json 변경, downtime 배너 교체 로그 관측 경로 정의.

## 8. 롤백/가드레일
- [x] 플래그로 trial 적립 기능 즉시 중단 가능하도록 구현(OFF 시 기존 흐름만 유지).
- [x] VaultEarnEvent 로그가 적립 전에 생성되었다면 롤백 시 로그만 남기고 금고 잔액 조정 여부 결정.
- [x] unlock_rules_json/카피를 이전 하드코딩 값으로 되돌리는 절차 준비.
- [x] vault_accrual_multiplier를 1.0으로 되돌리는 즉시 가드 마련(플래그 OFF/기간 종료 시), 적용 이력 로그 확인.

## 9. 현행 구현 충돌 방지/정합성 체크
- [x] VaultService.get_status()가 자동 시드를 하지 않는 현행 동작 유지 확인(상태 조회 시 잔액 변동 없음).
- [x] VaultService.fill_free_once()가 earn_event_id를 쓰지 않으며 기존 멱등/1회 정책을 변경하지 않는지 확인.
- [x] AdminExternalRankingService.upsert_many() → VaultService.handle_deposit_increase_signal() 경로에 신규 earn_event 연동 시 중복 해금/적립이 없는지 검증.
- [x] vault_balance mirror 갱신이 모든 적립/해금 흐름에서 여전히 수행되는지 회귀 확인.
- [x] `GET /api/ui-copy/ticket0`와 Vault status 응답이 서로 다른 캐시 TTL을 갖는 경우 UX 이슈(금액/카피 불일치) 없는지 확인.
- [x] 만료(locked→expired) 잡/쿼리가 earn_event_id 로그 생성 없이 동작해야 함을 재확인.
- [x] 현 UI 컴포넌트(TicketZeroPanel, VaultModal, HomePage 배너)에서 추가 필드(unlock_rules_json 등) 수신 시 런타임 에러 없는지 스냅샷 테스트.
- [x] v1 경제 정책(available_balance=mirror/cash 지급 유지)과 Phase 1 설계가 충돌하지 않는지 PM/BE 합의 기록.
- [x] downtime 배너 교체 스케줄(12/28, 12/31, 1/5) 및 12/31 백업/초기화 작업이 다른 배포/플래그와 충돌하지 않는지 확인.

## 10. 변경 이력
- v2.8 (2025-12-25, Full Stack): 금고 대상자(Eligibility) 전면 확대 및 어드민 풀스택 구축. `NewMember` 타겟에서 "로그인한 모든 유저"로 적립 대상을 확장하였으며, 어드민 전용 금고 관리 페이지(지표, 규칙, 카피, 설정 JSON 에디터)를 신규 구축하여 운영 효율성을 극대화함.
- v2.7 (2025-12-25, BE팀): 롤백 및 안전 장치(Safeguards) 강화. 서비스 레이어에 Kill-Switch 플래그를 완비하고, 모든 적립 로직의 트랜잭션 원자성을 재확인. 어드민 설정 오류 시 시스템 하드코딩 값으로 즉시 복구 가능한 Fallback 로직(`ui_copy_json` 포함) 및 운영 비상 대응 가이드(`docs/06_ops/vault_contingency_plan.md`) 작성 완료.
- v2.6 (2025-12-25, BE팀): 운영 관측성(Observability) 강화. AdminAuditLog 테이블 및 AuditService 추가하여 설정 변경 이력 추적. 실시간 Discord/Slack 알림(Missing Valuation SKIP) 및 어드민 통계 API(/stats) 구현 완료.
- v2.5 (2025-12-25, Full Stack): Vault Phase 1 전체 연동 검증 및 QA 항목 마감. 멱등(Duplicate Skip), 해금(Deposit Unlock), 고액 보상 관리자 지급 라벨, 점검 배너 스케줄링 및 백업 스크립트 정합성 확인 완료.
- v2.4 (2025-12-25, BE팀): 금고 만료 정책을 Milestone(10,000원) 기반 Fixed Window로 정교화. 적립액이 1만 원 미만일 때는 타이머가 작동하지 않으며, 1만 원 도달 시 24시간 타이머가 고정(Fixed)됩니다. 해금 후 잔액이 1만 원 미만으로 떨어지면 타이머가 해제되어 다음 사이클을 준비합니다.
- v2.3 (2025-12-25, BE팀): 금고 적립(accrual) 로직 개선 및 만료(expiration) 단위 테스트 보강. 게임 플레이 시마다 locked 만료 시간을 갱신(`_ensure_locked_expiry` 내 갱신 로직 추가)하여 UX 개선(사용자 활동 시 만료 연장). 단위 검증 완료. (v2.4에서 Fixed Window 정책으로 최종 확정 및 수정됨)
- v2.2 (2025-12-25, Full Stack): 게임 플레이(체험티켓) 후 금고 적립 알림(Toast) 구현. BE 응답에 `vault_earn` 필드 추가 및 FE 훅 연동.
- v2.1 (2025-12-25, FE팀): Vault 및 SeasonPass UI 대규모 업데이트. 동적 해금 규칙(unlock_rules_json) 연동, 2배 적립 배지 추가, Ticket Zero 모달 자동화 및 'Diamon Key 확정' CTA 강화. 시즌패스 10레벨 Final Reward 스타일링 및 고액 보상 '관리자 지급' 강제 적용.
- v2.0 (2025-12-25, BE팀): DB 마이그레이션(`20251225_0005`) 적용 및 VaultProgram.config_json 저장소 구현 완료. trial valuation/multiplier 설정 경로 확정.
- v1.9 (2025-12-25, BE팀): accrual multiplier를 Vault 적립 전 구간에 적용(게임 적립/Trial payout 포함)하고 `unlock_rules_json` 필드 포함을 단위 테스트로 고정. free fill once(1회 제한/동기화/earn_event 미생성), deposit unlock 위임 경로, Vault2 tick(전이 helper) 비침범(earn_event_id와 독립) 검증을 체크리스트 [x]로 마감.
- v1.8 (2025-12-25, BE팀): `GET /api/vault/status`에 ticket=0 연동(`recommended_action=OPEN_VAULT_MODAL`) 구현. 조건은 (ticket=0 && 미만료 locked>0)일 때만 반환하며 `cta_payload.reason=TICKET_ZERO` 포함. 단위 테스트 추가. 테스트 실행은 `python -m pytest`로 고정(환경에서 테스트 러너가 0 tests로 잡히는 이슈 우회).
- v1.7 (2025-12-25, BE팀): trial-play 식별용 `trial_token_bucket` 추가 및 토큰 소비 시 `consumed_trial` 판별. 플래그 `ENABLE_TRIAL_PAYOUT_TO_VAULT` ON 시 trial 소비 플레이의 reward를 Vault로 라우팅(POINT 직접 적립, 그 외 valuation 맵 환산, 미환산은 0-amount SKIP 이벤트 로깅). 단위 테스트 추가.
- v1.6 (2025-12-25, BE팀): VaultEarnEvent(멱등) 테이블 추가 및 게임 결과 확정 시(룰렛/주사위/복권 play commit 직후) locked +200 적립 연결. DICE LOSE는 추가 +100. 기본값은 플래그 OFF(`ENABLE_VAULT_GAME_EARN_EVENTS`)로 운영 안전 롤아웃.
- v1.5 (2025-12-25, BE팀): downtime 배너를 `ui_config` 키 `downtime_banner`로 운영 가능하도록 경로 확정(프론트 상단 배너 노출). 12/31 백업(`scripts/backup.sh`) + 초기화(`scripts/reset_post_season.sql`)를 묶은 안전 실행 스크립트(`scripts/xmas_2025_12_31_backup_and_reset.sh`) 추가.
- v1.4 (2025-12-25, BE팀): trial 설정 플래그/캡(`ENABLE_TRIAL_GRANT_AUTO`, `TRIAL_DAILY_CAP`, `TRIAL_WEEKLY_CAP`, `TIERED_GRANT_ENABLED`, `ENABLE_TRIAL_PAYOUT_TO_VAULT`, `TRIAL_REWARD_VALUATION`) 추가 및 TrialGrantService에 auto/cap 반영. VaultProgram 운영 편집 API(`/api/admin/vault-programs/*`) 추가, `GET /api/vault/status`가 DB `unlock_rules_json` 오버라이드(merge) 우선 사용.
- v1.3 (2025-12-25, BE팀): `VAULT_ACCRUAL_MULTIPLIER_*` 환경변수(기본 OFF) 추가, `GET /api/vault/status`에 `accrual_multiplier` 노출, `unlock_rules_json`에 Gold(30/50/70)·Diamond(Key≥2+Gold≥1,000,000)·시드 이월(10~30%, 기본20) 규격 포함. `POST /api/vault/fill`/신규 주사위 LOSE 적립에 multiplier 적용. FE `vaultApi` 타입에 `accrualMultiplier` 수용.
- v1.2 (2025-12-25, BE팀): 12/25~27 2배 적립 플래그, unlock_rules_json(30/50/70·Key+1,000,000·시드 10~30%), 관리자 지급 라벨/티켓0 카피, downtime/백업 일정 체크 추가
- v1.1 (2025-12-25, BE팀): 충돌 방지/정합성 체크 추가, 세부 가드 및 옵스 플래그 보강
- v1.0 (2025-12-25, BE팀): 초기 작성

금고 사용 흐름 (유저 시점, 쉽게)

금고가 켜지는 시점(기존 유저)
시즌 패스 레벨 3 도달, 팀 배틀 3회 이상, 최근 7일 5판 이상 플레이, 또는 티켓 0 + 이탈 징후 중 하나라도 만족하면 금고가 생깁니다.
Phase 1에서는 더 단순히 “게임 결과 확정 시 적립” + “티켓 0이면 금고 모달 노출”로 시작합니다.
게임할 때 자동 적립
티켓 쓰고 게임 결과가 확정되면 금고(locked)에 쌓여요.
한 판 기본 +200원, 지면 +100원 추가.
적립액이 해금 임계금액에 딱 닿으면 24시간 타이머가 켜집니다. 단계는 1만 원 → 2만 원 → 3만 원(설정 확장 가능). 더 쌓여도 타이머는 다시 안 늘어납니다.
티켓 0개일 때 안내
티켓이 바닥나면 금고 모달이 자동으로 뜨고, “금고에 묶여 있는 금액”과 “얼마 더 하면 풀린다” 같은 해금 조건을 보여줍니다(unlock_rules_json 기반).
체험티켓 관련 기능(지급/보상 적립/멱등 등)은 2026-02까지 전부 보류 상태입니다.
해금(출금)
예치/충전 증가 신호가 오면 금고에서 일부/전액이 풀립니다.
“얼마 더 넣으면 얼마 풀림” 조건은 계속 화면에 표시됩니다.
풀린 금액은 게임 내에서 자동 지급되지 않고, 운영/관리자가 외부에서 수동 지급합니다(XP·게임 티켓·캐시 자동 지급 없음 기준).
만료
해금 임계금액 도달 후 24시간 안에 해금/연장 행동이 없으면 금고 금액은 사라지고 만료로 표시됩니다. 다음 접속 시 손실 안내가 보일 수 있습니다.
앞으로의 확장 로드맵(Phase 2/3)
Phase 2: 만료 연장/보호(PROTECT) 행동을 추가해 만료를 늦출 수 있게 할 예정.
Phase 3: 골드/플래티넘/다이아 3단 UI/정책 레이어로 확장(락인 자산 감각 유지).