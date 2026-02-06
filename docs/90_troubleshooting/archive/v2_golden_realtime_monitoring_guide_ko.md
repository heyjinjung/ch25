# V2 Golden 실시간 모니터링 시스템 가이드

## 📋 개요

V2 Golden 실시간 모니터링 시스템은 **외부 카지노 CSV 로그 import**와 **실시간 게임 이벤트 스트림**, **인터벤션 로그 추적**을 통합한 완전한 운영 솔루션입니다.

### 🎯 주요 기능

1. **WebSocket 기반 실시간 게임 이벤트 스트리밍**
   - Redis `golden:v2:events:game` 채널 구독
   - 100개 최신 이벤트 자동 유지
   - 게임 타입별 아이콘 및 결과 색상 코딩

2. **인터벤션 로그 상세 조회**
   - 유저별 Golden 인터벤션 히스토리
   - 트리거 조건 및 액션 실행 내역
   - 쿨다운 상태 실시간 표시

3. **CSV 로그 Import 파이프라인**
   - 외부 카지노 로그 통합
   - 히스토리컬 데이터 재처리
   - Dry-run 검증 모드

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────┐
│  External CSV Logs  │
│  (과거 데이터)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  CSV Import Service │────▶│  Redis Pub/Sub      │
│  (Batch Processing) │     │  golden:v2:events:* │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                                       │ WebSocket
                                       ▼
┌─────────────────────────────────────────────────┐
│  Frontend (React + WebSocket)                   │
│  ┌─────────────────────┐  ┌─────────────────┐  │
│  │ GoldenEventStream   │  │ InterventionLog │  │
│  │ (실시간 이벤트)      │  │ (히스토리 조회) │  │
│  └─────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Golden Intervention │     │ V2GoldenLog DB      │
│ Worker (자동 트리거) │     │ (영구 저장)         │
└─────────────────────┘     └─────────────────────┘
```

---

## 📦 구성 요소

### 1️⃣ 백엔드

#### WebSocket 엔드포인트

**파일**: [app/v2/api/admin/ops_routes.py](../../app/v2/api/admin/ops_routes.py#L220-L337)

```python
@router.websocket("/ws/golden/events")
async def ws_golden_events(websocket: WebSocket):
    """
    실시간 Golden 게임 이벤트 스트리밍.

    - Redis 채널: golden:v2:events:game
    - 메시지 타입: connection, event, error
    - 자동 재연결: 클라이언트측에서 3초 후 재시도
    """
    await websocket.accept()
    # Redis pub/sub 구독
    # 이벤트 전달
```

**접속 URL**: `ws://localhost:8000/api/v2/admin/ws/golden/events`

**메시지 포맷**:

```json
// 연결 확인
{
  "type": "connection",
  "status": "connected",
  "channel": "golden:v2:events:game"
}

// 게임 이벤트
{
  "type": "event",
  "data": {
    "event_id": "csv_a1b2c3d4",
    "user_id": 1,
    "timestamp": "2025-01-20T10:00:00Z",
    "game_type": "DICE",
    "result": "LOSE",
    "bet_amount": 100,
    "payout_amount": 0,
    "current_balance": 4900
  }
}
```

#### Intervention Log API

**엔드포인트**: `GET /api/v2/admin/ops/interventions`

**파라미터**:
- `user_id` (required): 조회할 유저 ID
- `limit` (optional): 최대 로그 수 (기본 50, 최대 500)

**응답**:

```json
[
  {
    "id": 123,
    "userId": 1,
    "triggerId": "TRG_LOSE_5",
    "triggerCondition": "5 consecutive losses detected",
    "actionTaken": "Trigger_Pity_Win",
    "userBalanceBefore": 5000,
    "sessionBalanceDelta": -500,
    "recentResults": "LOSE,LOSE,LOSE,LOSE,LOSE",
    "cooldownExpiresAt": "2025-01-20T11:00:00Z",
    "createdAt": "2025-01-20T10:07:30Z"
  }
]
```

### 2️⃣ 프론트엔드

#### GoldenEventStream 컴포넌트

**파일**: [src/v2/admin/components/golden/GoldenEventStream.tsx](../../src/v2/admin/components/golden/GoldenEventStream.tsx)

**기능**:
- WebSocket 자동 연결 및 재연결
- 실시간 이벤트 스트림 (최근 100개 유지)
- 게임 타입별 아이콘 및 색상 코딩
- 연결 상태 인디케이터

**UI 컬러 코드**:
- WIN/JACKPOT: `text-emerald-400`
- LOSE: `text-red-400`
- DRAW: `text-gray-400`

#### InterventionLogTable 컴포넌트

**파일**: [src/v2/admin/components/golden/InterventionLogTable.tsx](../../src/v2/admin/components/golden/InterventionLogTable.tsx)

**기능**:
- 인터벤션 로그 테이블 표시
- 트리거 ID 배지 (색상 구분)
- 쿨다운 타이머 (남은 시간 표시)
- 잔액 변화 색상 코딩 (적자/흑자)

**트리거 배지 색상**:
- LOSE 포함: `bg-red-500/20 text-red-400`
- BAL_DROP 포함: `bg-orange-500/20 text-orange-400`
- ZERO 포함: `bg-purple-500/20 text-purple-400`

#### GoldenRealTimePage

**파일**: [src/v2/admin/pages/dashboard/GoldenRealTimePage.tsx](../../src/v2/admin/pages/dashboard/GoldenRealTimePage.tsx)

**기능**:
- 2개 탭: 실시간 이벤트 스트림 / 인터벤션 로그
- 위험 유저 빠른 선택 (Ops Dashboard 연동)
- 유저 ID 검색 및 로그 조회

**라우팅**: `/v2/admin/dashboard/golden`

---

## 🚀 사용 방법

### A. 관리자 UI에서 사용

#### 1단계: Golden 실시간 페이지 접속

```
/v2/admin/dashboard/golden
```

메뉴: `운영` → `Golden 실시간`

#### 2단계: 실시간 이벤트 스트림 확인

- **실시간 이벤트 스트림** 탭 선택
- WebSocket 연결 상태 확인 (🟢 연결됨)
- 게임 이벤트가 실시간으로 표시됨
- 최근 100개 이벤트 자동 유지

#### 3단계: 인터벤션 로그 조회

- **인터벤션 로그** 탭 선택
- 유저 ID 입력 또는 위험 유저 빠른 선택 버튼 클릭
- 해당 유저의 인터벤션 히스토리 표시
- 10초마다 자동 새로고침

### B. CSV 로그 Import

#### CLI 사용

```bash
# 1. Dry-run (검증만)
python scripts/import_external_casino_csv.py data.csv --dry-run

# 2. 실시간 import (인터벤션 트리거 활성화)
python scripts/import_external_casino_csv.py data.csv

# 3. 히스토리컬 모드 (트리거 비활성화)
python scripts/import_external_casino_csv.py data.csv --historical
```

#### Admin API 사용

```bash
# 1. 파일 업로드
curl -X POST "http://localhost:8000/v2/admin/csv-import/upload" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@external_logs.csv"

# 2. Import 실행
curl -X POST "http://localhost:8000/v2/admin/csv-import/import" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "uploads/csv_imports/casino_log_20260121_153045.csv",
    "batch_size": 100,
    "emit_to_redis": true,
    "historical_mode": false
  }'
```

---

## ⚙️ 설정

### 환경 변수

```bash
# .env
REDIS_URL=redis://localhost:6379/0

# Frontend .env
VITE_WS_URL=ws://localhost:8000
```

### Redis 채널

| 채널 | 용도 |
|------|------|
| `golden:v2:events:game` | 게임 이벤트 스트림 |
| `golden:v2:events:intervention` | 인터벤션 트리거 이벤트 |
| `golden:v2:events:csv_import` | CSV import 상태 |

### 성능 설정

| 설정 | 기본값 | 설명 |
|------|-------|------|
| 이벤트 스트림 최대 개수 | 100 | 프론트엔드에서 유지할 최대 이벤트 수 |
| 로그 조회 제한 | 50 | API 기본 로그 수 (최대 500) |
| 자동 새로고침 간격 | 10초 | 인터벤션 로그 자동 갱신 |
| WebSocket 재연결 대기 | 3초 | 연결 끊김 시 재시도 대기 시간 |

---

## 🔍 모니터링 지표

### 실시간 이벤트 스트림

- **연결 상태**: 🟢 연결됨 / 🔴 연결 중...
- **이벤트 수**: 현재 표시 중인 이벤트 개수
- **게임 타입 분포**: DICE, SLOT, ROULETTE 등
- **결과 분포**: WIN, LOSE, DRAW, JACKPOT

### 인터벤션 로그

- **트리거 빈도**: 유저별 인터벤션 발생 횟수
- **트리거 타입**: TRG_LOSE_5, TRG_BAL_DROP_50 등
- **액션 실행**: Trigger_Pity_Win, Offer_Zero_Ticket 등
- **쿨다운 상태**: 활성/만료 여부

---

## 🚨 문제 해결

### 1. WebSocket 연결 실패

**증상**:
```
WebSocket connection failed
```

**해결**:
1. Redis 서버 실행 확인: `redis-cli ping`
2. 백엔드 서버 실행 확인
3. 방화벽/프록시 설정 확인
4. CORS 설정 확인

### 2. 이벤트가 표시되지 않음

**증상**: WebSocket은 연결되었지만 이벤트가 없음

**해결**:
1. Redis 채널 확인:
   ```bash
   redis-cli PSUBSCRIBE "golden:v2:events:*"
   ```
2. CSV import 또는 실제 게임 플레이 필요
3. `historical_mode=false`로 import 했는지 확인

### 3. 인터벤션 로그 조회 실패

**증상**:
```
User not found 또는 No logs available
```

**해결**:
1. 올바른 유저 ID 입력 확인
2. 해당 유저에게 인터벤션 이력이 있는지 DB 확인:
   ```sql
   SELECT * FROM v2_golden_intervention_log WHERE user_id = ?;
   ```
3. Admin 권한 확인

### 4. 쿨다운 시간 표시 오류

**증상**: 쿨다운 시간이 음수 또는 부정확

**해결**:
- 클라이언트 및 서버 시간대 동기화 확인
- UTC 타임존 사용 확인

---

## 📊 사용 예시

### 시나리오 1: 실시간 연패 감지

```
1. GoldenEventStream에서 특정 유저의 LOSE 이벤트 연속 발생 관찰
2. 5회 연패 시 자동으로 인터벤션 트리거 (TRG_LOSE_5)
3. 인터벤션 로그 탭에서 해당 트리거 확인
4. 액션: Trigger_Pity_Win (다음 게임에서 승리 확률 증가)
```

### 시나리오 2: 잔액 급감 대응

```
1. 유저가 세션 시작 시 5000 보유
2. GoldenEventStream에서 연속 베팅으로 2400까지 하락 감지
3. 50% 잔액 하락으로 TRG_BAL_DROP_50 트리거
4. 인터벤션 로그에서 Offer_Zero_Ticket 액션 확인
5. 유저에게 무료 티켓 지급
```

### 시나리오 3: 히스토리컬 데이터 분석

```
1. 외부 카지노 CSV 로그 준비 (1개월치 데이터)
2. --historical 모드로 import:
   python scripts/import_external_casino_csv.py data.csv --historical
3. 실시간 트리거는 비활성화되지만 DB에 저장됨
4. 인터벤션 로그 탭에서 과거 패턴 분석
5. 트리거 조건 및 액션 효과성 평가
```

---

## 🧪 테스트

### WebSocket 연결 테스트

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v2/admin/ws/golden/events');

ws.onopen = () => console.log('✅ Connected');
ws.onmessage = (e) => console.log('📨 Message:', JSON.parse(e.data));
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('🔌 Closed');
```

### API 테스트

```bash
# Intervention logs 조회
curl -X GET "http://localhost:8000/api/v2/admin/ops/interventions?user_id=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### CSV Import 테스트

```bash
# 샘플 CSV로 테스트
python scripts/import_external_casino_csv.py \
  docs/v2_specs/90_troubleshooting/sample_external_casino_log.csv \
  --dry-run
```

---

## 📚 관련 문서

- [CSV Import Pipeline Guide](./v2_csv_import_pipeline_guide_ko.md) - CSV 로그 import 상세 가이드
- [Golden V2 Core Economy Glossary](../07_golden/golden_v2_core_economy_glossary_ko.md) - Golden 용어 정의
- [Backend Runtime Troubleshooting](./v2_troubleshooting_20260120_backend_runtime_ko.md) - 백엔드 트러블슈팅

---

## ✅ 체크리스트

### 배포 전 확인

- [ ] Redis 서버 실행 중
- [ ] WebSocket 엔드포인트 접근 가능
- [ ] CORS 설정 완료
- [ ] Admin 권한 설정
- [ ] 환경 변수 설정 (REDIS_URL, VITE_WS_URL)
- [ ] 로그 디렉토리 권한 확인
- [ ] CSV 샘플 파일 준비

### 운영 중 모니터링

- [ ] WebSocket 연결 상태 확인
- [ ] Redis 메모리 사용량 모니터링
- [ ] 인터벤션 로그 증가율 확인
- [ ] 쿨다운 상태 검증
- [ ] 에러 로그 확인

---

**마지막 업데이트**: 2026-01-21
**버전**: 1.0.0
**작성자**: Claude Sonnet 4.5

---

## 🎉 완료!

Golden 실시간 모니터링 시스템이 완전히 구현되었습니다.

**핵심 기능**:
- ✅ WebSocket 실시간 이벤트 스트리밍
- ✅ 인터벤션 로그 상세 조회
- ✅ CSV 로그 import 파이프라인
- ✅ Admin UI 통합

운영팀은 이제 실시간으로 Golden 시스템을 모니터링하고, 필요 시 즉시 개입할 수 있습니다!
