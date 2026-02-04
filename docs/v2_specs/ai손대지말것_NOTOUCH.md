
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

예시 

PS C:\Users\JAVIS\ch\ch25> ssh -i C:\Users\JAVIS\.ssh\id_ed25519_vultr root@149.28.135.147 "docker exec xmas-db mysql -u xmasuser -p2026 xmas_event -e 'SELECT id, user_id, deposit_delta, kst_date, updated_at FROM external_ranking_daily_deposit_delta ORDER BY updated_at DESC LIMIT 20;'"
id      user_id deposit_delta   kst_date        updated_at




----------
https://opengameart.org/art-search-advanced?keys=&title=&field_art_tags_tid_op=or&field_art_tags_tid=&name=&field_art_type_tid%5B%5D=12&field_art_type_tid%5B%5D=13&sort_by=count&sort_order=DESC&items_per_page=24&Collection=

 docker compose build --no-cache; docker compose up -d


---------
http://localhost:8501/ - 엑셀 누적 데이터! 


### 티켓/인벤토리 페이지에
일전에 다양한 에러 때문에
지급/회수/이런 기록 반영안된게 많아
그걸 다시 바로잡으면 현재 운영중인 상황에서 너무 이슈가 많아지고
지금부터 어드민에서 회수하는 기록도 다 로그에 반영되어서
실제 잔여 티켓수, 잔여인벤토리 아이템 수까지 모두 제대로 파악할 수 있도록 해줘 

