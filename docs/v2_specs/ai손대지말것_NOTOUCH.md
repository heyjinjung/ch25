
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


---------
http://localhost:8501/ - 엑셀 누적 데이터! 

=======


 중복/혼동 이슈:

V2UserSegment.segment와 V2User.hq_segment가 동일 정보 이중 저장
V2UserRetentionState의 세그먼트는 완전히 다른 키 사용 (HIGH_ROLLER vs VIP)


2. 각 세그먼트가 영향을 끼치는 도메인
세그먼트	영향 도메인	코드 위치
VIP/WHALE	골든아워 후보 선정	golden_scheduler_service.py:78
CHURN_RISK	리텐션 재관여 메시지 대기열	retention_intervention_service.py:130
HIGH_ROLLER 등	리텐션 보상 계산 (base_rate)	retention_intervention_service.py:31
NEW/COMMON/AT_RISK	어드민 UI 필터/통계	segment_routes.py
세그먼트 전체	이벤트 타겟팅	segment_rule 조건
3. HQ 마진 Import시 모든 세그먼트가 분류되는가?
_classify_segment() 로직 (hq_margin_import_service.py:406):

세그먼트	HQ Import 자동분류	실제 분류 여부
NEW	❌ 없음	배치 규칙에서만 분류
COMMON	✅ 기본값	✅
VIP	✅ margin > 100만	✅
WHALE	✅ charge > 500만	✅
AT_RISK	✅ 미접속 7일+	✅
WINNER	✅ margin < 0	⚠️ 코드만 구현 (실제 61명 미분류)
CHERRY_PICKER	❌ 없음	설계문서만 존재
🔴 문제: 운영 DB에서 마진 음수 유저 61명이 WINNER가 아닌 COMMON으로 분류됨
→ HQ Import 전에 이미 COMMON으로 저장된 데이터 (재분류 미실행)

4. 입금 반영시 세그먼트 기준이 바뀌는가?
아니오. 입금 반영은 세그먼트와 분리됨:

프로세스	세그먼트 변경	비고
CC Deposit 입금	❌	금고/레벨만 반영
HQ Margin CSV Import	✅	마진 기반 자동 분류
어드민 수동 변경	✅	PATCH API
배치 실행	✅	segment_rule 기반
5. 어드민에서 세그먼트 CRUD가 가능한가?
기능	가능 여부	API/UI
C(생성)	✅	HQ Import 시 자동 생성
R(조회)	✅	GET /segments/stats, 유저 목록
U(수정)	✅	PATCH /users/{id}/segment
D(삭제)	⚠️ 미구현	세그먼트 삭제 API 없음
세그먼트 규칙 CRUD:

POST /segments/rules - 규칙 생성 ✅
PUT /segments/rules/{id} - 규칙 수정 ✅
DELETE /segments/rules/{id} - 규칙 삭제 ✅
POST /segments/batch/run - 배치 실행 ✅
6. 현재까지 정리/확보된 문서
문서	위치	상태
SoT 정책	v2_user_segment_policy_sot_ko.md	⚠️ WINNER 미정의
DB 스키마	v2_db_user_segment_ko.md	⚠️ WINNER 미정의
세그먼트 통일	learned_/segment/20260202_segment_unification_common_vip_whale_at_risk.md	✅
NEW 유저 규칙	learned_/segment/20260202_segment_new_user_window_rule.md	✅
CHERRY_PICKER 설계	learned_/golden/20260204_cherry_picker_segment_design.md	📝 초안
감사 문서	20260204_segment_mapping_audit.md	✅ 방금 생성
🔴 핵심 문제 요약
WINNER 세그먼트: 코드 구현됨, SoT 문서 미정의, 운영 DB 미반영 (61명)
세그먼트 이중 저장: V2UserSegment.segment vs V2User.hq_segment
리텐션 세그먼트 불일치: CRM(VIP) vs Retention(HIGH_ROLLER) 다른 키 사용
DB 제약조건 없음: varchar(50) 아무 값 저장 가능
DEFAULT 불일치: DB는 'NEW', SoT는 'COMMON'




구분	시스템	용도
CRM 세그먼트 (7개)		
1	V2UserSegment	V2 CRM 메인 (HQ Import)
2	V2User.hq_segment	HQ 연동 캐시 (중복)
3	UserSegment (V1)	레거시 -는 그대로 유지하다가 폐기처분하면 됨 
4	HQProspectiveUser.segment	미가입 잠재유저 - 여기서도 세그먼트가 세분화되서 나뉘어???? 
5	V2UserRetentionState.user_segment_tag	리텐션 개입용 (다른 키) - 이건 또 어디에 쓰이는데 ?? 
6	UserRetentionState (V1)	레거시 리텐션 - 는 그대로 유지하다가 폐기처분하면 됨
7	V2SegmentRule.segment	규칙 엔진 출력 - 이건 또 어디에 쓰이는데 ??

12	EventConfig.target_segment	이벤트 타겟팅
13	Survey.target_segment_json	설문 타겟팅