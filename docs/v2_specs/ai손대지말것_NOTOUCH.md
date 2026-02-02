✅  학습 완료 - 현재 상황 분석
🔴 핵심 문제점
1. User ↔ V2User 이중 테이블 구조

user 테이블 (V1): 금고 SoT (vault_locked_balance), 레거시 데이터
v2_user 테이블 (V2): cc_id 기반 인증, V2 전용 기능
정책: "V2 Native 단일 SoT" 원칙이나, 금고는 user.vault_locked_balance가 SoT
이제 전체 비교표를 정리합니다:

시드누락 문제해결 

✅ 어드민 프론트에서 사이드바 메뉴가 성격과 카테고리가 다 제각각이야
스타일은 유지하되 체계적으로 개편해줘

✅ 사이드바에서 영어 표현 다 빼

✅ 모든게임 플레이 버튼은 가능하나
그 후 게임이 직접 진행되거나
결과가 표시되거나
티켓이 차감되어야 하는 모든 과정이 다 정지상태야 
ㄴ 에러트리아지 20260130 019번 에러
추가 마이그레이션 파일 생성 / 적용 

✅ Get Started with Sentry Issues
Your code sleuth eagerly awaits its first mission.
Set up the Sentry SDK for 

Your Source for Log-ical Data
It's about time we offered something a bit more robust than breadcrumbs. With logs, you'll be able to have a lot more control and context over all your data.

✅유저 닉네임 수정할수 있게 해야해! 

✅ 입금내역이 금고출금조건 모달에는 잡히나
레벨 xp 반영이 안되고 있음 
1-1) 주간 CC 입금 3회
이벤트 미션을 달성하고 보상받기 \
ㄴ 주간입금 체크되는거 확인
ㄴ 레벨 변경 된거 확인
ㄴ 그런데 레벨페이지에서 닉네임 조회 안되고
ㄴ 입금페이이지에서 작업로그 시간 갱신 안됨 / 추가수정 


✅ 복권모음 달성시 골드키 1개 지급 기능 풀스택 구현해야함 

[] 센트리 The transactions dataset is being deprecated. Please use Explore / Traces with the is_transaction:true filter instead. Please read these FAQs for more information.


✅ 2) 신규 다음날 로그인 1일
이벤트 미션을 달성하고 보상받기만 로그인 카운트가 안돼
주간 미션 / 일일미션 로그인 영역은 성공함 

✅ 신규유저 텔레그램 채널2개 입장 미션 프론트앤드 개선

✅ 주사위 게임 골든하워 적용이 안되고 있음 / 골든아워 모달 
수정된 파일들
파일	변경 내용
v2_dice.py	golden_hour_start/end_time 컬럼 추가
event_service.py	v2_dice_config 기반 + is_upcoming 계산
events.py	golden_hour 상세 정보 응답 추가
adminApi.ts	시간 필드 전송 추가
goldenHourApi.ts	새 API 클라이언트
useV2Golden.ts	useGoldenHourStatus 훅 추가
V2AppLayout.tsx	골든아워 모달 연동
GoldenHourModal.tsx	새 모달 컴포넌트

5) 마케팅..효율성
입금 / 환전... 잡을수 있나?? 

✅ 설계 문서: docs/.../golden/20260131_hq_margin_csv_import_design.md
✅ 구현 문서: docs/.../golden/20260131_hq_margin_csv_import_implementation.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_design.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_implementation.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_phase2_4_detailed_design.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_phase2_4_detailed_implementation.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_phase2_ops_dashboard.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_phase3_prospective_users.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_csv_import_phase4_golden_alignment.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\golden\20260131_hq_margin_dashboard_phase2_design.md


✅  #1. 개선사항
 > 회원관리 유저 디테일드로우 > 금고관리에서 내역로그 볼수 있게 해줘
 > 금고현황 페이지를 기준으로 금고 분석을 통합시켜줘 >> 이 떄 FE 구현된 카드컴포넌트 클릭시 모달로 상세내역 볼수 있게 해줘 

✅ 인벤토리 차감내역도 로그에 남게 해야해! 
유저관리 > 유저디테일 > 인벤토리관리 > 내역로그
티켓/인벤토리 메뉴 > 인벤토리 관리 > 내역로그
그리고 애초에 유저가 어떤 게임을 해서
어떤 보상을 얻었는지 그거 확인 할 수 있는 데가 어디있는지도 나한테 알려줘

✅https://cc-jm.com/admin/marketing/messages >> 리텐션요약 하드코딩 데이터 제거 / 백앤드 데이터 라우팅 정립   >> 운영분석 페이지로 이동 
매출탭 삭제 
마케팅성과 > 페이지 삭제  

✅금고내역 로그에
상점에서 상품산 내역은 왜 로그 기록이 안돼?? 
유저디테일드로우 반영되게 해줘 

✅인벤토리/티켓로그 카드컴포넌트 상세화 및 테이블 정렬

✅상점페이지 유엑스 개선 

✅ 연속스트릭모달! - 실제 보상조건 관리 어드민 기능 
그리고 유저 보상 지급 테스트
스트릭 보상 규칙 설정 (지금 3/7일차만 구현되어있음)
연속 출석 일수별 보상 조건 관리
이거 어드민에서 원하는 일자에 원하는 조건으로 편집/수정/기능 작동하게 해줘 

✅CSV Import 한글 헤더 지원 및 Import 오류 수정 | ✅ FIXED |
이거 백앤드 테스트 실행해야하
💡 핵심 요약
구분	목적	비유	담당 파일
GAME_LOG	통계 파악	일일 정산 계산기	
csv_import_service.py
HQ_MARGIN	유저 관리	고객 분류기	
hq_margin_import_service.py

 자동 재관여 메시지 (Re-engagement Queue)
트리거: 세그먼트가 AT_RISK(CHURN_RISK)로 판별되거나, 이탈 확률 점수가 0.7(70%) 이상일 때.
액션: PREDICTIVE_REENGAGEMENT 유형의 개인화 메시지 발송 대기열에 등록됩니다.
채널: 텔레그램 등의 연결된 채널로 복귀 유도 프로모션 메시지가 전송됩니다.
B. 골든 타임 개입 (Intervention Rewards)
유저가 다시 접속해서 게임을 할 때, **위기 상황(돈을 다 잃거나 로그아웃 하려 할 때)**에 시스템이 자동으로 개입합니다.

상황: LOSS_STREAK(연패), ASSET_DEPLETION(잔고 소진), SESSION_END(이탈 감지)
보상: 유저의 **예상 가치(LTV)**에 비레하여 계산된 맞춤형 보상(무료 스핀, 캐시백 등)을 즉시 지급합니다.
계산식: 보상 = LTV × 기본요율(3%) × 이탈확률

 자동 재관여 메시지 (Re-engagement Queue) 구현 방식
"메시지 발송 대기열 등록"까지가 현재 코드의 역할입니다.

구현 위치: app/v2/services/retention_intervention_service.py의 enqueue_reengagement 함수
작동 방식:
유저가 AT_RISK 등의 조건에 해당하면 함수가 호출됩니다.
OpsLogService를 통해 운영 로그(ops_log_entry)를 DB에 생성합니다.
action_code: "OFFER_PERSONALIZED_TRACKED"
meta: 타겟 채널(텔레그램 등), 이탈 확률 등의 정보 포함
발송 실행 (중요): 현재 코드베이스(admin_message_service.py)에는 **"PUSH 기능은 제거됨"**이라는 주석과 함께 직접 발송 로직이 없습니다.
따라서, 실제 텔레그램 메시지 전송은 **이 로그를 모니터링하는 별도의 외부 워커(Worker)**가 수행하거나, 운영자가 대시보드에서 대기열을 보고 수동 승인/발송 처리하는 구조로 설계되어 있습니다.
2. 골든 타임 개입 (Intervention Rewards) 구현 방식
유저가 위기 상황일 때 보상을 계산하는 로직은 파이썬 코드로 완벽히 구현되어 있습니다.

구현 위치: app/v2/services/retention_intervention_service.py의 resolve_intervention 함수
작동 프로세스:
실험군 배정: 유저 ID를 해싱하여 A/B 테스트 그룹(Control, Free Spin, Cashback 등)을 나눕니다.
데이터 조회: V2UserRetentionState 테이블에서 유저의 이탈 확률과 예상 LTV를 가져옵니다.
보상 계산 (수식 구현):
python
# 실제 코드 로직 요약
base_rate = SEGMENT_BASE_RATE.get(segment, 0.02) # 기본 2% ~ 4%
ltv_reward = predicted_ltv * base_rate * max(churn_prob, 0.1) # LTV x 요율 x 이탈확률
final_reward = max(base_reward, int(ltv_reward)) # 최소 보상 보장
스케줄링 & 캡핑: 너무 자주 주지 않도록 RewardScheduler가 빈도를 조절하고, cmax(최대 한도)를 적용하여 과도한 보상을 막습니다.
결과 반환: 최종적으로 "지급 가능 여부(eligible)"와 "얼마(reward_amount)"를 반환하면, 게임 서버가 이를 유저에게 보여줍니다.


✅감사로그??? 정확하게 어떻게 쓰라고 이걸 만든거임?? 

✅ 금고 페이지에서 
총유저수 / 총 잠금잔액 / 총 가용잔액
제재유저 이렇게 카드를 누르면 상세내역모달이 뜨는데
이 떄 뜨는 유저를 클릭하면 그 유저관리 디테일드로우페이지로 갈수 있게 해줘 

✅v2.14 (2026-02-02, Antigravity Agent): 룰렛 체험 티켓(`TRIAL_TICKET`) 일일 제한 강제 및 넛지 서비스 버그 수정 (W05_GAME)
룰렛체험티켓 하루 3번 돌릴수 있는 규칙 있으나 무시되고 계속 돌아감 

✅ MissionCard에서 useToast를 호출하지만, ToastProvider가 컴포넌트 트리에 없어서 throw new Error("useToast must be used within a ToastProvider")가 발생합니다.
해결 방법: V2AppLayout을 ToastProvider로 감싸야 합니다.
V2AppLayout.tsx+1-0
이제 return 부분을 ToastProvider로 감쌉니다:

✅ 레벨페이지 디자인 수정

✅ VERIFY: 체험 티켓 Enum 정의/매핑 근거: 03.game.md:33-40
일일 넛지 대상/조건: daily_nudge_service.py:28-80
일일 넛지 지급 경로(TRIAL_TICKET): daily_nudge_service.py:132-142
보상 지급 매핑(TRIAL_TICKET): reward_service.py:174-204
트라이얼 소비 추적(TrialTokenBucket): game_wallet_service.py:46-120
레거시 티켓 카운트(TRIAL_TOKEN 포함): vault.py:55-60
SHIP: 지급 경로
일일 넛지(Daily Nudge): V2InventoryService.grant_wallet_tokens로 TRIAL_TICKET 지급. daily_nudge_service.py:132-142
보상 지급 파이프라인: RewardService의 ticket_map에서 TRIAL_TICKET을 GameTokenType.TRIAL_TICKET으로 매핑해 지갑에 지급. reward_service.py:174-204
지급 조건/대상
일일 넛지 대상: 최근 3일 내 접속 기록, 오늘(운영일 기준) 미접속, benefits_suspended 아님. 운영일 기준은 KST 오전 9시 시작 로직을 사용. daily_nudge_service.py:28-80
보상 지급 대상: 게임/이벤트/어드민 설정 등에서 reward_type=TRIAL_TICKET인 경우 해당 유저에게 지급. reward_service.py:174-204
참고/주의
TRIAL_TICKET은 정책상 무료 체험 티켓으로 user_game_wallet.token_type 및 RewardType에 매핑됨. 03.game.md:33-40
트라이얼 소비 여부는 TrialTokenBucket으로 추적되며, 소비 기록에 consumed_trial 메타가 남음(지급 경로는 아님). game_wallet_service.py:46-120
레거시 금고 상태 API는 TRIAL_TOKEN을 티켓 합산에 포함(구형 네이밍). vault.py:55-60


roi 분석 기능 구
-------------------------

이제 V2 골든 프로젝트에 대해 포괄적으로 학습했습니다. 정리해드리겠습니다.

🏆 V2 Golden 프로젝트 종합 학습 완료
📋 1. 시스템 개요 (System Definition)
Golden V2는 단순 마케팅이 아닌 **"데이터 기반 유기적 리텐션 운영 시스템"**입니다.

핵심 컴포넌트
구분	설명
Golden Core	적응형 리텐션 엔진 (Adaptive Retention Engine)
Golden Ops	관제 및 개입 시스템 (Operations & Intervention)
Golden Data	증거 기반 의사결정 데이터 파이프라인
Loop Architecture
📋 2. SoT 값 및 정책 정리
2.1 Redis Pub/Sub 채널 SoT
채널	목적	Producer → Consumer
ch25_events	원본 게임 이벤트 스트림	Game → GoldenEventWorker
golden:v2:events:game	V2 게임 이벤트 스트림	Game/Gateway → Analysis
golden:v2:events:intervention	개입 이벤트 스트림	Worker → API(User Push)
2.2 Redis 키 SoT
키 패턴	타입	의미
golden:v2:user:{user_id}:loss_streak	Int	연속 패배 횟수
golden:v2:user:{user_id}:session_start_balance	Int	세션 시작 잔액
golden:v2:user:{user_id}:psych_state	String	심리 상태 (예: FRUSTRATED)
golden:v2:cooldown:{trigger_id}:{user_id}	TTL	트리거별 쿨다운
2.3 개입(Intervention) 트리거 SoT
Trigger ID	조건	액션	쿨다운
TRG_LOSE_5	연속 5패	Trigger_Pity_Win	1h
TRG_BAL_DROP_50	잔액 50% 급감	Crisis_Intervention	1h
TRG_ZERO_BAL	잔액 0	Offer_Zero_Ticket	24h
2.4 개입 상태(Status) SoT
상태	의미
PENDING_APPROVAL	승인 대기 (발송/지급 금지)
APPROVED	운영자 승인 완료
REJECTED	운영자 거절
SENT	발송/지급 완료
2.5 골든아워(Golden Hour) SoT
구분	SoT 위치	기본값
전역 활성화	golden_hour_config.enabled	false
수동제어	golden_hour_config.manual_override	AUTO
전역 배율	golden_hour_config.multiplier	2.0
시작 시각	start_time_kst	21:30:00
종료 시각	end_time_kst	22:30:00
주사위 적용 게이트	V2DiceConfig.enable_golden_hour	true
주사위 배율	V2DiceConfig.golden_hour_multiplier	2.0
📋 3. 백엔드 구현
3.1 핵심 모델
모델	테이블	용도
V2GoldenInterventionLog	v2_golden_intervention_log	개입 로그 기록
V2UserRetentionState	v2_user_retention_state	유저 리텐션 상태
V2RetentionRoiLog	v2_retention_roi_log	ROI 분석 로그
3.2 핵심 서비스
서비스	파일	기능
GoldenV2EventService	golden_event_service.py	Redis Pub/Sub 이벤트 발행
GoldenInterventionService	golden_intervention_service.py	개입 트리거 감지/실행
GoldenSchedulerService	golden_scheduler_service.py	HQ 세그먼트 기반 스케줄러
3.3 워커
워커	파일	역할
golden_event_worker	golden_event_worker.py	ch25_events → golden:v2 채널 브릿지
golden_intervention_worker	golden_intervention_worker.py	게임 이벤트 소비 → 개입 이벤트 발행
3.4 API 엔드포인트
Method	Endpoint	기능
POST	/api/v2/golden/intervention/resolve	개입 해결 처리
POST	/api/v2/golden/reengagement/queue	리인게이지먼트 큐 등록
GET	/api/v2/golden/status	골든 상태 조회
GET	/api/v2/golden/history	골든 이력 조회
WS	/api/v2/admin/ws/golden/events	실시간 이벤트 스트림 (Admin)
POST	/api/v2/admin/crm/approve	복수 건 승인/거절
📋 4. 프론트엔드 구현
4.1 핵심 컴포넌트
컴포넌트	파일	기능
GoldenEventStream	GoldenEventStream.tsx	실시간 게임 이벤트 스트리밍
InterventionLogTable	InterventionLogTable.tsx	개입 로그 테이블
GoldenRealTimePage	GoldenRealTimePage.tsx	관리자 실시간 관제 페이지
4.2 API 클라이언트
함수	파일	기능
resolveV2Intervention	goldenApi.ts	개입 해결 요청
queueV2Reengagement	goldenApi.ts	리인게이지먼트 큐 등록
4.3 아키텍처 원칙
Feature-Based Structure: src/features/golden/
Suspense-First: useSuspenseQuery 기본 사용
TMA SDK 연동: Haptic Feedback, Main/Back Button
📋 5. Ops Plan 액션 종류 (Kind)
Kind	설명	처리 방식
INVENTORY_GRANT_ALL	전체 유저 일괄 지급	Async Worker
TARGETED_ITEM_GRANT	타겟 리스트 지급	Async Worker
GOLDEN_HOUR	골든아워 제어	DB Config 업데이트
TARGETLIST_BROADCAST	타겟 리스트 마킹	Sync/Async
MESSAGE_TEMPLATE	메시지 템플릿 발송	Async Worker
📋 6. 문서 SoT 위치
문서	경로
시스템 정의서	golden_v2_system_definition_ko.md
개입 로직	golden_v2_intervention_logic_ko.md
운영 로직	golden_v2_operational_logic_ko.md
골든아워 정책	v2_golden_hour_policy_sot_ko.md
실시간 아키텍처	02_golden_v2_realtime_architecture.md
프론트엔드 스펙	2026_01_28_golden_frontend_spec.md
경제체계 용어집	golden_v2_core_economy_glossary_ko.md
학습 완료! V2 골든 프로젝트의 SoT 값, 기능, 백엔드/프론트엔드 구현을 모두 파악했습니다. 추가 질문이나 작업이 필요하시면 말씀해 주세요.








지연극복관리 > 실제 ui 구현된거 있음? 
어떻게 분석해서 할거임? 
. Latency Survival (지연 입금 선반영 시스템)
"돈은 보냈는데 아직 안 들어왔어요..."라는 유저를 놓치지 않는 기능입니다.

문제: 은행/코인망 지연으로 입금 확인까지 4~12시간이 걸리면, 게임하고 싶어 온 유저는 기다리다 지쳐 이탈합니다.
해결책 (구현됨): 유저가 입금 증거(TX ID 등)를 제출하면, 시스템이 '신용 가불(Provisional Grant)' 형태로 게임 머니를 즉시 선지급합니다.
구현 위치: app/v2/services/latency_survival_service.py
안전 장치:
한도 제한: 시간당 최대 3회 등 어뷰징 방지.
클로백(Clawback): 나중에 허위 입금으로 밝혀지면, 선지급된 재화를 시스템이 자동으로 회수(차감)하는 로직이 완성되어 있습니다.




연속스트릭 모달 업데이트 및 정상작동하게 할것




## 사용자 요청사항 대응법 
1. C:\Users\JAVIS\ch\ch25\docs\v2_specs\90_troubleshooting\20260130_error_triage_checklist.md
위의 에러 트리아지 체크리스트에 따라서 작업을 진행한다.
2. 에러트리아지에 해당되는 경우가 아닌 신규기능 생성일시에는 사용자가 제공한 기술문서들을 확인 후 기준값, 계획 수립후 실행한다
3. 완료 후 트러블슈팅 문서 업데이트 한다 

## 주의 
관리자가 직접 깃 커밋/ 푸쉬하니까 넌 깃은 손대지 말것 

### 트래블슈팅문서 업데이트 및 작성법
C:\Users\JAVIS\ch\ch25\docs\v2_specs\90_troubleshooting\README.md

### 기술 기준문서 :
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned 내 도메인별 폴더/문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk  모든문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\00_con.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_INDEX.md

#### ssh 접속 실제 운영서버 확인 
C:\Users\JAVIS\.ssh\id_ed25519_vultr roott@149.28.135.147

 ssh -i C:\Users\JAVIS\.ssh\id_ed25519_vultr root@149.28.135.147 "docker logs xmas-backend --tail=200"






----------
https://opengameart.org/art-search-advanced?keys=&title=&field_art_tags_tid_op=or&field_art_tags_tid=&name=&field_art_type_tid%5B%5D=12&field_art_type_tid%5B%5D=13&sort_by=count&sort_order=DESC&items_per_page=24&Collection=

 docker compose build --no-cache; docker compose up -d









 cost_type(다이아/금고)별 가격 뱃지/아이콘 ③ Shop의 프리미엄 판정 로직 일관화 같은 UX 다듬기




-----------------------------------

## 에러대응
1. C:\Users\JAVIS\ch\ch25\docs\v2_specs\90_troubleshooting\20260130_error_triage_checklist.md
위의 에러 트리아지 체크리스트에 따라서 작업을 진행한다.
완료 후 트러블슈팅 문서 업데이트 한다 
관리자가 직접 깃 커밋/ 푸쉬하니까 넌 깃은 손대지 말것 

트래블슈팅문서 업데이트 및 작성법
C:\Users\JAVIS\ch\ch25\docs\v2_specs\90_troubleshooting\README.md

기술 기준문서 :
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned 내 도메인별 폴더/문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk  모든문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\00_con.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_INDEX.md

ssh 접속 실제 운영서버 확인 
C:\Users\JAVIS\.ssh\id_ed25519_vultr roott@149.28.135.147

 ssh -i C:\Users\JAVIS\.ssh\id_ed25519_vultr root@149.28.135.147 "docker logs xmas-backend --tail=200"


---------
http://localhost:8501/ - 엑셀 누적 데이터! 

=======
SHIP
실제 구현된 관리자 FE 기준으로 가능한 작업은 아래와 같다.

운영/모니터링
운영 대시보드에서 시스템 상태, 골든 레이더 요약, 활성 유저, HQ 마진 통계 확인 및 유저 상세 드로어 열기: OpsDashboard.tsx
골든 실시간 모니터링: 게임 이벤트 스트림 확인, 유저 ID로 인터벤션 로그 조회: GoldenRealTimePage.tsx
위기 레이더: 이탈 위험 유저 리스트/지표 확인 및 유저 상세 드로어: CrisisRadarPage.tsx
분석 대시보드: 보유율/수익·지출/마케팅 효율 분석 탭 확인: AnalyticsDashboard.tsx
시스템 & 보안
서킷 브레이커 상태 모니터링 및 글로벌 한도 리셋(슬라이드 승인): CircuitBreakerPage.tsx
지연 극복(증거) 승인/반려 처리: LatencySurvivalPage.tsx
감사 로그 필터/페이지네이션 조회: AuditLogPage.tsx
CSV 업로드/검증/임포트(외부 게임 로그, HQ 마진 데이터 타입 선택): CSVImportPage.tsx
경제 & 자산
금고 출금 승인/거절, 강제 금고 조정, 금고 통계/스펜드 리밋 조회: VaultControlPage.tsx
입금 로그 CRUD 및 유저 매칭/정렬: CCDepositPage.tsx
티켓/인벤토리 관리 탭: TicketInventoryTabPage.tsx
상점/미션 관리 탭: ShopMissionTabPage.tsx
유저 & 마케팅
유저 목록 검색/필터/정렬/생성/상세 드로어: UserListPage.tsx
세그먼트 규칙 관리, 통계 조회, 배치 실행: UserSegmentPage.tsx
세그먼트 대상 메시지 발송: MessageSenderPage.tsx
마케팅 탭(설문/리텐션/매출/성과 패널 포함): MarketingTabPage.tsx
게임 운영
레벨 설정, 전역 레벨 설정, 유저 XP/레벨 조정: LevelConfigPage.tsx
룰렛/주사위/복권 설정 관리:
RouletteConfigPage.tsx
DiceConfigPage.tsx
LotteryConfigPage.tsx
팀 배틀 시즌/팀 생성, 점수 조정, 강제 참여/탈퇴, 기여도 조정: AdminTeamBattlePage.tsx
미구현/대기(placeholder)

골든아워 관리 화면은 Pending 표시: placeholders.tsx
원하는 기능 범위를 좁혀주면 해당 화면 기준으로 더 자세히 정리한다.