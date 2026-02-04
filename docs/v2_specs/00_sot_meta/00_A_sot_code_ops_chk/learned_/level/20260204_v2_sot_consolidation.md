# V2 SoT 통합 업데이트 (2026-02-04)

**문서 타입**: SoT 변경 기록  
**작성일**: 2026-02-04  
**작성자**: AI Copilot  

---

## 1. 변경 요약

V2 시스템에서 **이중 저장 문제**를 해결하기 위해 SoT를 통합했습니다.

### 변경 전 (문제)
| 데이터 | 레거시 SoT | V2 복사본 | 문제 |
|--------|-----------|-----------|------|
| 레벨/XP | `user_level_progress` | `v2_user.level` | 롤백 시 불일치 |
| 입금 누적 | `external_ranking_data.deposit_amount` | `v2_user.total_charge_amount` | 동기화 누락 |

### 변경 후 (해결)
| 데이터 | V2 SoT (단일) | 레거시 (동기화) |
|--------|--------------|----------------|
| 레벨 | `v2_user.level` | `user_level_progress.level` (동기화) |
| XP | `v2_user.xp` (신규) | `user_level_progress.xp` (동기화) |
| 입금 누적 | `v2_user.total_charge_amount` | `external_ranking_data.deposit_amount` (동기화) |

---

## 2. 변경된 파일

### 2.1 모델
- **`app/v2/models/user.py`**: `xp` 컬럼 추가
  ```python
  level = Column(Integer, nullable=False, default=1)  # V2 SoT
  xp = Column(Integer, nullable=False, default=0)     # V2 SoT (신규)
  total_charge_amount = Column(Integer, ...)          # V2 SoT
  ```

### 2.2 마이그레이션
- **`alembic/versions/20260204_0400_add_xp_to_v2_user.py`**
  - `v2_user.xp` 컬럼 추가
  - `user_level_progress` → `v2_user` 데이터 마이그레이션
  - `external_ranking_data` → `v2_user.total_charge_amount` 동기화

### 2.3 서비스
- **`app/services/level_xp_service.py`**
  - `add_xp()`: V2 SoT(`v2_user.level/xp`) 우선 업데이트
  - 레거시 호환: `user_level_progress`도 함께 동기화

- **`app/v2/services/admin_cc_deposit_service.py`**
  - `upsert_many()`: V2 SoT(`v2_user.total_charge_amount`) 함께 업데이트

- **`app/services/ops_target_service.py`**
  - `V2User.level` 대신 `user_level_progress` JOIN 사용 (레거시 호환)

---

## 3. 운영 규칙

### 3.1 레벨/XP 조회 우선순위
1. **V2 API**: `v2_user.level`, `v2_user.xp` 사용
2. **레거시 호환**: `user_level_progress` JOIN

### 3.2 입금 조회 우선순위
1. **V2 API**: `v2_user.total_charge_amount` 사용
2. **레거시 호환**: `external_ranking_data.deposit_amount`

### 3.3 수정 시 필수 동기화
- 레벨/XP 변경: `v2_user` + `user_level_progress` 동시 업데이트
- 입금 변경: `v2_user` + `external_ranking_data` 동시 업데이트

---

## 4. 롤백 절차

### 4.1 레벨 롤백 시
```sql
-- V2 SoT 수정
UPDATE v2_user SET level = 1, xp = 0 WHERE id = {user_id};

-- 레거시 동기화
UPDATE user_level_progress SET level = 1, xp = 0 WHERE user_id = {user_id};
```

### 4.2 입금 롤백 시
```sql
-- V2 SoT 수정
UPDATE v2_user SET total_charge_amount = 0 WHERE id = {user_id};

-- 레거시 동기화
UPDATE external_ranking_data SET deposit_amount = 0 WHERE user_id = {user_id};
```

---

## 5. 관련 문서
- [07.level.md](./07.level.md) - 레벨 정책
- [08.vault.md](../vault/08.vault.md) - 금고 정책
