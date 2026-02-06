# 붙여넣기 Import 서비스 개선

**작성일**: 2026-02-04  
**작성자**: AI Assistant  
**상태**: 로컬 완료, 배포 대기

---

## 1. 문제 정의

| 항목 | 내용 |
|------|------|
| **대상 기능** | POST /api/v2/admin/csv-import/paste-import |
| **증상** | 입금 데이터 Import 시 시간 정보 손실 (00:00:00), 중복/누락 건 선택 불가 |
| **영향 범위** | 어드민 입금 Import 기능 전체 |

---

## 2. 근본 원인

### 2.1 시간 정보 손실
- **원인**: 9컬럼 형식에서 `parts[7]` (충전날짜)를 사용 → 시간 정보 없음
- **해결**: `parts[4]` (신청날짜)에 시간 정보(`:` 포함)가 있으면 우선 사용

### 2.2 기존 기록 차단
- **원인**: `latest_deposit_at` 조회 시 00:00:00 기록도 포함되어 실제보다 최신으로 인식
- **해결**: `HOUR(deposit_at) != 0` 조건 추가하여 00:00:00 기록 제외

### 2.3 선택적 Import 불가
- **원인**: 미리보기에서 상태만 확인 가능, 개별 선택 기능 없음
- **해결**: 체크박스 UI + `selected_indices` 파라미터 추가

---

## 3. 수정된 파일 목록

### Backend
| 파일 | 변경 내용 |
|------|----------|
| `app/v2/api/admin/csv_import_routes.py` | Preview API 상세 상태 반환, `selected_indices` 파라미터 추가 |
| `app/v2/services/paste_import_service.py` | 시간 추출 로직 수정, 선택적 Import 지원 |

### Frontend
| 파일 | 변경 내용 |
|------|----------|
| `src/v2/api/adminApi.ts` | `PreviewItem`, `DepositStatus` 타입 추가, `selected_indices` 추가 |
| `src/v2/admin/pages/ops/PasteImportPage.tsx` | 체크박스 UI, 상태 필터, 전체선택/해제 기능 |

---

## 4. API 변경사항

### 4.1 Preview API 응답 (개선됨)

```json
{
  "success": true,
  "import_type": "DAILY_DEPOSIT",
  "total_parsed": 17,
  "matched_count": 5,
  "not_found_count": 10,
  "duplicate_count": 2,
  "skipped_old_count": 0,
  "latest_in_db": "2026-02-04T18:19:00",
  "preview": [
    {
      "index": 0,
      "nickname": "민똘이",
      "amount": 30000,
      "deposit_at": "2026-02-04T18:19:00",
      "depositor": "현민수",
      "status": "MATCHED",
      "user_id": 12
    }
  ]
}
```

### 4.2 Import API 요청 (개선됨)

```json
{
  "text": "...",
  "import_type": "DAILY_DEPOSIT",
  "selected_indices": [0, 2, 5]  // null이면 전체
}
```

---

## 5. 상태 분류

| 상태 | 의미 | Import 가능 |
|------|------|-------------|
| `MATCHED` | 유저 매칭됨 | ✅ |
| `NOT_FOUND` | 유저 미등록 | ❌ |
| `DUPLICATE` | 이미 Import됨 | ❌ |
| `SKIPPED_OLD` | 기존 기록 이전 | ❌ |

---

## 6. 운영 DB 초기화 내역 (2026-02-04)

```sql
-- 입금 기록 초기화
DELETE FROM hq_daily_deposit_log;
UPDATE external_ranking_data SET deposit_amount=0, deposit_remainder=0, daily_base_deposit=0;

-- 레벨/XP 초기화
UPDATE v2_user SET level=1, xp=0 WHERE id > 1;
UPDATE user_level_progress SET level=1, xp=0;

-- 티켓 초기화
UPDATE user_game_wallet SET balance=0;
```

---

## 7. 배포 체크리스트

- [ ] `docker compose build --no-cache`
- [ ] `docker compose up -d`
- [ ] 백엔드 로그 확인: `docker logs xmas-backend --tail=50`
- [ ] 프론트엔드 빌드 확인

---

## 8. 테스트 방법

1. 어드민 > 붙여넣기 Import 페이지 접속
2. HQ에서 입금 데이터 복사 후 붙여넣기
3. 미리보기 클릭 → 각 행 상태 확인 (MATCHED/NOT_FOUND/DUPLICATE/SKIPPED_OLD)
4. 체크박스로 원하는 항목 선택/해제
5. "선택된 N건 Import 실행" 클릭
6. 결과 확인

---

## 9. 관련 문서

- [입금 Import SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/12.hq_margin_csv_import_comprehensive.md)
- [레벨 시스템 SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/level/20260204_v2_sot_consolidation.md)
