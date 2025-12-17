# 레벨 진행도 리뷰 노트

- 문서 타입: 검증/리뷰
- 버전: v1.0
- 작성일: 2025-12-07
- 작성자: 시스템 검증팀
- 대상 독자: 백엔드/프론트엔드 리드, QA, 비개발 이해관계자

## 1. 목적 (Purpose)
- 레벨 진행도(도장, XP, 레벨, 보상) 동작을 일반인도 이해할 수 있게 설명한다.
- 실제 코드/DB에서 발생할 수 있는 오류 가능성을 촘촘하게 점검할 수 있도록 검증 포인트를 제공한다.

## 2. 범위 (Scope)
- API: `/api/season-pass/status`, `/api/season-pass/stamp`, `/api/season-pass/claim` 동작과 데이터 계약.
- 서비스: `SeasonPassService` 진행도/보상 로직, stamp/reward 로그 작성.
- DB: season_pass_config/progress/stamp_log/reward_log 제약 및 일관성.
- 제외: 포인트/쿠폰 지급 구현 세부, 관리자 설정 UI, 배치/이벤트 후처리.

## 3. 빠른 이해 (쉬운 설명)
- 시즌은 시작일~종료일 사이에만 열린다. 오늘이 그 안에 있으면 "활성 시즌"이다.
- 하루에 도장 1개를 찍을 수 있고, 도장을 찍으면 XP가 올라간다.
- XP가 쌓이면 레벨이 올라가고, 어떤 레벨은 자동 보상(즉시), 어떤 레벨은 수동 수령이 필요하다.
- 오늘 도장을 이미 찍었는지, 받을 보상이 남았는지는 로그와 진행도 테이블을 보고 판단한다.

## 4. 진행도 데이터 구성
- 시즌 정의: `season_pass_config` (start_date, end_date, base_xp_per_stamp, max_level, level 보상 테이블 포함).
- 유저 진행도: `season_pass_progress` (UNIQUE user_id+season_id, current_level, current_xp, total_stamps, last_stamp_date).
- 도장 로그: `season_pass_stamp_log` (UNIQUE user_id+season_id+date, xp_earned, source_feature_type).
- 보상 로그: `season_pass_reward_log` (UNIQUE user_id+season_id+level, auto_claim 포함 기록).
- 레벨 보상: config의 levels[] (required_xp, reward_type/amount, auto_claim 플래그).

## 5. 정상 흐름 요약 (코드와 일치하는 단계)
1) Status 호출: 활성 시즌 찾기(없으면 404 또는 409), 진행도 불러오기(없으면 생성), 오늘 도장 여부를 stamp_log로 판단.
2) Stamp 호출:
   - 중복 방지: 오늘자 stamp_log 존재 시 400.
   - XP 계산: xp_to_add = base_xp_per_stamp + xp_bonus.
   - XP/레벨 갱신: current_xp 누적 → required_xp 이상인 최고 레벨까지 승급.
   - 보상 지급: 신규 달성 레벨 중 auto_claim=1은 즉시 지급 및 reward_log 기록, auto_claim=0은 남겨둔다.
   - 로그: stamp_log insert(xp_earned, source_feature_type), progress 갱신.
3) Claim 호출:
   - 조건: 진행 레벨 >= 요청 레벨, 해당 레벨 auto_claim=0, reward_log에 미기록.
   - 처리: reward_log insert 후 보상 지급.

## 6. 연결/의존 포인트
- 활성 시즌: start_date <= 오늘 <= end_date, 2건 이상이면 `NO_ACTIVE_SEASON_CONFLICT`(409).
- Feature 연동: 게임 성공 시 `add_stamp()` 호출 가능, source_feature_type은 호출자에서 전달.
- 인증: 세 API 모두 JWT 필수.
- KST 기준: 모든 날짜 판단과 일일 1회 제한은 Asia/Seoul 기준.
- 무제한 표기: max_daily=0 정책은 remaining=0이라도 차단 없이 허용(문구 혼동 주의).

## 7. 오류/경계 체크리스트 (디테일)
- 시즌 상태
  - ✅ 활성 시즌 없음 → status/stamp/claim 모두 404.
  - ✅ 활성 시즌 2건 이상 → 409 `NO_ACTIVE_SEASON_CONFLICT`.
- 진행도/로그 무결성
  - ✅ progress UNIQUE(user_id, season_id) 존재 여부 확인.
  - ✅ stamp_log UNIQUE(user_id, season_id, date)로 오늘 중복 차단.
  - ✅ reward_log UNIQUE(user_id, season_id, level)로 보상 중복 차단.
- XP/레벨 계산
  - ✅ xp_to_add = base_xp_per_stamp + xp_bonus, 음수/None 불가.
  - ✅ 다단계 레벨업 시 모든 신규 레벨의 auto_claim=1 보상 지급 및 reward_log 기록.
  - ✅ current_level/max_level 경계: max_level 초과 상승 방지.
- 요청 유효성
  - ✅ source_feature_type 값이 config된 enum(ROULETTE/DICE/LOTTERY/RANKING/SEASON_PASS) 중 하나인지 확인.
  - ✅ claim 시 요청 level <= current_level, auto_claim=0인지 검증 후 처리.
- 시간/타임존
  - ✅ last_stamp_date와 today 비교 시 KST 사용 여부 확인.
- 에러 매핑
  - ✅ 이미 찍은 도장 → 400, 이미 받은 보상 → 400 `REWARD_ALREADY_CLAIMED`, auto_claim 레벨 요청 → 400 `AUTO_CLAIM_LEVEL`.

## 8. 실제 점검 절차 (현장용)
- 활성 시즌 쿼리: `SELECT * FROM season_pass_config WHERE start_date<=TODAY<=end_date;` 건수 확인.
- 진행도 확인: `SELECT * FROM season_pass_progress WHERE user_id=? AND season_id=?;` 빈 값이면 생성 로직 검증.
- 오늘 도장 여부: `SELECT 1 FROM season_pass_stamp_log WHERE user_id=? AND season_id=? AND date=TODAY;`.
- XP/레벨 계산 스팟 체크: stamp 요청 후 progress.current_xp, current_level, stamp_log.xp_earned 비교.
- 보상 중복 방지: reward_log에 같은 level 존재 여부 확인 후 claim 응답 비교.
- 타임존: API 로그 타임스탬프가 KST 기준으로 기록되는지 확인.

## 9. 테스트 시나리오 제안 (필수 케이스)
- 활성 시즌 없음 → status/stamp/claim 모두 404.
- 시즌 중복 → status/stamp/claim 409.
- 첫 도장 → progress 생성 + stamp_log 1건 + auto_claim 레벨 즉시 지급 여부 확인.
- 다단계 레벨업(큰 xp_bonus) → 중간 레벨 보상 누락 없이 reward_log 다건 생성 확인.
- 당일 중복 도장 시도 → 400.
- 수동 보상: 진행 레벨 이상, auto_claim=0 레벨만 claim 성공; 이미 수령/auto_claim 레벨은 400.

## 10. 남은 리스크/메모
- max_daily=0 무제한 정책이 FE 문구와 일치하는지 최종 QA 필요.
- source_feature_type 값 검증이 느슨한 경우(문자열 비교) 오타 입력 위험이 있어 enum/validator 추가 검토.
