# Vault(금고) Phase 1 구현 체크리스트

- 문서 타입: 체크리스트
- 버전: v1.1
- 작성일: 2025-12-25
- 작성자: BE팀
- 대상 독자: 백엔드/프론트엔드 개발자, QA, 운영

## 1. 목적/범위/용어
- 목적: `05_module_vault_master_final_trial_ticket_v2.2.md`의 설계·정책을 실제 코드/플래그/테스트에 반영하기 위한 실행 체크리스트를 제공한다. 현 레포 구현(locked 단일 기준, 24h 만료, free fill 1회, deposit 해금)을 보존하면서 확장을 검증한다.
- 범위: Phase 1(Reset) 구현 + 체험티켓 결과 적립 연결 + ticket=0 경험 동기화. Phase 2/3 확장은 제외하고 가드레일 수준만 언급.
- 용어: locked/available/expired, expires_at, recommended_action, VaultEarnEvent(earn_event_id/earn_type/amount/source/reward_kind), trial_reward_valuation 맵.

## 2. 선행 준비(플래그/설정/데이터)
- [ ] `enable_trial_payout_to_vault` 플래그 기본값 false로 추가(환경/설정 레이어).
- [ ] `trial_reward_valuation` 맵(게임별 reward_id → 금액) 정의 후 기본값 비어있는 상태로 배포(미정의 보상은 적립 SKIP을 기본값으로 확인).
- [ ] ticket0 카피/CTA 운영 API(`/api/admin/ui-copy/ticket0`)에 금고 메시지 템플릿 등록(OPEN_VAULT_MODAL 시 금액/조건 변수 포함 확인).
- [ ] Vault UI unlock rule JSON을 운영이 편집 가능하도록 설정 파일 또는 admin 입력 경로 점검(응답 스키마 버전 표기 포함).
- [ ] 일일/주간 trial 지급 캡 설정(`trial_weekly_cap`, `daily_cap`, `tiered_grant_enabled`, `enable_trial_grant_auto`) 값 정리.

## 3. 백엔드 구현 체크리스트
- [ ] 비용 소모 + 결과 확정 지점에 VaultEarnEvent 생성/호출 연결(게임별 결과 핸들러 기준). 기존 로그/보상 파이프라인과 중복 호출되지 않는지 확인.
- [ ] earn_event_id 생성 규칙 확정(게임 결과 ID 기반) 후 멱등 삽입/검증 구현(존재 시 SKIP 로그 남기고 금액 증분 없음 확인).
- [ ] VaultEarnEvent 로깅 스키마 추가: earn_event_id, earn_type, amount, source, reward_kind, game_type, token_type, payout_raw, created_at(인덱스와 UNIQUE 제약 포함) 및 기존 vault2 필드와 충돌 여부 확인.
- [ ] 적립 단위 적용: 기본 +200/판, LOSE 추가 +100/패, amount 합산 뒤 vault_locked_balance 증가(소수점/통화 단위 변환 오류 없는지 확인).
- [ ] 최초 적립 시 expires_at = now +24h 세팅, 이후 적립 시 갱신 금지(Phase 1 규칙 고정). 현행 24h 만료 스케줄러/크론과 충돌 여부 점검.
- [ ] trial 결과 적립: reward_kind 금액형만 환산→적립, 미환산/비금액형은 SKIP 로그; 플래그(`enable_trial_payout_to_vault`)로 롤아웃 가드. 현 `RewardService.deliver()` 분기(게임 지갑/캐시)와 중복 지급되지 않는지 확인.
- [ ] ticket=0 recommended_action/cta_payload 유지: VaultService.get_status()에서 OPEN_VAULT_MODAL 반환 확인(자동 시드 없음 유지).
- [ ] free fill once(POST /api/vault/fill) 멱등/1회 제한 확인, locked/mirror 동기화 검증(기존 로직에 earn_event_id 연동 안 함 확인).
- [ ] 해금 트리거: 입금 증가 신호→locked 감소, 지급은 운영/외부 수동으로 처리(자동 cash/코인 지급 비활성). AdminExternalRankingService → VaultService 위임 경로에 부수 효과 없는지 확인.
- [ ] 해금 지급 경로 확정: 현 경제가 XP·게임 티켓 중심이면 지급 수단을 **운영/관리자 수동 또는 외부 지급(자동 없음)** 으로 고정하고, RewardService 자동 분기(현금/코인)를 비활성/스킵 가드 추가.
- [ ] Admin tick helper(`/admin/api/vault2/tick`)가 earn_event_id 멱등과 충돌하지 않는지 검사(보정 작업 시 중복 적립 방지).
- [ ] Unlock rule JSON 반환(`/api/vault/status` 응답) 형식 결정 및 프론트 하드코딩 제거 계획 반영(프론트 캐싱/버전 호환성 포함).

## 4. DB/마이그레이션
- [ ] VaultEarnEvent 로그 테이블 또는 vault2 확장 필드에 earn_event_id/earn_type/amount/created_at 추가(인덱스: user_id, earn_event_id UNIQUE 권장).
- [ ] trial_reward_valuation 설정을 위한 KV/JSON 보관 위치 확정(환경 변수, 설정 테이블 등) 및 접근 경로 구현(운영 변경 시 핫 리로드 필요 여부 결정).
- [ ] 기존 user 테이블 컬럼(vault_locked_balance, vault_balance, vault_locked_expires_at) 값 초기 상태 점검 및 기본값 확인(마이그레이션 시 기존 데이터 보존 여부 확인).

## 5. 프론트엔드 연동 체크리스트
- [ ] `GET /api/vault/status` 응답 필드(locked_balance, available_balance, expires_at, recommended_action, cta_payload, unlock_rules_json) 최신 스펙 반영(캐시/스테일 데이터 여부 점검).
- [ ] 홈 배너/티켓0 패널/모달에서 "다음 해금 조건" 문구를 unlock_rules_json 기반으로 노출(하드코딩 제거, fallback 카피 정의).
- [ ] 해금 지급 수단 UI/카피를 운영/외부 수동 지급 기준으로 고정하고, 경제 변경 시 업데이트 플래그/버전 관리(잘못된 자동 지급 기대감 방지).
- [ ] ticket=0 진입 시 Vault Modal 자동 오픈 여부 플래그 점검, 중복 오픈 방지(홈 배너/패널 중복 노출 UX 확인).
- [ ] 체험티켓 플레이 후 금고 적립 알림/스낵바 UI 추가 여부 결정 및 텍스트 정렬(금액 포맷/시간대 일관성 확인).
- [ ] 만료(expired) 상태 시 손실 메시지/다음 행동 CTA 노출 확인(중복 만료 토스트 방지, 홈/모달 메시지 정합성).

## 6. QA/테스트 시나리오
- [ ] 단판 적립: 비용 소모 + 결과 확정 시 locked +200 적용, LOSE 시 +100 추가 검증.
- [ ] 멱등: 동일 earn_event_id 중복 호출 시 1회만 적립(로그에서 SKIP 확인).
- [ ] trial 결과: reward_id 맵 없음 → 적립 SKIP, 맵 존재 → locked 적립; 플래그 OFF 시 적립 안 됨 확인(RewardService 분기 중복 지급 여부 확인).
- [ ] 만료: 최초 적립 후 24h 경과 시 locked=0, expired 상태 전달 확인(타이머 갱신 없음, 현 만료 잡/쿼리와 충돌 없는지 확인).
- [ ] 해금: 입금 증가 신호 → locked 감소, 지급은 운영/외부 수동(자동 지급 없음)임을 확인하고 unlock_rules_json 표시와 카피 일치 확인.
- [ ] 지급 경로: 해금 시 실제 지급이 수동/외부(TBD)로 처리되는지 또는 RewardService 분기 비활성화 되었는지 확인(자동 지급 오동작 방지).
- [ ] ticket=0 흐름: recommended_action=OPEN_VAULT_MODAL + cta_payload 연결, 모달 카피/금액 표기 일치.
- [ ] 회귀: free fill 1회 제한, vault_balance mirror 동기화, Admin tick 호출 시 상태 깨짐 없는지 확인(earn_event_id와 독립적이어야 함).

## 7. 관측/알림
- [ ] 적립/스킵/만료/해금 로그 대시보드 쿼리 정의(earn_event_id 기준, user_id 파티션 포함). 
- [ ] trial 적립 SKIP 사유(valuation 없음/amount<=0/reward_kind 누락) 집계 메트릭 추가(알림 임계값 설정 여부 판단).
- [ ] expires_at 임박/만료 이벤트 알림(옵스/슬랙) 필요 여부 결정.

## 8. 롤백/가드레일
- [ ] 플래그로 trial 적립 기능 즉시 중단 가능하도록 구현(OFF 시 기존 흐름만 유지).
- [ ] VaultEarnEvent 로그가 적립 전에 생성되었다면 롤백 시 로그만 남기고 금고 잔액 조정 여부 결정.
- [ ] unlock_rules_json/카피를 이전 하드코딩 값으로 되돌리는 절차 준비.

## 9. 현행 구현 충돌 방지/정합성 체크
- [ ] VaultService.get_status()가 자동 시드를 하지 않는 현행 동작 유지 확인(상태 조회 시 잔액 변동 없음).
- [ ] VaultService.fill_free_once()가 earn_event_id를 쓰지 않으며 기존 멱등/1회 정책을 변경하지 않는지 확인.
- [ ] AdminExternalRankingService.upsert_many() → VaultService.handle_deposit_increase_signal() 경로에 신규 earn_event 연동 시 중복 해금/적립이 없는지 검증.
- [ ] vault_balance mirror 갱신이 모든 적립/해금 흐름에서 여전히 수행되는지 회귀 확인.
- [ ] `GET /api/ui-copy/ticket0`와 Vault status 응답이 서로 다른 캐시 TTL을 갖는 경우 UX 이슈(금액/카피 불일치) 없는지 확인.
- [ ] 만료(locked→expired) 잡/쿼리가 earn_event_id 로그 생성 없이 동작해야 함을 재확인.
- [ ] 현 UI 컴포넌트(TicketZeroPanel, VaultModal, HomePage 배너)에서 추가 필드(unlock_rules_json 등) 수신 시 런타임 에러 없는지 스냅샷 테스트.
- [ ] v1 경제 정책(available_balance=mirror/cash 지급 유지)과 Phase 1 설계가 충돌하지 않는지 PM/BE 합의 기록.

## 10. 변경 이력
- v1.1 (2025-12-25, BE팀): 충돌 방지/정합성 체크 추가, 세부 가드 및 옵스 플래그 보강
- v1.0 (2025-12-25, BE팀): 초기 작성
