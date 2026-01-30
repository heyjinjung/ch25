🗂️ Production DB 시드 데이터 필요 테이블 - 최종 통합본
작성일: 2026-01-30

목적: Local → Production 시드 데이터 동기화 (중복 제거 완료)

📊 전체 요약
카테고리	테이블 수	데이터 건수	우선순위
🔴 HIGH (즉시 필요)	5개	21건	게임/미션/어드민 핵심
🟡 MEDIUM (기능 완성)	5개	54건	룰렛 확장/세그먼트
🟢 LOW (선택적)	3개	15건	시스템 설정/메시지
총계	13개	90건	-
🔴 HIGH Priority - 즉시 배포 필요 (5개 테이블, 21건)
1. 게임 설정 (3개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
v2_dice_config	1	0	+1	✅	다이스 게임 티켓당 보상 설정
v2_lottery_config	1	0	+1	✅	복권 게임 기본 설정
v2_lottery_prize	7	0	+7	✅	복권 1~7등급 상금 테이블
소계: 9건

2. 미션 (1개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
mission	9	0	+9	✅	데일리/위클리 미션 (V1 공용, V2도 사용)
설명:

V2도 app.models.mission.Mission 직접 사용
V1/V2 공용 테이블
소계: 9건

3. 어드민 (1개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
admin_user_profile	3	0	+3	✅	어드민 계정 (로그인 필수)
설명:

V2도 app.models.admin_user_profile 사용
없으면 어드민 로그인 불가
소계: 3건

🔴 HIGH Priority 합계: 5개 테이블, 21건

🟡 MEDIUM Priority - 기능 완성 (5개 테이블, 54건)
1. 룰렛 확장 (2개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
v2_roulette_config	8	4	+4	✅	GOLD_KEY_TICKET 등 추가 티켓 타입
v2_roulette_segment	64	32	+32	✅	추가 티켓 타입용 세그먼트 (8개×4타입)
소계: 36건

2. 세그먼트 규칙 (2개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
v2_segment_rule	5	0	+5	✅	V2 전용 세그먼트 규칙
segment_rule	11	0	+11	❌	V1 공용 세그먼트 (V2는 미사용)
주의:

segment_rule (V1): V2에서는 사용하지 않음
하지만 V1 API 호환성을 위해 시드 필요
소계: 16건

3. 기능 플래그 (1개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
feature_config	5	3	+2	❌	기능 플래그 (V2는 No-op, 항상 활성)
주의:

V2 FeatureService는 No-op (항상 활성)
V1 호환성을 위해 시드 권장
소계: 2건

🟡 MEDIUM Priority 합계: 5개 테이블, 54건

🟢 LOW Priority - 선택적 배포 (3개 테이블, 15건)
1. 시스템 설정 (2개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
feature_schedule	1	0	+1	❌	기능 스케줄 설정
app_ui_config	2	1	+1	✅	UI 설정 (1개 추가)
소계: 2건

2. 운영 메시지 (1개 테이블)
테이블	Local	Prod	필요 건수	V2 사용	설명
v2_admin_message	13	0	+13	✅	V2 운영 메시지 템플릿
소계: 13건

🟢 LOW Priority 합계: 3개 테이블, 15건

✅ 이미 동기화된 테이블 (시드 불필요)
테이블	Local	Prod	상태	설명
v2_level_reward_table	20	20	✅ OK	레벨 보상 테이블
vault_program	1	1	✅ OK	금고 프로그램
⚪ 시드 불필요 테이블 (유저 데이터 또는 빈 테이블)
테이블	사유
user_game_wallet	유저 데이터 (자동 생성)
user_game_wallet_ledger	유저 데이터 (자동 생성)
v2_admin_message_inbox	유저 메시지함 (유저 데이터)
v2_server_config	빈 테이블
v2_ticket_conversion_policy	빈 테이블
모든 로그 테이블 (*_log)	유저 활동 데이터
🚫 V1 폐기 테이블 (Production 시드 불필요)
테이블	사유
dice_config (V1)	V2는 v2_dice_config 사용
roulette_config (V1)	V2는 v2_roulette_config 사용
roulette_segment (V1)	V2는 v2_roulette_segment 사용
lottery_config (V1)	V2는 v2_lottery_config 사용
lottery_prize (V1)	V2는 v2_lottery_prize 사용
📋 배포 순서 권장안
Phase 1: 즉시 배포 (HIGH - 21건)

-- 게임 핵심 설정
INSERT INTO v2_dice_config (1건)
INSERT INTO v2_lottery_config (1건)
INSERT INTO v2_lottery_prize (7건)

-- 미션
INSERT INTO mission (9건)

-- 어드민 계정
INSERT INTO admin_user_profile (3건)
배포 후 즉시 확인:

다이스/복권 게임 정상 동작
미션 API 정상 응답
어드민 로그인 가능
Phase 2: 기능 완성 (MEDIUM - 54건)

-- 룰렛 확장
INSERT INTO v2_roulette_config (4건 추가)
INSERT INTO v2_roulette_segment (32건 추가)

-- 세그먼트
INSERT INTO v2_segment_rule (5건)
INSERT INTO segment_rule (11건)  -- V1 호환

-- 기능 플래그
INSERT INTO feature_config (2건 추가)
배포 후 확인:

룰렛 GOLD_KEY_TICKET 정상 동작
세그먼트 규칙 적용 확인
Phase 3: 선택적 배포 (LOW - 15건)

-- 시스템 설정
INSERT INTO feature_schedule (1건)
INSERT INTO app_ui_config (1건)

-- 운영 메시지
INSERT INTO v2_admin_message (13건)
🎯 최종 통합 체크리스트
#	테이블	건수	우선순위	V2 사용	V1 공용	카테고리
1	v2_dice_config	1	🔴 HIGH	✅	❌	게임
2	v2_lottery_config	1	🔴 HIGH	✅	❌	게임
3	v2_lottery_prize	7	🔴 HIGH	✅	❌	게임
4	mission	9	🔴 HIGH	✅	✅	미션
5	admin_user_profile	3	🔴 HIGH	✅	✅	어드민
6	v2_roulette_config	+4	🟡 MEDIUM	✅	❌	게임
7	v2_roulette_segment	+32	🟡 MEDIUM	✅	❌	게임
8	v2_segment_rule	5	🟡 MEDIUM	✅	❌	세그먼트
9	segment_rule	11	🟡 MEDIUM	❌	✅	세그먼트
10	feature_config	+2	🟡 MEDIUM	❌	✅	시스템
11	feature_schedule	1	🟢 LOW	❌	✅	시스템
12	app_ui_config	+1	🟢 LOW	✅	✅	시스템
13	v2_admin_message	13	🟢 LOW	✅	❌	어드민
총 데이터: 90건 (HIGH: 21건, MEDIUM: 54건, LOW: 15건)

🔧 다음 단계
Alembic Migration 생성

Phase 1 (HIGH): 20260130_2100_seed_core_game_mission_admin.py
Phase 2 (MEDIUM): 20260130_2200_seed_roulette_segment.py
Phase 3 (LOW): 20260130_2300_seed_system_config.py
Production 배포


# SSH 접속
ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147

# Phase 1 배포
docker exec xmas-backend alembic upgrade head

# 검증 후 Phase 2, Phase 3 순차 진행
배포 후 검증

게임 API 테스트
미션 API 테스트
어드민 로그인 테스트
작성자: DevOps Team

검증 완료일: 2026-01-30

다음 리뷰: Phase 1 배포 후