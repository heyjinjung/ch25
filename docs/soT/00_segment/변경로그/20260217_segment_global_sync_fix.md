# 세그먼트 전역 동기화 수정 (2026-02-17)

## 증상
- 어드민에서 설정한 세그먼트가 vault 출금조건에 반영되지 않는 것처럼 보임
- HQ import의 `pending_segment`가 어드민 설정을 덮어씀 (user_id=14: AT_RISK→VIP 무단 변경)

## 근본 원인 (RCA)
1. **어드민 세그먼트 변경 시 `previous_segment` 미설정** → Grace Period 판정 불가
2. **어드민 변경 시 `pending_segment` 미초기화** → HQ import가 나중에 덮어쓸 수 있음
3. **`pending_segment` 자동적용 로직이 API 호출 시점에 실행** → 어드민 의도와 무관하게 HQ 값으로 전환
4. **`WINNER` 세그먼트가 `SEGMENT_WITHDRAWAL_CONDITIONS`에 없음** → 가장 엄격한 폴백(play=30, spend=10000)으로 빠짐

## 수정 내용

### 1. 어드민 세그먼트 변경 엔드포인트 (`user_routes.py`)
- `previous_segment = old_segment` 기록 (Grace Period 판정용)
- `pending_segment = None` 초기화 (HQ import 덮어쓰기 방지)

### 2. vault 출금조건 매핑 (`vault_service.py`)
- `WINNER` 세그먼트 추가: `{play=30, spend=10000, deposit=10000}` (AT_RISK와 동일)
- 6개 세그먼트 모두 매핑 완료: NEW, COMMON, VIP, WHALE, AT_RISK, WINNER

### 3. 세그먼트 서비스 (`segment_service.py`)
- `pending_segment` 자동적용 로직 제거
- pending은 오직 어드민 배치(`/segments/batch/apply-pending`) 실행 시에만 적용

## 전체 파이프라인 검증 결과
```
어드민 UI (UserListPage.tsx)
  → PATCH /api/v2/admin/users/{id}/segment
    → v2_user_segment.segment 직접 기록 + previous_segment + pending_segment=NULL
      → segment_service.get_current_segment() (DB 직접 조회)
        → vault_service.get_vault_info() → _get_withdrawal_targets(segment)
          → API 응답에 segment + play/spend/deposit 조건 포함
            → FE WithdrawalRulesChecklist 렌더링
```

### 운영서버 실시간 검증
| user_id | segment | play | spend | deposit |
|---------|---------|------|-------|---------|
| 14 (크리스토퍼) | AT_RISK | 30 | 10,000 | 10,000 |
| 8 | COMMON | 15 | 5,000 | 10,000 |
| 21 | AT_RISK | 30 | 10,000 | 10,000 |
| 24 | VIP | 10 | 0 | 100,000 |
| 31 | WHALE | 0 | 0 | 100,000 |
| 44 | COMMON | 15 | 5,000 | 10,000 |

## 수정 파일
- `app/v2/api/admin/user_routes.py` (L458-L464)
- `app/v2/services/vault_service.py` (L29-L36)
- `app/v2/services/segment_service.py` (L109-L112)

## 배포 필요
로컬 수정 완료. 빌드/배포 후 운영 반영.
