# HQ Margin CSV Import 설계 문서

**문서 타입**: Learned SoT
**도메인**: Golden / Ops
**작성일**: 2026-01-31
**작성자**: Claude (based on user requirement)
**상태**: 설계 진행 중

---

## 1. 목적 (Purpose)

본사(HQ) 충전/환전 마진 데이터를 V2 골든 시스템에 연동하여:
- 실제 마진 기반 유저 세그먼트 자동 분류
- 이탈 위험 유저 식별 및 리텐션 전략 수립
- 골든아워 타겟팅 정확도 향상

---

## 2. 배경 (Background)

### 2.1 현재 시스템
- **본사 시스템** (`excel-calc`):
  - SQLite DB (`charging_data.db`)
  - 실제 충전/환전 금액 관리
  - 총 운영 마진 = 충전 금액 - 환전 금액

- **V2 시스템**:
  - 포인트 보상 앱 (리텐션 유도 목적)
  - `user_segment` 테이블로 유저 분류
  - 골든 레이더, 골든아워 운영

### 2.2 문제점
- 본사 실제 마진 데이터와 V2 세그먼트가 수동 연동
- 고마진/이탈위험 유저 파악이 실시간이 아님
- 골든아워 타겟팅이 V2 내부 데이터만 기반

---

## 3. 설계 개요 (Design Overview)

### 3.1 아키텍처

```
[본사 excel-calc]
    ↓ (CSV 추출)
[v2_golden_targets_{date}.csv]
    ↓ (어드민 업로드)
[V2 Admin: /admin/ops/csv-import]
    ↓ (HQMarginImportService)
[user_segment 테이블 업데이트]
    ↓
[Golden Radar / Dashboard 반영]
```

### 3.2 핵심 컴포넌트

| 컴포넌트 | 역할 | 파일 |
|---------|------|------|
| **HQ CSV 추출** | 본사 DB → CSV | `C:\Users\JAVIS\excel-calc\app.py` |
| **CSV Import UI** | 타입 선택 UI | `src/v2/admin/pages/ops/CSVImportPage.tsx` |
| **CSV Import API** | 라우팅 분기 | `app/v2/api/admin/csv_import_routes.py` |
| **HQMarginImportService** | 파싱 및 세그먼트 업데이트 | `app/v2/services/hq_margin_import_service.py` |
| **Ops Dashboard** | HQ 마진 통계 카드 | `src/v2/admin/pages/dashboard/OpsDashboard.tsx` |

---

## 4. CSV 포맷 SoT

### 4.1 필수 컬럼

| 컬럼명 | 타입 | 설명 | 예시 |
|-------|------|------|------|
| `이름 (아이디)` | string | V2User 매칭 키 | `user123` |
| `닉네임` | string | 보조 매칭 키 | `Jimin` |
| `누적 충전 금액` | int | 총 충전 금액 (원) | `5500000` |
| `누적 환전 금액` | int | 총 환전 금액 (원) | `4500000` |
| `총 운영 마진` | int | 충전 - 환전 (원) | `1000000` |
| `미접속 경과일` | int | 최근 충전일 기준 | `3` |
| `세그먼트` | string | (선택) 명시적 분류 | `VIP` |

### 4.2 선택 컬럼
- `최근 충전일`: datetime (YYYY-MM-DD)
- `번호`: int (본사 내부 ID)
- `소속 (추천인)`: string

### 4.3 샘플 CSV

```csv
이름 (아이디),닉네임,누적 충전 금액,누적 환전 금액,총 운영 마진,미접속 경과일,세그먼트
user001,Jimin,5500000,4500000,1000000,3,VIP
user002,Alice,800000,700000,100000,2,COMMON
user003,Bob,3000000,2900000,100000,10,AT_RISK
```

---

## 5. 세그먼트 분류 로직 SoT

### 5.1 자동 분류 규칙

```python
def classify_segment(margin: int, inactive_days: int, charge_amount: int) -> str:
    """
    우선순위:
    1. 명시적 세그먼트 (CSV에 지정된 경우)
    2. VIP: 마진 100만원 초과
    3. AT_RISK: 미접속 7일 이상 + 마진 양수
    4. WHALE: 충전 금액 500만원 초과
    5. COMMON: 기본
    """
    if margin > 1_000_000:
        return 'VIP'
    elif inactive_days > 7 and margin > 0:
        return 'AT_RISK'
    elif charge_amount > 5_000_000:
        return 'WHALE'
    else:
        return 'COMMON'
```

### 5.2 세그먼트 정의

| 세그먼트 | 조건 | 골든 전략 |
|---------|------|----------|
| `VIP` | 마진 100만원+ | 고배율 골든아워, 우선 지원 |
| `WHALE` | 충전 500만원+ | VIP 전환 유도 |
| `AT_RISK` | 7일+ 미접속 + 마진 양수 | 자동 리워드, 복귀 캠페인 |
| `COMMON` | 기본 | 일반 운영 |

---

## 6. V2User 매칭 규칙

### 6.1 매칭 우선순위

1. **정확 일치**: `V2User.cc_id == CSV['이름 (아이디)']`
2. **닉네임 일치**: `V2User.nickname == CSV['닉네임']`
3. **매칭 실패**: 로그 기록 후 스킵

### 6.2 매칭 실패 처리
- 에러 로그: `"Row {idx}: V2User not found ({user_key})"`
- 통계: `skipped_count` 증가
- 최대 50개 에러만 반환 (대량 처리 시 응답 크기 제한)

---

## 7. API 계약 (Contract)

### 7.1 Request

```python
class CSVImportRequest(BaseModel):
    file_path: str
    batch_size: int = 250
    historical_mode: bool = False
    emit_to_redis: bool = True
    import_type: str = "GAME_LOG"  # 신규: "HQ_MARGIN"
```

### 7.2 Response (HQ_MARGIN)

```python
class HQMarginImportResult(BaseModel):
    success: bool
    total_rows: int
    updated_count: int      # 기존 세그먼트 업데이트
    created_count: int      # 신규 세그먼트 생성
    skipped_count: int      # V2User 매칭 실패
    errors: List[str]       # 에러 메시지 (최대 50개)
    warnings: List[str]
```

### 7.3 샘플 응답

```json
{
  "success": true,
  "total_rows": 150,
  "updated_count": 120,
  "created_count": 25,
  "skipped_count": 5,
  "errors": [
    "Row 10: V2User not found (user999)",
    "Row 45: Invalid margin value"
  ],
  "warnings": []
}
```

---

## 8. 감사 로그 (Audit Log)

### 8.1 로그 항목

```python
V2AdminAuditService.log(
    db,
    admin_id=admin_info["username"],
    action="HQ_MARGIN_IMPORT",
    category="GOLDEN",
    target_type="SEGMENT",
    target_id=None,
    changes={
        "total_rows": 150,
        "updated": 120,
        "created": 25,
        "skipped": 5,
    },
    reason="HQ margin CSV import",
)
```

### 8.2 조회 예시

```sql
SELECT * FROM v2_admin_audit_log
WHERE action = 'HQ_MARGIN_IMPORT'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 9. 보안 및 권한

### 9.1 권한 요구사항
- **업로드**: `ADMIN` 또는 `SUPER_ADMIN` 역할
- **조회**: 모든 어드민 (감사 로그 통해)

### 9.2 데이터 보호
- CSV 파일은 임시 디렉토리에 저장 (처리 후 삭제 권장)
- 개인 식별 정보 (닉네임, 아이디) 로그에 기록 시 마스킹 검토

---

## 10. 에러 처리

### 10.1 에러 시나리오

| 에러 | 원인 | 처리 |
|------|------|------|
| 필수 컬럼 누락 | CSV 포맷 오류 | `ValueError` 발생, 업로드 중단 |
| V2User 매칭 실패 | 본사/V2 DB 불일치 | 로그 기록, 해당 행 스킵 |
| DB 커밋 실패 | 트랜잭션 오류 | 전체 롤백, 에러 반환 |
| 파일 읽기 실패 | 파일 손상/권한 | `IOError` 처리 |

### 10.2 복구 전략
- 파일 재업로드
- 부분 성공 시 skipped 유저 수동 확인
- 감사 로그로 변경 이력 추적

---

## 11. 성능 고려사항

### 11.1 배치 처리
- 대량 CSV (1000+ 행) 처리 시 배치 커밋 검토
- 현재는 단일 트랜잭션으로 처리 (원자성 보장)

### 11.2 인덱스
- `V2User.cc_id` (PK, 자동 인덱스)
- `V2User.nickname` (인덱스 확인 필요)
- `UserSegment.user_id` (FK, 인덱스)

---

## 12. 향후 확장

### 12.1 Phase 2 고려사항
- **자동 동기화**: 본사 DB 직접 연동 (API 또는 DB-to-DB)
- **실시간 반영**: Celery Beat 스케줄러로 매일 자동 임포트
- **Delta Sync**: 변경분만 업데이트 (전체 덮어쓰기 대신)

### 12.2 Dashboard 통합
- Ops Dashboard에 "HQ Margin 현황" 카드 추가
- 마지막 동기화 시각 표시
- VIP/WHALE/AT_RISK 유저 수 실시간 표시

---

## 13. 테스트 계획

### 13.1 단위 테스트
- [ ] `classify_segment()` 로직 검증
- [ ] V2User 매칭 (cc_id, nickname)
- [ ] 에러 처리 (필수 컬럼 누락, 매칭 실패)

### 13.2 통합 테스트
- [ ] CSV 업로드 → 파싱 → 세그먼트 업데이트
- [ ] 감사 로그 기록 확인
- [ ] 대량 데이터 (1000+ 행) 처리

### 13.3 E2E 테스트
- [ ] 본사 CSV 추출 → V2 업로드 → Dashboard 반영

---

## 14. 배포 체크리스트

- [ ] `HQMarginImportService` 구현
- [ ] `csv_import_routes.py` 확장
- [ ] `CSVImportPage.tsx` UI 수정
- [ ] `excel-calc/app.py` CSV 추출 버튼
- [ ] 감사 로그 검증
- [ ] 트러블슈팅 문서 작성
- [ ] Learned SoT 업데이트

---

## 15. 관련 문서

- **기술 기준**: `docs/v2_specs/00_sot_meta/00_INDEX.md`
- **트러블슈팅**: `docs/v2_specs/90_troubleshooting/README.md`
- **골든 정책**: `docs/v2_specs/07_golden/v2_golden_hour_policy_sot_ko.md`
- **세그먼트 정책**: `docs/v2_specs/01_core/v2_user_segment_policy_sot_ko.md`
- **CSV Import 가이드**: `docs/v2_specs/90_troubleshooting/v2_csv_import_pipeline_guide_ko.md`

---

## 16. 변경 이력

- v1.0 (2026-01-31, Claude): 최초 작성 - HQ Margin CSV Import 설계

---

**상태**: ✅ 설계 완료, 구현 대기
