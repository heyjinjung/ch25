문서 타입: 트러블슈팅
주차: W07 (02-10 ~ 02-16)
도메인: GAME
작성일: 2026-02-13
작성자: GitHub Copilot

# W07 GAME 트러블슈팅

---

## #1 모든 게임 play API 403 Forbidden (BENEFITS_SUSPENDED)

### 증상
| 항목 | 내용 |
|---|---|
| **대상 기능** | Dice/Roulette/Lottery play |
| **HTTP Status** | 403 Forbidden (`ForbiddenError("BENEFITS_SUSPENDED")`) |
| **영향 범위** | 7일간 입금 기록이 없는 유저 전원 (대다수 유저) |
| **재현 빈도** | 항상 (해당 유저 시도 시 100% 재현) |

### 근본 원인 (RCA)
**V2 Strict Vault Policy**에 의한 정상 동작이나, 대부분 유저의 입금 데이터가 누락됨.

흐름:
1. `POST /api/v2/{dice,roulette,lottery}/play` 호출
2. 서비스 레이어에서 `V2VaultService.is_benefits_suspended(db, user_id)` 체크
3. `external_ranking_daily_deposit_delta` 테이블에서 최근 7일 입금 합계 조회
4. **7일간 입금 합계 < 1** → `ForbiddenError("BENEFITS_SUSPENDED")` (403)

DB 현황 (2026-02-13):
- 전체 유저: ~40명
- 최근 7일 입금 기록이 있는 유저: 15명 (deposit > 0)
- 입금 기록이 없는 유저: ~25명 → 전원 403

### 면제 조건 (코드 내 존재)
1. **가입 7일 이내 신규 유저**: 제재 대상에서 제외 (`days_since_signup < 7`)
2. **수동 제재 해제**: `V2User.benefits_suspended_manual = 0`이면 자동 제재만 적용
3. **Deposit Evidence (24시간 유예)**: `V2UserDepositEvidence` 테이블에 PENDING/PROVISIONAL 증거가 24시간 내 존재하면 제재 우회

### 관련 코드
- `app/v2/services/vault_service.py:399` — `is_benefits_suspended()`
- `app/v2/services/v2_dice_game_service.py:241` — `raise ForbiddenError("BENEFITS_SUSPENDED")`
- `app/v2/services/v2_roulette_game_service.py:221` — 동일
- `app/v2/services/v2_lottery_game_service.py:215` — 동일

### 부수 이슈: Redis Worker 에러 폭주
- `redis.exceptions.ResponseError: NOGROUP No such key 'stream:raw_logs' or consumer group 'group:retention_workers'`
- 소스: `app/workers/ch25_event_worker.py:353`
- 영향: 게임 403과 직접 관련 없으나, 백엔드 로그를 도배하여 문제 진단 방해
- 해결: `docker exec xmas-redis redis-cli XGROUP CREATE stream:raw_logs group:retention_workers $ MKSTREAM`

### 조치 방안 선택지
| 방안 | 내용 | 리스크 |
|---|---|---|
| A. 정책 유지 | BENEFITS_SUSPENDED는 정상 동작, 유저에게 입금 안내 | 유저 이탈 가능 |
| B. 제재 완화 | 7일 → 14일로 연장, 또는 최소 입금 임계값 하향 | 정책 변경 필요 |
| C. 긴급 우회 | 특정 유저의 `benefits_suspended_manual` = 0 수동 해제 | 이미 적용됨 |
| D. 프론트엔드 안내 | 게임 페이지에서 403 시 입금 안내 바텀시트 표시 | 구현 필요 |

### 상태
🔍 **진단 완료** — 관리자 판단 대기 (정책 변경 여부)

---
