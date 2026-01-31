문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: GAME (게임)
상태: ACTIVE

# W05 GAME 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | 게임 API ModuleNotFoundError | ✅ RESOLVED |
| 01-31 | 복권 퍼즐조각 미지급 버그 | ✅ RESOLVED |
| 01-31 | 게임 로그 테이블 FK 누락 | ✅ RESOLVED |

---

## 01-31 - 게임 API ModuleNotFoundError

### 증상
```
ModuleNotFoundError: No module named 'app.v2.models.v2_user'
POST /api/v2/roulette/play HTTP/1.1" 500 Internal Server Error
POST /api/v2/dice/play HTTP/1.1" 500 Internal Server Error
POST /api/v2/lottery/play HTTP/1.1" 500 Internal Server Error
```

### 원인
`vault_service.py`의 `is_benefits_suspended()` 메서드에서 잘못된 import 경로 사용
- ❌ `from app.v2.models.v2_user import V2User`
- ✅ `from app.v2.models.user import V2User`

### 해결
import 경로 수정 후 배포

### 관련 파일
- `app/v2/services/vault_service.py`

---

## 01-31 - 복권 퍼즐조각 미지급 버그

### 증상
- 복권 게임 당첨 시 PUZZLE_C1, PUZZLE_C2 미지급
- 인벤토리에 퍼즐 조각이 쌓이지 않음

### 원인
`v2_lottery_prize` 테이블의 `reward_amount=0` 설정 오류
- PUZZLE_C1, PUZZLE_C2 보상 금액이 0으로 설정됨

### 해결
1. DB 직접 수정: `UPDATE v2_lottery_prize SET reward_amount=1 WHERE reward_type IN ('PUZZLE_C1', 'PUZZLE_C2')`
2. 마이그레이션 추가로 영구 반영

### 관련 파일
- `app/v2/services/v2_lottery_game_service.py`
- `docs/v2_specs/90_troubleshooting/20260131_복권_퍼즐조각_미지급_버그.md`

---

## 01-31 - 게임 로그 테이블 FK 누락

### 증상
- `v2_dice_log`, `v2_roulette_log`, `v2_lottery_log` 테이블에 `user_id` FK 미설정
- 유저 삭제 시 고아 데이터 발생 가능

### 원인
V2 마이그레이션 시 `config_id` FK만 설정, `user_id` FK 누락

### 해결
마이그레이션 추가: `20260131_1500_add_v2_user_fk_to_log_tables.py`
- `user_id` 컬럼 → `nullable=True`
- `v2_user.id` FK 추가 (`ON DELETE SET NULL`)

### 관련 파일
- `alembic/versions/20260131_1500_add_v2_user_fk_to_log_tables.py`

---

## 변경 이력
- 2026-01-31: W05 GAME 문서 생성, 기존 분산 문서 통합
