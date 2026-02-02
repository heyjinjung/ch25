# HQ Margin CSV Import 구현 완료

**문서 타입**: Learned SoT
**도메인**: Golden / Ops
**작성일**: 2026-01-31
**상태**: ✅ 구현 완료 (Week 1 Phase 1)

---

## 1. 구현 개요

본사(HQ) 충전/환전 마진 데이터를 V2 골든 시스템에 CSV로 연동하여 유저 세그먼트를 자동 분류하는 기능 구현 완료.

### 1.1 구현 범위
- ✅ 백엔드: HQMarginImportService + CSV Import API 확장
- ✅ 프론트엔드: CSV Import UI 타입 선택 추가
- ✅ 본사 시스템: CSV 추출 기능 추가
- ✅ 설계 문서: SoT 기준 문서화

---

## 2. 구현 파일

### 2.1 백엔드

#### (1) 서비스 레이어
**파일**: `app/v2/services/hq_margin_import_service.py` (신규 생성)

**주요 기능**:
- `import_hq_margin_csv()`: CSV 파일 파싱 및 세그먼트 업데이트
- `_classify_segment()`: 마진 기반 자동 세그먼트 분류

**세그먼트 분류 로직**:
```python
def _classify_segment(row: pd.Series) -> str:
    # 1. CSV 명시 세그먼트 우선
    if '세그먼트' in row and pd.notna(row['세그먼트']):
        return row['세그먼트'].strip().upper()

    # 2. 자동 분류
    margin = float(row.get('총 운영 마진', 0))
    inactive_days = int(row.get('미접속 경과일', 0))
    charge_amount = float(row.get('누적 충전 금액', 0))

    if margin > 1_000_000:
        return 'VIP'
    elif inactive_days > 7 and margin > 0:
        return 'AT_RISK'
    elif charge_amount > 5_000_000:
        return 'WHALE'
    else:
        return 'COMMON'
```

**V2User 매칭**:
```python
# cc_id 또는 nickname으로 매칭
query = db.query(V2User)
if nickname:
    v2_user = query.filter(
        (V2User.cc_id == user_key) | (V2User.nickname == nickname)
    ).first()
else:
    v2_user = query.filter(V2User.cc_id == user_key).first()
```

**감사 로그**:
```python
V2AdminAuditService.log(
    db,
    admin_id=admin_id,
    action="HQ_MARGIN_IMPORT",
    category="GOLDEN",
    target_type="SEGMENT",
    changes={
        "total_rows": total_rows,
        "updated": updated_count,
        "created": created_count,
        "skipped": skipped_count,
    },
)
```

#### (2) API 레이어
**파일**: `app/v2/api/admin/csv_import_routes.py` (수정)

**변경사항**:
- `CSVImportRequest`에 `import_type` 파라미터 추가
- `import_csv_file()` 엔드포인트 분기 처리:
  ```python
  if request.import_type == "HQ_MARGIN":
      result = await HQMarginImportService.import_hq_margin_csv(...)
  else:
      result = CSVImportService.import_csv(...)
  ```

#### (3) 스키마
**파일**: `app/v2/schemas/v2_csv_import.py` (수정)

**추가 필드**:
```python
class CSVImportRequest(BaseModel):
    # 기존 필드들...
    import_type: str = Field(
        "GAME_LOG",
        description="Type of CSV import: GAME_LOG (default) or HQ_MARGIN",
    )
```

---

### 2.2 프론트엔드

**파일**: `src/v2/admin/pages/ops/CSVImportPage.tsx` (수정)

**추가 State**:
```typescript
const [importType, setImportType] = useState<"GAME_LOG" | "HQ_MARGIN">("GAME_LOG");
```

**UI 변경사항**:
1. 파일 선택 단계에 데이터 타입 선택 라디오 버튼 추가:
   - 외부 게임 로그 (GAME_LOG)
   - 💰 본사 마진 데이터 (HQ_MARGIN) - NEW 배지

2. Import 실행 시 `import_type` 파라미터 전달:
   ```typescript
   await importMutation.mutateAsync({
       file_path: filePath,
       batch_size: batchSize,
       historical_mode: isHistorical,
       emit_to_redis: emitToRedis,
       import_type: importType,  // 추가
   });
   ```

---

### 2.3 본사 시스템 (excel-calc)

**파일**: `C:\Users\JAVIS\excel-calc\app.py` (수정)

**추가 기능**:
- 섹션: "🎯 V2 골든 타겟 CSV 추출"
- 필터 옵션:
  - 최소 마진 (원)
  - 최대 미접속일
  - 세그먼트 필터 (VIP/WHALE/AT_RISK/COMMON)

**CSV 생성 로직**:
```python
# 세그먼트 자동 분류
def classify_segment(row):
    margin = row['총 운영 마진']
    inactive = row['미접속 경과일']
    charge = row['누적 충전 금액']

    if margin > 1_000_000:
        return 'VIP'
    elif inactive > 7 and margin > 0:
        return 'AT_RISK'
    elif charge > 5_000_000:
        return 'WHALE'
    else:
        return 'COMMON'

# 필터링 및 추출
export_df = display_df[
    (display_df['총 운영 마진'] >= min_margin) &
    (display_df['미접속 경과일'] <= max_inactive) &
    (display_df['세그먼트'].isin(segment_filter))
]

# CSV 다운로드
csv_data = export_df.to_csv(index=False, encoding='utf-8-sig')
st.download_button("⬇️ V2 골든 타겟 CSV 다운로드", csv_data, filename)
```

---

## 3. CSV 포맷 (SoT)

### 3.1 필수 컬럼

| 컬럼명 | 타입 | 설명 | 예시 |
|-------|------|------|------|
| 이름 (아이디) | string | V2User 매칭 키 | `user123` |
| 닉네임 | string | 보조 매칭 키 | `Jimin` |
| 누적 충전 금액 | int | 총 충전 금액 (원) | `5500000` |
| 누적 환전 금액 | int | 총 환전 금액 (원) | `4500000` |
| 총 운영 마진 | int | 충전 - 환전 (원) | `1000000` |
| 미접속 경과일 | int | 최근 충전일 기준 | `3` |

### 3.2 선택 컬럼
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| 세그먼트 | string | 명시적 분류 (VIP/WHALE/AT_RISK/COMMON) |

### 3.3 샘플 CSV
```csv
이름 (아이디),닉네임,누적 충전 금액,누적 환전 금액,총 운영 마진,미접속 경과일,세그먼트
user001,Jimin,5500000,4500000,1000000,3,VIP
user002,Alice,800000,700000,100000,2,COMMON
user003,Bob,3000000,2900000,100000,10,AT_RISK
```

---

## 4. 운영 플로우

### 4.1 본사 → V2 업로드 절차

1. **본사 시스템 (excel-calc)**
   - 최소 마진, 최대 미접속일, 세그먼트 필터 설정
   - "V2 골든 타겟 CSV 생성" 버튼 클릭
   - `v2_golden_targets_YYYYMMDD_HHMMSS.csv` 다운로드

2. **V2 어드민**
   - `/admin/ops/csv-import` 페이지 접속
   - 데이터 타입: "💰 본사 마진 데이터" 선택
   - CSV 파일 업로드
   - 검증 후 Import 실행

3. **결과 확인**
   - `/admin/ops/audit-logs` → `HQ_MARGIN_IMPORT` 액션 확인
   - `/admin/dashboard` → "본사 마진 현황" 카드 (Phase 2)

---

## 5. 테스트 시나리오

### 5.1 단위 테스트

```python
# tests/v2/test_hq_margin_import_service.py

def test_classify_segment_vip():
    row = pd.Series({'총 운영 마진': 1_500_000, '미접속 경과일': 3})
    assert HQMarginImportService._classify_segment(row) == 'VIP'

def test_classify_segment_at_risk():
    row = pd.Series({'총 운영 마진': 50_000, '미접속 경과일': 10})
    assert HQMarginImportService._classify_segment(row) == 'AT_RISK'

def test_v2user_matching_by_cc_id():
    # cc_id 매칭 테스트
    pass

def test_v2user_matching_by_nickname():
    # nickname 매칭 테스트
    pass

def test_segment_update():
    # COMMON → VIP 업데이트 테스트
    pass
```

### 5.2 통합 테스트

1. **CSV 업로드**:
   - 샘플 CSV 3행 준비 (VIP 1명, AT_RISK 1명, COMMON 1명)
   - 업로드 → 검증 → Import 실행
   - 결과: `updated_count=3`, `created_count=0`, `skipped_count=0`

2. **매칭 실패 처리**:
   - 존재하지 않는 cc_id 포함 CSV
   - 결과: `skipped_count=1`, `errors` 리스트에 "V2User not found" 메시지

3. **감사 로그 확인**:
   ```sql
   SELECT * FROM v2_admin_audit_log
   WHERE action = 'HQ_MARGIN_IMPORT'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## 6. 에러 처리

| 에러 | 원인 | 처리 |
|------|------|------|
| 필수 컬럼 누락 | CSV 포맷 오류 | `ValueError` 발생, 업로드 중단 |
| V2User 매칭 실패 | 본사/V2 DB 불일치 | 로그 기록, 해당 행 스킵 |
| DB 커밋 실패 | 트랜잭션 오류 | 전체 롤백, 에러 반환 |
| 파일 읽기 실패 | 파일 손상/권한 | `IOError` 처리 |

---

## 7. 성능 지표

| 항목 | 값 |
|-----|---|
| CSV 행 처리 속도 | ~500행/초 (예상) |
| 최대 파일 크기 | 10MB (약 50,000행) |
| DB 커밋 방식 | 단일 트랜잭션 (원자성 보장) |

---

## 8. 보안 및 권한

- **업로드 권한**: `ADMIN` 또는 `SUPER_ADMIN`
- **감사 로그**: 모든 import 작업 기록
- **개인정보**: 닉네임, 아이디 로그 시 마스킹 권장 (TODO)

---

## 9. 향후 확장 (Phase 2/3)

### Phase 2: Ops Dashboard 통합
- **목표**: 본사 마진 현황 카드 추가
- **파일**:
  - `src/v2/admin/pages/dashboard/OpsDashboard.tsx`
  - `app/v2/api/admin/ops_routes.py` (`/ops/hq-margin-stats`)

### Phase 3: 골든아워 자동화
- **목표**: 본사 충전 패턴 기반 최적 시간대 추천
- **파일**:
  - `app/v2/services/golden_scheduler_service.py`
  - `src/v2/admin/pages/game/AdminGoldenHourPage.tsx`

---

## 10. 관련 문서

- **설계 문서**: [20260131_hq_margin_csv_import_design.md](./20260131_hq_margin_csv_import_design.md)
- **골든 정책**: `docs/v2_specs/07_golden/v2_golden_hour_policy_sot_ko.md`
- **세그먼트 정책**: `docs/v2_specs/01_core/v2_user_segment_policy_sot_ko.md`
- **CSV Import 가이드**: `docs/v2_specs/90_troubleshooting/v2_csv_import_pipeline_guide_ko.md`

---

## 11. 수정 파일 목록

| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| `app/v2/services/hq_margin_import_service.py` | 신규 - HQ Margin Import 서비스 | ✅ |
| `app/v2/api/admin/csv_import_routes.py` | import_type 분기 처리 추가 | ✅ |
| `app/v2/schemas/v2_csv_import.py` | CSVImportRequest.import_type 추가 | ✅ |
| `src/v2/admin/pages/ops/CSVImportPage.tsx` | 데이터 타입 선택 UI 추가 | ✅ |
| `C:\Users\JAVIS\excel-calc\app.py` | V2 골든 타겟 CSV 추출 기능 | ✅ |

---

## 12. 변경 이력

- v1.0 (2026-01-31): Week 1 Phase 1 구현 완료

---

## 13. 빌드 및 배포 체크

### 13.1 백엔드 검증
```bash
# Python 문법 체크
python -m py_compile app/v2/services/hq_margin_import_service.py
python -m py_compile app/v2/api/admin/csv_import_routes.py
python -m py_compile app/v2/schemas/v2_csv_import.py
```
- ✅ 모든 Python 파일 문법 검증 완료

### 13.2 프론트엔드 빌드
```bash
npm run build
```
- ✅ Vite 빌드 성공 (2026-01-31 14:xx)
- ✅ TypeScript 컴파일 완료
- ✅ 프로덕션 번들 생성 완료

### 13.3 배포 확인사항
- [ ] `dist/` 폴더를 프로덕션 서버에 배포
- [ ] 백엔드 서버 재시작 (FastAPI reload)
- [ ] 어드민 페이지 접속하여 CSV Import 타입 선택 UI 확인
- [ ] 샘플 HQ Margin CSV로 임포트 테스트

---

## 14. 버그 수정 (2026-02-02)

### 14.1 [FIX] CSV 검증 시 500 에러 (Multipart Boundary 및 import_type 누락)

**증상**:
- HQ Margin CSV 업로드 시 `validate_csv_file`에서 500 Internal Server Error 발생.
- 백엔드에서 `import_type`을 넘겨주지 않아 기본값(`GAME_LOG`) 검증 로직이 실행되어 헤더 불일치 발생.

**원인**:
1. **프론트엔드 API**: `adminApi.ts`에서 `validateCSVFile` 호출 시 `import_type` 파라미터를 누락함.
2. **콘텐츠 타입 명시 오류**: `v2Client.post` 호출 시 `{ "Content-Type": "multipart/form-data" }`를 수동으로 지정하여 Axios가 자동으로 생성해야 하는 `boundary` 문자열이 누락됨. 서버(FastAPI)에서 데이터 파싱 중 에러 유발.

**해결**:
1. **프론트엔드 (`adminApi.ts`)**:
   - `validateCSVFile` 및 `uploadCSVFile`에서 수동 `Content-Type` 헤더 제거.
   - `validateCSVFile`에 `import_type` 매개변수 추가 및 FormData에 추가.
3. **백엔드 의존성 최적화 (`HQMarginImportService`)**:
   - 운영 서버에 `pandas` 라이브러리가 설치되어 있지 않아 발생한 `ModuleNotFoundError`를 해결하기 위해, 중량 라이브러리인 `pandas` 의존성을 완전히 제거.
   - 파이썬 표준 `csv` 모듈과 `io.StringIO`를 사용하여 가볍고 빠른 파싱 로직으로 전체 리팩토링 완료.
   - `chardet`을 이용한 인코딩 감지 및 `cp949` 폴백 로직은 그대로 유지하여 호환성 확보.

---

**상태**: ✅ 구현 및 버그 수정 완료 (2026-02-02)
**검증 완료**: 프론트엔드 Axios 자동 헤더 생성 및 백엔드 서비스 분기 로직 통과
