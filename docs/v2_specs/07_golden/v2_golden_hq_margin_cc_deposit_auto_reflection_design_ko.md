문서 타입: 설계
버전: v2.0
작성일: 2026-02-03
작성자: GitHub Copilot
대상: 백엔드/운영/어드민
상태: 구현완료

---

## 1. 목적
HQ Margin CSV의 **누적 충전 금액**을 V2 CC 입금(금고/XP/미션/일별 델타)과 **일관되게 동기화**하기 위한 상세 설계를 정의한다.

---

## 2. 범위
### 2.1 포함
- HQ Margin CSV Import 시 **누적 충전 금액 → CC 입금 누적 스냅샷 반영**
- 증가분(Delta) 기반 **금고 입금/XP/미션/일별 델타** 자동 처리
- **미매칭 입금 로그 API** 설계 (30일 보관)
- **수동 매칭 시 즉시 재처리** (누적/델타/금고/XP/미션 동기화)
- **텔레그램 정보는 내부 시스템 매핑** (HQ CSV 미포함)
- KST(Asia/Seoul), 오전 9시 리셋(Operational Day) 준수

### 2.2 제외
- 프론트 UI 변경(어드민 페이지/알림 UI)
- HQ 원본 CSV 구조 변경
- 실시간 스트리밍/웹훅 도입

---

## 3. 현행 구조 요약 (SoT/코드 기준)

### 3.1 HQMarginImportService 현행 로직
**파일**: `app/v2/services/hq_margin_import_service.py`

```
HQ Margin CSV
  → 인코딩 감지 (cp949/utf-8)
  → 필수 컬럼 검증 (이름(아이디), 총 운영 마진, 미접속 경과일)
  → 행별 처리:
      → V2User 매칭 (cc_id OR nickname)
      → 매칭 성공: V2UserSegment 업데이트/생성
      → 매칭 실패: HQProspectiveUser에 저장 (잠재 고객)
  → 감사 로그 기록
```

**현행 CSV 컬럼**:
| 컬럼 | 설명 | 현재 사용 |
|------|------|----------|
| `이름 (아이디)` | CC ID (매칭 키) | ✅ V2User 매칭 |
| `닉네임` | 보조 매칭 키 | ✅ V2User 매칭 |
| `누적 충전 금액` | 총 충전액 | ⚠️ 잠재유저 저장만 |
| `누적 환전 금액` | 총 환전액 | ❌ 미사용 |
| `총 운영 마진` | 충전-환전 | ✅ 세그먼트 분류 |
| `미접속 경과일` | 이탈 위험 판단 | ✅ 세그먼트 분류 |

### 3.2 V2AdminCCDepositService.upsert_many 현행 로직
**파일**: `app/v2/services/admin_cc_deposit_service.py`

```python
# 핵심 처리 흐름 (코드 기준 정리)
for payload in data:
    # 1. 유저 매칭 (cc_id → telegram_username → nickname)
    user_id = _resolve_user_id(db, payload.user_id, payload.cc_id, telegram_username)
    
    # 2. 기존 누적 스냅샷 조회
    row = existing_by_user.get(user_id)
    prev_deposit = row.deposit_amount if row else 0
    
    # 3. 델타 계산 (new - old)
    deposit_delta = new_amount - prev_amount
    
    # 4. 델타 발생 시 처리
    if deposit_delta > 0:
        # 4a. UserActivity.last_charge_at 갱신
        activity.last_charge_at = row.updated_at
        
        # 4b. Vault 신호 전송 (금고 입금/제재 해제)
        vault_service.handle_deposit_increase_signal(...)
        
        # 4c. 일별 델타 기록 (KST 기준)
        ExternalRankingDailyDepositDelta 생성/업데이트
        
        # 4d. Whale 체크 (첫 50만 + 7일 300만)
        _check_whale_qualification(...)
    
    # 5. XP 적립 (100,000원당 20XP, 스텝 제한 없음)
    xp_to_add = deposit_steps * xp_per_step
    level_xp.add_xp(db, user_id, delta=xp_to_add, source="CC_DEPOSIT")
    
    # 6. 미션 진행 업데이트
    mission_service.update_progress(user_id, "CC_DEPOSIT", delta=1)
```

### 3.3 관련 데이터베이스 테이블
| 테이블 | 역할 | 주요 컬럼 |
|--------|------|----------|
| `external_ranking_data` | CC 입금 누적 스냅샷 | `user_id`, `deposit_amount`, `play_count`, `daily_base_deposit` |
| `external_ranking_daily_deposit_delta` | 일별 델타 기록 | `user_id`, `kst_date`, `deposit_delta` |
| `user_activity` | 유저 활동 타임스탬프 | `last_charge_at` |
| `hq_prospective_user` | 미가입 잠재 고객 | `cc_id`, `nickname`, `total_charge`, `segment` |
| `v2_user_segment` | 유저 세그먼트 | `user_id`, `segment` |
| `v2_user` | 유저 정보 | `external_nickname`, `hq_segment`, `telegram_username` |

### 3.4 기존 연동 포인트
- **Vault**: `V2VaultService.handle_deposit_increase_signal` 경로만 사용
- **XP**: `V2LevelXPService.add_xp` (스텝 제한 제거됨, MAX_SAFE_DELTA=100,000)
- **미션**: `V2MissionService.update_progress("CC_DEPOSIT", delta=1)`
- **세그먼트**: `HQMarginImportService._classify_segment` (VIP/WHALE/AT_RISK/COMMON)

> 주의: CC 입금 SoT 문서( `v2_cc_deposit_sot_ko.md` )와 실제 코드 경로( `ExternalRankingData`, `ExternalRankingDailyDepositDelta` ) 간 매핑은 **코드 기준**으로 정합성을 유지한다.

---

## 4. 요구사항 요약
1. HQ Margin CSV의 **누적 충전 금액**이 CC 입금 누적 값으로 반영되어야 한다.
2. 증가분(Delta)이 있을 때만 **금고/XP/미션/일별 델타**가 자동 반영되어야 한다.
3. 유저 매칭 실패 건은 **미매칭 로그**로 누적되며, 24시간 필터 조회가 가능해야 한다.
4. 모든 일자 계산은 **KST 기준, 오전 9시 리셋**을 준수해야 한다.
5. **미매칭 로그는 30일 보관** 후 자동 삭제(또는 아카이브) 처리한다.
6. **수동 매칭 시 즉시 재처리**하여 누적/델타/금고/XP/미션 동기화를 수행한다.
7. **텔레그램 정보**는 HQ CSV가 아닌 V2 내부 시스템(V2User.telegram_username)으로만 매핑한다.

---

## 5. 유저 매칭 규칙 (HQ CSV → V2User)
### 5.1 입력 키
- `이름 (아이디)` → HQ의 CC ID
- `닉네임` → 보조 키

### 5.2 매칭 우선순위 (엄격 순서)
| 순서 | 매칭 대상 | 조건 | 비고 |
|------|----------|------|------|
| 1 | `V2User.cc_id` | case-insensitive exact | **최우선** |
| 2 | `V2User.external_nickname` | case-insensitive exact | HQ 연동된 유저 |
| 3 | `V2User.nickname` | case-insensitive exact | 텔레그램 닉네임 |
| 4 | `V2User.telegram_username` | case-insensitive exact (앞 @ 제거) | 내부 시스템 매핑 |

### 5.3 모호성 처리
| 상황 | 처리 | 상태 코드 |
|------|------|----------|
| 0명 매칭 | 미매칭 로그 저장 | `USER_NOT_FOUND` |
| 2명 이상 매칭 | 미매칭 로그 저장 + 경고 | `AMBIGUOUS` |
| 1명 정확 매칭 | CC Deposit 처리 진행 | `MATCHED` |

### 5.4 텔레그램 내부 매핑 전략
HQ CSV에 텔레그램 정보가 없으므로, 다음 전략으로 내부 매핑:
1. **Self-Linking**: 유저가 미니앱에서 직접 외부 닉네임 입력 → `V2User.external_nickname` 저장
2. **Admin Manual**: 어드민이 `/admin/prospect/linking`에서 수동 매칭
3. **퍼지 매칭**: `ProspectLinkingService.find_similar_users` (SequenceMatcher, 60%+ 유사도)

---

## 6. 처리 흐름 (HQ Margin Import → CC Deposit 반영)
### 6.1 전체 시퀀스 다이어그램
```
┌─────────────────┐    ┌───────────────────────┐    ┌─────────────────────┐
│ Admin CSV Upload│    │ HQMarginImportService │    │V2AdminCCDepositSvc  │
└────────┬────────┘    └───────────┬───────────┘    └──────────┬──────────┘
         │                         │                           │
         │ 1. upload CSV           │                           │
         ├────────────────────────►│                           │
         │                         │ 2. parse & validate       │
         │                         ├──────────────────────────►│
         │                         │                           │
         │                         │ 3. for each row:          │
         │                         │    match V2User           │
         │                         │                           │
         │                         │ [MATCHED]                 │
         │                         │ 4. CCDepositCreate        │
         │                         ├──────────────────────────►│
         │                         │                           │ 5. upsert_many()
         │                         │                           │    - delta calc
         │                         │                           │    - vault signal
         │                         │                           │    - daily delta
         │                         │                           │    - xp grant
         │                         │                           │    - mission update
         │                         │◄──────────────────────────┤
         │                         │                           │
         │                         │ [UNMATCHED]               │
         │                         │ 6. save to unmatched_log  │
         │                         │                           │
         │◄────────────────────────┤ 7. return result         │
         │                         │                           │
```

### 6.2 상세 단계
```python
# HQMarginImportService.import_hq_margin_csv 확장 의사코드
for idx, row in enumerate(reader):
    user_key = row['이름 (아이디)']
    nickname = row['닉네임']
    total_charge = parse_int(row['누적 충전 금액'])  # 핵심!
    
    # 1. V2User 매칭 시도
    v2_user = match_user(db, user_key, nickname)
    
    if v2_user:
        # 2a. 매칭 성공 → CC Deposit 처리
        payload = CCDepositCreate(
            user_id=v2_user.id,
            deposit_amount=total_charge,  # 누적 금액 반영
            play_count=existing_play_count or 0
        )
        V2AdminCCDepositService.upsert_many(db, [payload])
        
        # 세그먼트 업데이트 (기존 로직 유지)
        segment = classify_segment(row)
        update_user_segment(db, v2_user.id, segment)
        
    else:
        # 2b. 매칭 실패 → 미매칭 로그 저장
        save_unmatched_log(db, UnmatchedDepositLog(
            source="HQ_MARGIN",
            raw_cc_id=user_key,
            raw_nickname=nickname,
            total_charge=total_charge,
            delta=total_charge,  # 신규는 delta = total
            kst_date=kst_today(),
            status="UNMATCHED",
            reason="USER_NOT_FOUND"
        ))
```

### 6.3 upsert_many 내부 동기화 흐름
```
CCDepositCreate(deposit_amount=800,000)
        │
        ▼
┌───────────────────────────────────────────┐
│ ExternalRankingData (누적 스냅샷)          │
│ - prev_deposit: 500,000                   │
│ - new_deposit: 800,000                    │
│ - DELTA: 300,000                          │
└───────────────────────────────────────────┘
        │ delta > 0
        ▼
┌───────────────────────────────────────────┐
│ 1. UserActivity.last_charge_at 갱신       │
│ 2. vault_service.handle_deposit_increase_signal │
│    → 제재 해제 체크                        │
│    → 금고 입금 가능성 판단                  │
│ 3. ExternalRankingDailyDepositDelta       │
│    → kst_date별 델타 누적                  │
│ 4. _check_whale_qualification             │
│    → 첫 입금 50만 + 7일 300만 체크         │
└───────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│ XP 적립 (100,000원당 20XP)                 │
│ - deposit_steps = delta // 100,000        │
│ - xp_to_add = deposit_steps * 20          │
│ - level_xp.add_xp(user_id, xp_to_add)     │
└───────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│ 미션 진행 업데이트                          │
│ - mission_service.update_progress         │
│   (user_id, "CC_DEPOSIT", delta=1)        │
└───────────────────────────────────────────┘
```

---

## 7. 데이터 모델 설계
### 7.1 기존 테이블 (활용)
| 테이블 | 용도 | 주요 필드 |
|--------|------|----------|
| `external_ranking_data` | CC 입금 누적 스냅샷 | `user_id`, `deposit_amount`, `play_count`, `daily_base_deposit`, `last_daily_reset` |
| `external_ranking_daily_deposit_delta` | 일별 델타 기록 | `user_id`, `kst_date`, `deposit_delta` |
| `user_activity` | 입금 최근성 보조 지표 | `last_charge_at` |
| `hq_prospective_user` | 미가입 잠재 고객 | `cc_id`, `nickname`, `total_charge`, `segment`, `linked_user_id`, `linked_at` |
| `v2_user` | 유저 메타 | `external_nickname`, `hq_segment`, `telegram_username` |

### 7.2 신규 테이블 (미매칭 로그)
**Table**: `v2_external_deposit_unmatched`

| 컬럼 | 타입 | 설명 | 제약 |
|---|---|---|---|
| id | INT | PK | AUTO_INCREMENT |
| source | VARCHAR(50) | 소스 구분 | DEFAULT 'HQ_MARGIN' |
| raw_cc_id | VARCHAR(100) | CSV 원본 CC ID | NOT NULL |
| raw_nickname | VARCHAR(100) | CSV 원본 닉네임 | NULLABLE |
| total_charge | BIGINT | CSV 누적 충전 금액 | NOT NULL |
| prev_total | BIGINT | 기존 누적 (기매칭 유저만) | DEFAULT 0 |
| delta | BIGINT | 계산된 델타 | DEFAULT 0 |
| kst_date | DATE | KST 기준 운영일 | INDEX |
| status | VARCHAR(20) | 상태 | `UNMATCHED`/`AMBIGUOUS`/`MATCHED`/`IGNORED` |
| matched_user_id | INT | 수동 매칭 시 연결된 유저 | FK → v2_user(id), NULLABLE |
| matched_at | DATETIME | 매칭 시각 | NULLABLE |
| processed_at | DATETIME | CC Deposit 처리 완료 시각 | NULLABLE |
| reason | VARCHAR(200) | 실패/무시 사유 | NULLABLE |
| admin_id | INT | 처리한 어드민 ID | NULLABLE |
| created_at | DATETIME | 생성 시각 (UTC) | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 수정 시각 | ON UPDATE CURRENT_TIMESTAMP |

**인덱스**:
- `idx_unmatched_kst_date` (kst_date)
- `idx_unmatched_status` (status)
- `idx_unmatched_created` (created_at)

**30일 보관 정책**:
```sql
-- 30일 이전 데이터 자동 정리 (Celery Beat 또는 DB Event)
DELETE FROM v2_external_deposit_unmatched 
WHERE created_at < NOW() - INTERVAL 30 DAY 
  AND status IN ('MATCHED', 'IGNORED');
```

### 7.3 V2UserSegment 확장 필드 (기존 활용)
```sql
-- 이미 존재하는 필드
is_synced_from_hq: BOOLEAN  -- HQ 연동 여부
last_synced_at: DATETIME    -- 마지막 동기화 시각
```

---

## 8. API 계약 (미매칭 입금 로그)

### 8.1 조회 API
`GET /api/v2/admin/deposits/unmatched`

**Query Parameters**:
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| hours | int | 24 | 조회 기간 (시간) |
| status | string | UNMATCHED | 상태 필터 (`UNMATCHED`, `AMBIGUOUS`, `ALL`) |
| limit | int | 50 | 페이지 크기 |
| offset | int | 0 | 오프셋 |

**Response**:
```json
{
  "items": [
    {
      "id": 12,
      "source": "HQ_MARGIN",
      "raw_cc_id": "user123",
      "raw_nickname": "영하19도",
      "total_charge": 800000,
      "prev_total": 0,
      "delta": 800000,
      "kst_date": "2026-02-03",
      "status": "UNMATCHED",
      "reason": "USER_NOT_FOUND",
      "created_at": "2026-02-03T10:30:00Z",
      "suggestions": [
        {"user_id": 45, "nickname": "영하20도", "similarity": 85.0}
      ]
    }
  ],
  "total": 1,
  "stats": {
    "unmatched": 1,
    "ambiguous": 0,
    "matched_today": 5
  }
}
```

### 8.2 수동 매칭 API (즉시 재처리)
`POST /api/v2/admin/deposits/unmatched/{id}/link`

**Request**:
```json
{
  "user_id": 123
}
```

**처리 로직**:
```python
def link_unmatched_deposit(db, unmatched_id: int, user_id: int, admin_id: int):
    row = db.query(UnmatchedDepositLog).get(unmatched_id)
    
    # 1. 상태 업데이트
    row.status = "MATCHED"
    row.matched_user_id = user_id
    row.matched_at = datetime.utcnow()
    row.admin_id = admin_id
    
    # 2. 즉시 CC Deposit 재처리
    payload = CCDepositCreate(
        user_id=user_id,
        deposit_amount=row.total_charge,
        play_count=0
    )
    V2AdminCCDepositService.upsert_many(db, [payload])
    
    # 3. 처리 완료 시각 기록
    row.processed_at = datetime.utcnow()
    
    db.commit()
```

**Response**:
```json
{
  "success": true,
  "message": "매칭 및 CC 입금 처리 완료",
  "result": {
    "user_id": 123,
    "deposit_amount": 800000,
    "delta_applied": 300000,
    "xp_granted": 60,
    "segment": "VIP"
  }
}
```

### 8.3 무시 처리 API
`POST /api/v2/admin/deposits/unmatched/{id}/ignore`

**Request**:
```json
{
  "reason": "DUPLICATE"
}
```

**Response**:
```json
{
  "success": true,
  "message": "미매칭 로그가 무시 처리되었습니다."
}
```

### 8.4 통계 API
`GET /api/v2/admin/deposits/unmatched/stats`

**Response**:
```json
{
  "total_unmatched": 15,
  "total_ambiguous": 3,
  "matched_last_24h": 12,
  "ignored_last_24h": 2,
  "pending_by_source": {
    "HQ_MARGIN": 15
  },
  "top_reasons": [
    {"reason": "USER_NOT_FOUND", "count": 10},
    {"reason": "AMBIGUOUS", "count": 3}
  ]
}
```

---

## 9. 동기화/부작용 정합성
- **금고**: `V2VaultService.handle_deposit_increase_signal` 경로만 사용
- **XP**: `V2AdminCCDepositService` 내부 로직 사용 (스텝 제한 제거 상태 유지)
- **미션**: `CC_DEPOSIT` 액션 업데이트 유지
- **세그먼트**: HQ Margin Import 기존 분류 로직 유지, CC 입금 반영과 분리
- **일별 입금 기준**: `ExternalRankingDailyDepositDelta` KST 운영일 기준

---

## 10. 예외/엣지 케이스
- **누적 금액 감소**: 데이터 오염으로 간주, 델타 반영 금지, 경고 로그 기록
- **동명이인(닉네임 중복)**: 매칭 중단, `AMBIGUOUS` 상태로 기록
- **부분 컬럼 누락**: 기존 HQ CSV 검증 로직으로 차단
- **대량 배치**: 250~500 단위 청크 처리 권장

---

## 11. 검증 시나리오
- [ ] 신규 유저 0 → 100,000: 금고 +100,000, 일별 델타 +100,000, XP 지급
- [ ] 100,000 → 100,000: 변동 없음, 델타 미생성
- [ ] 200,000 → 150,000: 델타 미반영 + 경고 로그 기록
- [ ] 미매칭: 미매칭 테이블 기록 + API 조회 가능

---

## 12. 이해락(Understanding Lock)
### 12.1 설계 요약
- HQ Margin CSV의 **누적 충전 금액**을 `V2AdminCCDepositService.upsert_many` 경로로 반영하여,
  기존 CC 입금 동기화(금고/XP/미션/델타)와 **완전히 동일한 경로**로 처리한다.
- 매칭 실패는 별도 테이블에 기록하고, 24시간 필터 조회 API를 제공한다.

### 12.2 가정
- HQ CSV의 `누적 충전 금액`은 **절대 누적값**이다.
- 기존 CC 입금 경로는 **증가분만 반영**하는 정책을 유지한다.

### 12.3 오픈 질문
1. 미매칭 로그 **보관 기간**: 30일 보관
2. 수동 매칭 시 **즉시 재처리**(누적 반영) 포함
3. 텔레그램 정보는 **이 시스템 내부에서 맵핑** (HQ CSV에 별도 컬럼 추가 없음)

### 12.4 합의 사항
- 미매칭 로그는 30일 보관 정책으로 설계한다.
- 수동 매칭 완료 시 즉시 재처리하여 누적/델타/금고/XP/미션 동기화를 수행한다.
- 텔레그램 정보는 HQ CSV가 아닌 내부 시스템 데이터로만 매핑한다.

---

## 13. 변경 이력
- v1.0 (2026-02-03, GitHub Copilot): HQ Margin CSV → CC 입금 자동 반영 상세 설계 초안
- v1.1 (2026-02-03, GitHub Copilot): 설계 섹션 1-8 상세 확장, 합의 사항 반영
- **v2.0 (2026-02-03, GitHub Copilot): 기능 구현 완료**
  - Alembic 마이그레이션: `20260203_1000_add_v2_external_deposit_unmatched`
  - SQLAlchemy 모델: `V2ExternalDepositUnmatched`
  - 서비스: `UnmatchedDepositLogService`
  - API 라우터: `/admin/deposits/unmatched` (조회/매칭/무시/통계/정리)
  - HQMarginImportService 확장: CC Deposit 자동 반영 + 미매칭 로그 저장
  - Celery Beat 태스크: `cleanup_old_unmatched_logs_task` (매일 02:00 KST)
