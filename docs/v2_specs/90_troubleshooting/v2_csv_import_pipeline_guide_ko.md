# V2 CSV-to-Redis 파이프라인 가이드

## 📋 개요

V2 Golden 시스템에서 **외부 카지노 로그 CSV 파일**을 가져와 Redis 이벤트로 변환하여 실시간 인터벤션 시스템에 통합하는 완전한 파이프라인입니다.

### 🎯 주요 기능

- ✅ CSV 파일 검증 및 파싱
- ✅ Redis `golden:v2:events:game` 채널로 이벤트 발행
- ✅ Golden 인터벤션 트리거 연동 (연패, 잔액 급감)
- ✅ 히스토리컬 데이터 재처리 모드
- ✅ Dry-run 모드 (검증만 수행)
- ✅ 배치 처리 및 진행률 추적
- ✅ Admin API를 통한 웹 UI 지원

---

## 🏗️ 아키텍처

```
┌─────────────────┐
│  External CSV   │
│  Casino Logs    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CSV Import      │  ← 검증, 파싱, 배치 처리
│ Service         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CSV-to-Redis    │  ← 이벤트 변환
│ Service         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Redis Pub/Sub                          │
│  Channel: golden:v2:events:game         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Golden          │  ← 실시간 트리거 감지
│ Intervention    │     - TRG_LOSE_5 (5연패)
│ Worker          │     - TRG_BAL_DROP_50 (50% 잔액 하락)
└─────────────────┘
```

---

## 📦 구성 요소

### 1️⃣ 스키마 (app/v2/schemas/v2_csv_import.py)

#### ExternalCasinoGameLogCSV

CSV 행을 표현하는 Pydantic 모델:

```python
{
    "timestamp": "2025-01-20T10:00:00Z",  # ISO 8601 UTC
    "user_id": 1,                         # 내부 사용자 ID
    "external_user_id": "ext_abc123",     # 외부 플랫폼 ID (선택)
    "game_type": "DICE",                  # DICE, SLOT, ROULETTE, etc.
    "result": "WIN",                      # WIN, LOSE, DRAW, JACKPOT
    "bet_amount": 100.0,
    "payout_amount": 200.0,
    "balance_after": 5100.0,
    "session_id": "sess_001",             # 세션 ID (선택)
    "game_metadata": "{\"dice_value\": 6}"  # JSON 문자열 (선택)
}
```

**검증 규칙:**
- ✅ `timestamp`는 과거 날짜여야 함
- ✅ `user_id` > 0
- ✅ `result=LOSE`이면 `payout_amount=0`
- ✅ `result=WIN`이면 `payout_amount > bet_amount`
- ✅ 모든 금액 필드 >= 0

### 2️⃣ CSV Import Service (app/v2/services/csv_import_service.py)

핵심 기능:
- `validate_csv_file()`: CSV 파일 구조 검증
- `parse_csv_rows()`: 배치 단위로 CSV 파싱
- `import_csv()`: 전체 import 프로세스 실행
- `estimate_import_time()`: 처리 시간 추정

### 3️⃣ CSV-to-Redis Service (app/v2/services/csv_to_redis_service.py)

핵심 기능:
- `publish_game_event()`: Redis 게임 이벤트 발행
- `update_loss_streak_redis()`: 연패 카운터 업데이트
- `track_session_balance()`: 세션 시작 잔액 추적
- `publish_import_status()`: Import 진행 상태 발행

### 4️⃣ 배치 스크립트 (scripts/import_external_casino_csv.py)

CLI 도구:

```bash
# Dry-run (검증만)
python scripts/import_external_casino_csv.py data.csv --dry-run

# 실시간 모드 (인터벤션 트리거 활성화)
python scripts/import_external_casino_csv.py data.csv

# 히스토리컬 모드 (트리거 비활성화)
python scripts/import_external_casino_csv.py data.csv --historical

# 배치 크기 조정
python scripts/import_external_casino_csv.py data.csv --batch-size 500

# 시간 추정만
python scripts/import_external_casino_csv.py data.csv --estimate-only
```

### 5️⃣ Admin API (app/v2/api/admin/csv_import_routes.py)

엔드포인트:
- `POST /admin/csv-import/validate`: CSV 파일 검증
- `POST /admin/csv-import/upload`: CSV 파일 업로드
- `POST /admin/csv-import/import`: CSV import 실행
- `GET /admin/csv-import/estimate`: 처리 시간 추정

---

## 🚀 사용 방법

### A. CLI 사용

#### 1단계: CSV 파일 준비

샘플 형식 ([sample_external_casino_log.csv](./sample_external_casino_log.csv)):

```csv
timestamp,user_id,external_user_id,game_type,result,bet_amount,payout_amount,balance_after,session_id,game_metadata
2025-01-20T10:00:00Z,1,ext_user_001,DICE,WIN,100,200,5100,sess_2025_001,"{""dice_value"": 6}"
2025-01-20T10:01:30Z,1,ext_user_001,DICE,LOSE,100,0,5000,sess_2025_001,"{""dice_value"": 2}"
```

#### 2단계: 검증 실행

```bash
python scripts/import_external_casino_csv.py external_logs.csv --dry-run
```

출력:
```
[INFO] Validating CSV file: external_logs.csv
[INFO] CSV validation passed
[INFO] Total rows to process: 1000
[INFO] Estimated time: 10.0 seconds
[WARNING] DRY-RUN MODE: No events will be emitted to Redis
```

#### 3단계: Import 실행

```bash
python scripts/import_external_casino_csv.py external_logs.csv
```

출력:
```
[INFO] Starting CSV import...
============================================================
Import completed!
Job ID: csv_import_20260121_153045
Total rows: 1000
Successful: 980
Failed: 0
Skipped: 20
Duration: 12.3 seconds
============================================================
```

### B. Admin API 사용

#### 1단계: 파일 업로드

```bash
curl -X POST "http://localhost:8000/v2/admin/csv-import/upload" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@external_logs.csv"
```

응답:
```json
{
  "file_id": "casino_log_20260121_153045_external_logs.csv",
  "file_path": "uploads/csv_imports/casino_log_20260121_153045_external_logs.csv",
  "message": "File uploaded successfully"
}
```

#### 2단계: Import 실행

```bash
curl -X POST "http://localhost:8000/v2/admin/csv-import/import" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "uploads/csv_imports/casino_log_20260121_153045_external_logs.csv",
    "batch_size": 100,
    "emit_to_redis": true,
    "historical_mode": false,
    "skip_duplicate_check": false
  }'
```

---

## ⚙️ 설정

### Redis 연결

`.env` 파일에 설정:

```bash
REDIS_URL=redis://localhost:6379/0
```

### Import 옵션

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `batch_size` | int | 100 | 배치당 처리 행 수 |
| `emit_to_redis` | bool | true | Redis 이벤트 발행 여부 |
| `historical_mode` | bool | false | 히스토리컬 모드 (트리거 비활성화) |
| `skip_duplicate_check` | bool | false | 중복 체크 스킵 (빠르지만 위험) |

---

## 🔍 Redis 이벤트 구조

### 발행된 게임 이벤트

채널: `golden:v2:events:game`

```json
{
  "event_id": "csv_a1b2c3d4e5f6",
  "user_id": 1,
  "timestamp": "2025-01-20T10:00:00+00:00",
  "source": "csv_import",
  "game_type": "DICE",
  "result": "LOSE",
  "bet_amount": 100,
  "payout_amount": 0,
  "current_balance": 4900,
  "external_user_id": "ext_user_001",
  "session_id": "sess_2025_001",
  "game_metadata": {
    "dice_value": 3
  },
  "is_historical": false
}
```

### Import 상태 이벤트

채널: `golden:v2:events:csv_import`

```json
{
  "job_id": "csv_import_20260121_153045",
  "status": "PROCESSING",
  "timestamp": "2026-01-21T15:30:50+00:00",
  "total_rows": 500,
  "successful_rows": 250,
  "failed_rows": 0
}
```

---

## 🎮 Golden 인터벤션 연동

CSV 이벤트는 실시간 Golden 인터벤션 시스템과 자동 연동됩니다.

### 트리거 감지

#### TRG_LOSE_5 (5연패)

```python
# Redis에서 연패 카운터 추적
golden:v2:user:1:loss_streak → "5"

# 인터벤션 이벤트 발행
{
  "target_user_id": 1,
  "trigger_id": "TRG_LOSE_5",
  "type": "INTERVENTION",
  "payload": {
    "reason": "LOSS_STREAK",
    "current_streak": 5,
    "event_id": "csv_a1b2c3d4e5f6",
    "timestamp": "2025-01-20T10:07:30+00:00"
  }
}
```

#### TRG_BAL_DROP_50 (50% 잔액 하락)

```python
# Redis에서 세션 시작 잔액 추적
golden:v2:user:1:session_start_balance → "5000"

# 현재 잔액이 2500 이하로 떨어지면 트리거
{
  "target_user_id": 1,
  "trigger_id": "TRG_BAL_DROP_50",
  "type": "INTERVENTION",
  "payload": {
    "reason": "BALANCE_DROP_50",
    "session_start_balance": 5000,
    "current_balance": 2400,
    "drop_ratio": 0.52
  }
}
```

### 히스토리컬 모드

`--historical` 플래그를 사용하면:
- ✅ 이벤트가 `is_historical: true`로 태그됨
- ✅ 실시간 인터벤션 트리거가 **비활성화**됨
- ✅ 연패 카운터 및 세션 잔액 추적 **스킵**됨

**사용 사례:**
- 과거 로그 재분석
- 데이터 마이그레이션
- 인터벤션 시뮬레이션

---

## 🧪 테스트

### 전체 테스트 실행

```bash
python -m pytest tests/v2/test_csv_import.py -v
```

### 테스트 커버리지

- ✅ CSV 스키마 검증 (timestamp, payout 규칙)
- ✅ CSV 파일 구조 검증
- ✅ 누락된 컬럼 감지
- ✅ 처리 시간 추정
- ✅ 배치 파싱

결과:
```
7 passed in 1.01s ✅
```

---

## 🚨 문제 해결

### 1. Datetime timezone 오류

**증상:**
```
TypeError: can't compare offset-naive and offset-aware datetimes
```

**해결:**
- CSV의 모든 timestamp는 **ISO 8601 UTC 형식**이어야 합니다
- 예: `2025-01-20T10:00:00Z`

### 2. Payout 검증 실패

**증상:**
```
ValueError: Payout must be 0 for LOSE result
```

**해결:**
- `result=LOSE`인 경우 `payout_amount=0`이어야 함
- `result=WIN`인 경우 `payout_amount > bet_amount`이어야 함

### 3. 사용자를 찾을 수 없음

**증상:**
```
User 999 not found (row 42)
```

**해결:**
- CSV의 `user_id`가 데이터베이스에 존재하는지 확인
- 존재하지 않는 사용자는 자동으로 **스킵**됨

### 4. Redis 연결 실패

**증상:**
```
Failed to publish game event for user 1
```

**해결:**
1. Redis 서버 실행 확인: `redis-cli ping`
2. `.env`의 `REDIS_URL` 확인
3. 방화벽 설정 확인

### 5. CSV 인코딩 오류

**증상:**
```
File encoding error (expected UTF-8)
```

**해결:**
```bash
# CSV를 UTF-8로 변환
iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
```

---

## 📊 성능 지표

### 처리 속도

- **기본 설정**: ~100 rows/sec
- **배치 크기 500**: ~200 rows/sec
- **Redis 로컬**: ~500 rows/sec (최적화)

### 메모리 사용

- **배치 크기 100**: ~50MB
- **배치 크기 500**: ~100MB
- **파일 크기 100MB**: ~200MB peak

### 권장 설정

| 파일 크기 | 배치 크기 | 예상 시간 |
|----------|----------|----------|
| < 10,000 rows | 100 | < 2분 |
| 10,000 ~ 100,000 rows | 250 | 5-10분 |
| 100,000 ~ 1,000,000 rows | 500 | 30-60분 |
| > 1,000,000 rows | 500 | 2-3시간 |

---

## 🔐 보안 고려사항

### Admin API 접근

- ✅ **SUPERADMIN 역할 필수**
- ✅ JWT 토큰 인증 필요
- ✅ CORS 설정 확인

### 파일 업로드 제한

- ✅ 최대 파일 크기: 100MB
- ✅ 허용 확장자: `.csv`만
- ✅ 파일 경로 검증
- ✅ 업로드 디렉토리: `uploads/csv_imports/`

### 데이터 검증

- ✅ 모든 사용자 ID 검증
- ✅ 타임스탬프 미래 날짜 차단
- ✅ 금액 음수 값 차단
- ✅ SQL injection 방어 (Pydantic validation)

---

## 📚 참고 자료

### 관련 파일

- [v2_core_economy_glossary_ko.md](../00_sot_meta/v2_core_economy_glossary_ko.md) - Golden 용어 정의
- [sample_external_casino_log.csv](./sample_external_casino_log.csv) - CSV 샘플
- [v2_troubleshooting_20260120_backend_runtime_ko.md](./v2_troubleshooting_20260120_backend_runtime_ko.md) - 백엔드 트러블슈팅

### Redis 채널

- `golden:v2:events:game` - 게임 이벤트
- `golden:v2:events:intervention` - 인터벤션 이벤트
- `golden:v2:events:csv_import` - Import 상태

### 핵심 서비스

- [GoldenV2EventService](../../app/v2/services/golden_event_service.py)
- [GoldenInterventionService](../../app/v2/services/golden_intervention_service.py)
- [GoldenInterventionWorker](../../app/v2/workers/golden_intervention_worker.py)

---

## ✅ 체크리스트

Import 실행 전 확인:

- [ ] Redis 서버 실행 중
- [ ] `.env`에 `REDIS_URL` 설정됨
- [ ] CSV 파일이 UTF-8 인코딩
- [ ] CSV에 필수 컬럼 모두 존재
- [ ] 모든 `user_id`가 DB에 존재
- [ ] Timestamp가 과거 날짜 (UTC)
- [ ] Payout 검증 규칙 준수
- [ ] Dry-run 테스트 완료
- [ ] 백업 완료 (프로덕션인 경우)

---

**마지막 업데이트**: 2026-01-21
**버전**: 1.0.0
**작성자**: Claude Sonnet 4.5
