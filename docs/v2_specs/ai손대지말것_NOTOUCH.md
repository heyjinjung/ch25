
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


 문서에서 발견된 문제점들을 정리해드리겠습니다.

🔴 발견된 문제점 전체 목록
1. V1/V2 세그먼트 시스템 혼용 (심각)
서비스	사용 시스템	문제
룰렛게임 roulette_service.py	UserSegment(V1)	V2 유저인데 V1 세그먼트 조회
다이스게임 dice_service.py	UserSegment(V1)	V2 유저인데 V1 세그먼트 조회
나머지	V2UserSegment	정상
→ V2 유저의 세그먼트가 게임에 반영 안 될 수 있음

2. 금고(Vault) 세그먼트 분리 문제
서비스	세그먼트 시스템	사용 키
vault_service.py	V2SegmentService	NEW, AT_RISK
vault2_service.py	V2UserSegment	COMMON (기본값만)
→ 두 서비스 간 세그먼트 기준 불일치 가능
→ VIP/WHALE 금고 혜택이 제대로 적용되는지 확인 필요

3. WINNER 세그먼트 비즈니스 로직 없음
✅ HQ Import에서 분류됨 (마진 < 0)
✅ 리텐션 보상률 3% 설정됨
🔴 그 외 비즈니스 로직 0개
금고 조건 없음
게임 배수 없음
골든아워 후보 아님
→ 분류만 하고 실제 혜택/제한 없음

4. 세그먼트 규칙 엔진 제한
admin_segment_rule_service.py에서 NEW, VIP, AT_RISK만 규칙 존재

세그먼트	자동 분류 규칙
NEW	✅
VIP	✅
AT_RISK	✅
WHALE	❓ HQ Import만?
WINNER	❓ HQ Import만?
COMMON	기본값
→ WHALE/WINNER 배치 재분류 누락 가능

5. hq_segment 중복 사용
prospect_linking_service.py에서:

V2UserSegment.segment 사용
V2User.hq_segment 사용
→ 두 값이 다르면 어느 것이 정확한지 불명확

6. 세그먼트 미적용 도메인
도메인	상태	영향
보상(Reward)	❌ 미적용	세그먼트별 차등 보상 불가
레벨(Level)	❌ 미적용	세그먼트별 XP 배수 불가
미션	⚠️ 카테고리만	세그먼트 기반 미션 타겟팅 불가
7. 금고 출금조건 세그먼트 영향 (4.2 테이블 기준)
세그먼트	play_target	spend_target	비고
WHALE	0	0	조건 면제 (3백만+ 입금)
VIP	15	5,000	완화
COMMON	?	?	기본값 확인 필요
NEW	100	30,000	강화
AT_RISK	100	30,000	강화
WINNER	❓	❓	정의 안됨
→ WINNER/COMMON의 금고 출금조건이 명확하지 않음

📋 즉시 확인 필요 항목
 vault_service.py L559-576 - 세그먼트별 출금조건 전체 확인
 roulette_service.py / dice_service.py - V1→V2 세그먼트 전환 필요
 WINNER 세그먼트 비즈니스 로직 정의 필요
 WHALE 배치 분류 규칙 확인