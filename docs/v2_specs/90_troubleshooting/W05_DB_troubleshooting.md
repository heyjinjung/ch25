문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: DB (DB/마이그레이션)
상태: ACTIVE

# W05 DB 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | V2 로그/주문 테이블 FK 누락 | ✅ RESOLVED |
| 01-31 | V2 도메인 FK 전체 감사 | ✅ RESOLVED |
| 01-30 | user_activity FK 오류 | ✅ RESOLVED |

---

## 01-31 - V2 로그/주문 테이블 FK 누락

### 증상
아래 테이블에 `user_id` → `v2_user.id` FK 제약조건 미설정:
- `v2_dice_log`
- `v2_roulette_log`
- `v2_lottery_log`
- `v2_shop_order`

### 영향
- 유저 삭제(`purge_user`) 시 로그가 고아 데이터로 남음
- 데이터 무결성 위반 가능

### 해결
마이그레이션 추가: `20260131_1500_add_v2_user_fk_to_log_tables.py`

| 테이블 | FK 정책 | 이유 |
|---|---|---|
| `v2_dice_log` | SET NULL | 로그 보존 (감사 목적) |
| `v2_roulette_log` | SET NULL | 로그 보존 |
| `v2_lottery_log` | SET NULL | 로그 보존 |
| `v2_shop_order` | SET NULL | 주문 이력 보존 |
| `v2_user_auth_event` | **FK 없음 유지** | 성능 우선 |

### 관련 파일
- `alembic/versions/20260131_1500_add_v2_user_fk_to_log_tables.py`

---

## 01-31 - V2 도메인 FK 전체 감사

### 점검 결과

| 도메인 | 서비스 코드 | DB FK | 상태 |
|---|---|---|---|
| Auth & User | ✅ V2UserService | ✅ v2_user | 완료 |
| Vault & Economy | ✅ V2VaultService | ✅ vault_ledger | 완료 |
| Missions & Streak | ✅ V2MissionService | ✅ user_mission_progress | 완료 |
| Level & XP | ✅ LevelXPService | ✅ user_level_progress | 완료 |
| Inventory & Shop | ✅ V2InventoryService | ✅ user_game_wallet | 완료 |
| Games | ✅ V2DiceGameService | ⚠️ → ✅ FK 추가 | 완료 |

### 관련 파일
- `docs/v2_specs/90_troubleshooting/2026_01_31_v2_domain_audit.md`

---

## 01-30 - user_activity FK 오류

### 증상
```
IntegrityError: Cannot add or update a child row: 
a foreign key constraint fails (`user_activity`, CONSTRAINT `user_activity_ibfk_1` 
FOREIGN KEY (`user_id`) REFERENCES `user` (`id`))
```

### 원인
`user_activity` 테이블이 레거시 `user` 테이블을 참조
V2User 생성 시 `user` 테이블에 해당 ID 없음

### 해결
마이그레이션: `20260130_2500_fix_user_activity_fk.py`
- FK를 `v2_user.id`로 변경

### 관련 파일
- `alembic/versions/20260130_2500_fix_user_activity_fk.py`

---

## 변경 이력
- 2026-01-31: W05 DB 문서 생성, 기존 분산 문서 통합
