
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
다운로드: scp -i "C:\Users\JAVIS\.ssh\id_ed25519_vultr" root@149.28.135.147:/root/xmas_event_backup_YYYYMMDD_HHMMSS.sql.gz [ch25](http://_vscodecontentref_/1).
적용(로컬): docker cp ... xmas-db:/tmp/prod_dump.sql.gz → docker exec xmas-db mysql -uroot -p2026 -e "DROP DATABASE...; CREATE DATABASE...;" → docker exec xmas-db sh -c "gunzip -c /tmp/prod_dump.sql.gz | mysql -uroot -p2026 xmas_event"



----------
https://opengameart.org/art-search-advanced?keys=&title=&field_art_tags_tid_op=or&field_art_tags_tid=&name=&field_art_type_tid%5B%5D=12&field_art_type_tid%5B%5D=13&sort_by=count&sort_order=DESC&items_per_page=24&Collection=

 docker compose build --no-cache; docker compose up -d


---------
http://localhost:8501/ - 엑셀 누적 데이터! 


