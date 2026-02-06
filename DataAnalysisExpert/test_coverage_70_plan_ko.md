문서 타입: 가이드
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/QA/운영
상태: Draft

# 커버리지 70% 달성 통합 테스트 가이드 (25개 분해)

## 1. 목적
통합 중심 테스트 25개를 테스트 파일 단위로 분해하고, 필요한 fixtures 및 가드레일을 명시한다.

## 2. 범위
- Admin/Ops/Golden/Game 통합 테스트
- 70% 커버리지 목표선 달성을 위한 우선 시나리오

## 3. 공통 전제
- 타임존은 KST(Asia/Seoul), 운영일 오전 9시 리셋을 전제로 한다.
- 인증은 테스트 전용 토큰 또는 관리자 토큰을 사용한다.
- DB는 테스트 전용 세션/트랜잭션 롤백을 유지한다.

## 4. 공통 Fixtures
- db_session: DB 세션 고정 및 롤백
- admin_user: 관리자 계정
- base_user: 일반 유저
- admin_token: 관리자 JWT
- user_token: 유저 JWT
- test_client: FastAPI 테스트 클라이언트

## 5. 가드레일(테스트 규칙)
1) 외부 서비스 호출 금지(Sentry/Telegram/Slack 등은 mock).
2) Redis/Worker 의존 경로는 in-memory 또는 stub으로 대체.
3) 대량 작업은 샘플 1~3건으로 축소.
4) 실패 케이스는 표준 에러 코드와 status만 검증.

## 6. 테스트 파일 분해 (25개)

### A. Admin (12)
1) 파일: tests/v2/test_admin_game_config_integration.py
- 시나리오: 룰렛 8세그먼트 설정 저장 + 복권 재고 설정 저장
- fixtures: admin_token, test_client, db_session
- 가드레일: 필수 필드 누락 케이스는 400만 확인

2) 파일: tests/v2/test_admin_lottery_prize_partial_update.py
- 시나리오: 복권 경품 부분 업데이트(라벨만 변경)
- fixtures: admin_token, test_client
- 가드레일: 기존 값 유지 확인(나머지 필드)

3) 파일: tests/v2/test_admin_team_battle_season_lifecycle.py
- 시나리오: 시즌 생성 -> 활성화 -> 종료
- fixtures: admin_token, db_session, test_client
- 가드레일: 중복 활성화 금지(409 or 400)

4) 파일: tests/v2/test_admin_team_battle_force_member.py
- 시나리오: 강제 가입/탈퇴
- fixtures: admin_token, base_user, test_client
- 가드레일: 이미 가입 상태 처리

5) 파일: tests/v2/test_admin_audit_log_guard.py
- 시나리오: 변경성 API 호출 시 감사 로그 생성
- fixtures: admin_token, db_session, test_client
- 가드레일: audit row 1건 이상

6) 파일: tests/v2/test_admin_user_asset_adjust.py
- 시나리오: 유저 자산 조정(금고/지갑)
- fixtures: admin_token, base_user, test_client
- 가드레일: 음수 차감 실패 케이스

7) 파일: tests/v2/test_admin_inventory_grant.py
- 시나리오: 티켓 지급
- fixtures: admin_token, base_user, test_client
- 가드레일: reward_type 표준값 검증

8) 파일: tests/v2/test_admin_marketing_message_fanout.py
- 시나리오: 메시지 생성 + 인박스 팬아웃
- fixtures: admin_token, base_user, test_client
- 가드레일: recipient_count >= 1

9) 파일: tests/v2/test_admin_segment_run.py
- 시나리오: 세그먼트 배치 실행
- fixtures: admin_token, test_client
- 가드레일: processed/changed 필드 존재

10) 파일: tests/v2/test_admin_ops_status_smoke.py
- 시나리오: /api/v2/admin/ops/status 조회
- fixtures: admin_token, test_client
- 가드레일: system_status == OK

11) 파일: tests/v2/test_admin_game_config_readonly.py
- 시나리오: 룰렛/다이스/복권 설정 조회
- fixtures: admin_token, test_client
- 가드레일: 200 + 필수 필드

12) 파일: tests/v2/test_admin_csv_import_preview.py
- 시나리오: CSV validate/preview
- fixtures: admin_token, test_client
- 가드레일: 필수 컬럼 누락 시 400

### B. Ops (9)
13) 파일: tests/v2/test_ops_hq_margin_import.py
- 시나리오: HQ_MARGIN CSV import -> 세그먼트 업데이트
- fixtures: admin_token, db_session
- 가드레일: VIP/WHALE/AT_RISK/COMMON 중 하나로 분류

14) 파일: tests/v2/test_ops_hq_daily_deposit_import.py
- 시나리오: HQ_DAILY CSV import -> 중복 방지
- fixtures: admin_token, db_session
- 가드레일: 동일 dedup_key 재처리 불가

15) 파일: tests/v2/test_ops_paste_import_daily_deposit.py
- 시나리오: DAILY_DEPOSIT 붙여넣기 import
- fixtures: admin_token, db_session
- 가드레일: latest time 이후만 처리

16) 파일: tests/v2/test_ops_paste_import_game_log.py
- 시나리오: GAME_LOG 붙여넣기 import
- fixtures: admin_token, db_session
- 가드레일: 분석 로직 호출 여부만 확인

17) 파일: tests/v2/test_ops_spending_ledger_sources.py
- 시나리오: HQ_W, VAULT_W, SHOP_U 기록
- fixtures: db_session
- 가드레일: transaction_id 중복 차단

18) 파일: tests/v2/test_ops_status_hq_stats.py
- 시나리오: ops/status 내 hq_stats 집계
- fixtures: admin_token, db_session, test_client
- 가드레일: last_sync_at nullable 허용

19) 파일: tests/v2/test_ops_health_routes.py
- 시나리오: /health, /api/v2/health, /api/v2/health/db
- fixtures: test_client
- 가드레일: 200 + status ok

20) 파일: tests/v2/test_ops_metrics_route.py
- 시나리오: /api/v2/metrics
- fixtures: test_client
- 가드레일: text/plain 응답

21) 파일: tests/v2/test_ops_smoke_core_routes.py
- 시나리오: 배포 스모크 핵심 라우트 3~5개
- fixtures: test_client
- 가드레일: 200/401 범위 허용

### C. Golden (3)
22) 파일: tests/v2/test_golden_intervention_flow.py
- 시나리오: TRG_LOSE_5 -> PENDING -> 승인(SENT)
- fixtures: admin_token, db_session, test_client
- 가드레일: 상태 전이만 검증

23) 파일: tests/v2/test_golden_daily_nudge.py
- 시나리오: 12:00/19:00 발송 및 만료 정책
- fixtures: db_session
- 가드레일: benefits_suspended 제외

24) 파일: tests/v2/test_golden_circuit_breaker.py
- 시나리오: 한도 초과 -> 차단
- fixtures: db_session
- 가드레일: skip_circuit_breaker 옵션 확인

### D. Game (1)
25) 파일: tests/v2/test_team_battle_rankings_alias.py
- 시나리오: /team-battle/rankings == leaderboard view
- fixtures: test_client, db_session
- 가드레일: limit<=100, offset>=0

## 7. 우선 실행 순서(권장)
1) Admin 1~6
2) Ops 13~18
3) Golden 22~24
4) Game 25
5) Admin 7~12
6) Ops 19~21

## 8. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 초기 분해 가이드 작성
