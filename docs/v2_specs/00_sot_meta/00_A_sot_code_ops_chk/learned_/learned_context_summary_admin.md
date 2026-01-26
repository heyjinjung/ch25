# V2 Admin 영역 1~3차 학습 요약 (DB/OPS 실전 이슈/리스크 보강)

## [DB/OPS 실전 이슈/리스크/운영상 주의]
- FK/UNIQUE/INDEX 누락·불일치로 인한 메시지/인박스 중복, 잘못된 수신/읽음 처리, 데이터 유실/조회 오류
- v2_admin_message, v2_admin_message_inbox, v2_user 등 테이블 간 동기화/이관 누락 시 메시지 누락/중복/오작동
- is_read/read_at/created_at 등 상태 필드 NULL/불일치/미적용으로 인한 운영/통계 오류
- target_type/target_value/channels 등 정책/DB/코드/프론트 매핑 불일치로 인한 메시지 오발송/누락/권한 오류
- OPS 액션(Worker/Async) 처리 시 대량 메시지/지급/상태변경에서 Deadlock, 멱등성 미보장, 중복 지급/오류 발생
- DB 마이그레이션/스냅샷/롤백 시 메시지/인박스/OPS 연관 테이블 일관성 필수

### [실제 장애/운영 사례]
- 메시지 인박스 FK 불일치로 일부 유저 메시지 미수신/중복
- OPS 대량 지급/상태변경 시 Deadlock, 멱등성 미보장으로 인한 중복 지급/오류
- target_type/target_value 정책/DB/코드/프론트 미일치로 메시지 오발송/누락/권한 오류
- is_read/read_at 미적용/불일치로 통계/운영 리포트 오류

---
(본 요약은 v2_db_admin_message_inbox_ko.md, v2_db_admin_message_ko.md, v2_admin_message_policy_sot_ko.md, v2_ops_action_glossary_sot_ko.md 등에서 Admin 관련 내용만 추출/정리한 1~3차 학습 결과입니다.)
