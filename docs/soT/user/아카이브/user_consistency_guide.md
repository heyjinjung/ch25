# 유저 영역 정합성 저하/충돌 해결 상세 가이드 (User Consistency Guide)

본 문서는 `02.user.md`에서 식별된 주요 정합성 이슈들을 실제 코드레벨에서 해결하고 운영 정합성을 확보하기 위한 단계별 가이드를 제공합니다.

- 기준: 유저 식별/운영 경로는 `v2_user(cc_id)` 및 `/api/v2/*`를 우선한다. (단, 금고 SoT는 `user.vault_locked_balance`) (**V2 정책 반영**)

---

## 1. [정합성] 09:00 KST 리셋 정책 통합 가이드

### [현황 및 문제점]
- **VaultService**: 운영일(Operational Date) 기준 09:00 KST 리셋 사용 중.
- **MissionService**: `streak_day_reset_hour_kst` 설정을 읽지만 기본값이 0(자정)으로 설정된 경우가 많아 불일치 발생.
- **Admin Stats**: 대시보드 통계 쿼리가 자정(00:00 KST) 기준으로 작성되어 실무 운영 지표와 괴리.

### [단계별 수정 가이드]

#### Step 1: `MissionService` 리셋 시간 기본값 통일
- **위치**: `app/services/mission_service.py`
- **수정 내용**: `_operational_play_date`의 기본 리셋 시간을 9로 수정.
```python
# app/services/mission_service.py
def _operational_play_date(self, now_tz: datetime) -> date:
    # 기본값을 0에서 9로 변경하여 VaultService와 통일
    reset_hour_raw = getattr(self.settings, "streak_day_reset_hour_kst", 9) 
    reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)
    # ...
```

#### Step 2: Admin 통계 쿼리 9AM 기준 적용
- **위치**: `app/v2/services/vault_service.py` 내 `get_admin_stats`
- **수정 내용**: 자정 기준 조회 로직을 `_operational_date_kst` 로직을 활용한 9AM 기준으로 변경.
```python
# app/v2/services/vault_service.py
def get_admin_stats(self, db: Session) -> dict:
    settings = get_settings()
    reset_hour = getattr(settings, "streak_day_reset_hour_kst", 9) or 9
    KST = ZoneInfo("Asia/Seoul")
    now_kst = datetime.now(KST)
    
    # 당일 9AM 기준 시작 시점 계산
    today_9am_kst = now_kst.replace(hour=reset_hour, minute=0, second=0, microsecond=0)
    if now_kst.hour < reset_hour:
        today_9am_kst -= timedelta(days=1)
    
    today_start_utc = today_9am_kst.astimezone(timezone.utc).replace(tzinfo=None)
    # ... 이후 쿼리에서 today_start_utc 사용
```

### [테스트 케이스]
- [ ] 오전 8시 50분에 미션 완료/금고 적립 후 9시 10분에 데이터가 '오늘'이 아닌 '어제'로 집계되는지 확인.
- [ ] Admin 대시보드 지표가 9AM 리셋 시점 전후로 정확히 절상(Rollover) 되는지 확인.

---

## 2. [정책/구현 충돌] `benefits_suspended` (제재) 로직 정식화

### [현황 및 문제점]
- 정책상 "7일간 무입금 시 혜택 제재"가 명시되어 있으나, DB 필드 없이 매번 계산식으로 처리되어 운영상 추적이 어려움.

### [단계별 수정 가이드]

#### Step 1: `VaultService` 내 제재 판정 메서드 명시
- **위치**: `app/v2/services/vault_service.py`
- **추가 내용**: `is_benefits_suspended` 전용 메서드 구현.
```python
def is_benefits_suspended(self, db: Session, user_id: int, now_dt: datetime) -> bool:
    # 7일간 입금 합계 확인 (이미 get_vault_info에 유사 로직 존재)
    seven_days_ago_date = (now_dt - timedelta(days=6)).date()
    deposit_7d = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.user_id == user_id,
        ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date,
    ).scalar() or 0
    
    return deposit_7d < 1  # 7일간 입금이 0이면 true
```

#### Step 2: FE 표시값 일관성 확보
- **위치**: `src/v2/schemas/user.ts` (또는 해당 DTO)
- **수정 내용**: `benefits_suspended` 필드를 Boolean으로 명시하고 API 응답에 포함.

### [운영 체크리스트]
- [ ] 유저 정보 상세 페이지(Admin)에 "최근 7일 입금액"과 "제재 여부"를 계산식 기반으로 실시간 표시하도록 UI 패치.

---

## 3. [운영 리스크] 세그먼트 배치 동기화 점검 및 자동화

### [현황 및 문제점]
- `v2_user_segment` 테이블이 배치 미작동 시 업데이트되지 않아 혜택 오지급 발생 가능.

### [단계별 가이드]

#### Step 1: 배치 실행 스크립트 등록 (Cron)
- **명령어**: `python -m scripts.v2_segment_users`
- **주기**: 매일 09:05 KST (9시 리셋 직후)
- **코드 점검**: `scripts/v2_segment_users.py` 내에 `db.commit()` 누락 여부 필히 확인.

#### Step 2: 세그먼트 정합성 감사 쿼리 (Monitoring)
- **DB 쿼리**: 최근 24시간 내 업데이트되지 않은 유저 수 확인.
```sql
SELECT count(*) FROM v2_user_segment 
WHERE updated_at < NOW() - INTERVAL '25 hours';
```

---

## 4. [DB] PK/UNIQUE/INDEX 누락 방지 및 정합성 패치

### [DB 마이그레이션 쿼리]
- **핵심 인덱스 추가**: 조회 성능 및 정합성 보장.
```sql
-- v2_user_segment 조회 성능 최적화
CREATE INDEX IF NOT EXISTS idx_v2_user_segment_val ON v2_user_segment(segment);

-- v2_exchange_log와 user_id 정합성 강화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_v2_exchange_log_user_id ON v2_exchange_log(user_id);
```

### [데이터 통합 감사 SQL (Consistency Check)]
- **v2_user - user 테이블간 이관 누락 체크**:
```sql
-- user에는 있지만 v2_user에는 없는 유저 (이관 누락)
SELECT id, nickname FROM user 
WHERE id NOT IN (SELECT id FROM v2_user);
```

---

## 5. 최종 운영 체크리스트
- [ ] **Reset**: Vault/Mission 모두 9AM 리셋 확인 완료.
- [ ] **Suspension**: 7일 무입금 유저 `benefits_suspended` 응답값 검증.
- [ ] **Batch**: `scripts/v2_segment_users.py` 로그 정상 기록 확인.
- [ ] **DB**: `v2_user`와 `user` 간 ID/CC_ID 정합성 100% 일치 확인.
