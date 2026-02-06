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

## 5. 붙여넣기 Import 기능

### 5.1 개요
CSV 파일 업로드 대신 **클립보드 붙여넣기** 방식으로 데이터를 Import합니다.
- HQ 마진: 기존 CSV Import 유지 (세그먼트용)
- **게임 로그 + HQ 데일리**: 붙여넣기 방식

### 5.2 지원 형식

#### 게임 로그
```
번호	이름	닉네임	타입	베팅일시	게임종류	금액
1	홍길동	hongkd	베팅	2026-02-04 10:30:00	슬롯	50000
```

#### 데일리 입금 로그
```
번호	소속	이름(아이디)	닉네임	신청날짜	충전금액	입금자명	충전날짜	상태
1	VIP	홍길동(hong123)	hongkd	2026-02-04	100000	홍길동	2026-02-04 10:00:00	완료
```

### 5.3 시간 기반 필터링
- DB에 기록된 **최신 시간 이후의 데이터만** 처리
- 중복 Import 방지

### 5.4 API 엔드포인트
- `POST /api/v2/admin/csv-import/paste-import`: 실제 Import
- `POST /api/v2/admin/csv-import/paste-import/preview`: 미리보기

### 5.5 관련 파일
- `app/v2/services/paste_import_service.py`: 파싱 및 Import 로직
- `app/v2/api/admin/csv_import_routes.py`: API 엔드포인트

---

## 6. 관련 문서
- [07.level.md](./07.level.md) - 레벨 정책
- [08.vault.md](../vault/08.vault.md) - 금고 정책
