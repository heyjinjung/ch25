---
문서 타입: 변경로그
작성일: 2026-02-16
작성자: GitHub Copilot
영향 범위: BE(vault_service, segment_service), FE(WithdrawalGuideModal, vaultApi), DB(v2_user_segment)
---

# Grace Period (전환 유예 기간) 구현

## 배경
- 세그먼트 배치작업 미실행(Redis read-only)으로 26명 중 24명이 NEW에 고착
- 수동 DB 업데이트로 올바른 세그먼트로 전환 → 갑작스러운 출금 조건 변경 우려
- 유저 반발 방지를 위해 3일 Grace Period 도입

## 변경 사항

### 1. DB 모델 (`v2_user_segment`)
- `previous_segment` 컬럼 추가 (String(50), nullable)
- 세그먼트 전환 시 기존 세그먼트를 기록하여 Grace Period 판정에 활용

### 2. Alembic 마이그레이션
- `20260216_1400_add_previous_segment_column.py` 생성

### 3. BE: segment_service.py
- `get_current_segment()`: NEW 만료 시 `row.previous_segment = "NEW"` 기록 추가

### 4. BE: vault_service.py
- `SEGMENT_GRACE_PERIOD_DAYS = 3` 상수 추가
- `_get_withdrawal_targets()`: `previous_segment`, `transitioned_at` 파라미터 추가
  - previous_segment=NEW이고 전환 후 3일 이내면 NEW 조건 유지
- `get_vault_info()`: Grace Period 감지 후 `grace_period_active`, `grace_period_ends_at` 응답에 포함
- `request_withdrawal()`: 동일한 Grace Period 로직 적용 (서버사이드 검증 일관성)

### 5. FE: vaultApi.ts
- `VaultStatusResponse` 인터페이스에 `grace_period_active`, `grace_period_ends_at` 추가
- API 정규화 로직에 해당 필드 매핑 추가

### 6. FE: V2WithdrawalGuideModal.tsx
- 체크리스트 상단에 Grace Period 안내 배너 추가
- 잔여일 표시, amber 색상 경고 스타일

### 7. 텔레그램 공지 메시지
- `20260216_telegram_grace_period_notice.md` 초안 작성

## 영향받는 유저
- NEW→COMMON 전환: 16명 (user_id: 1,8,12,17,18,22,30,32,33,34,35,36,37,38,39,40)
- NEW→AT_RISK 전환: 3명 (user_id: 21,28,42)
- NEW→VIP 전환: 1명 (user_id: 24)
- Grace Period 적용 대상: 위 20명 전원 (DB에 previous_segment=NEW 설정 필요)

## 배포 절차
1. Alembic 마이그레이션 적용: `alembic upgrade head`
2. 프로덕션 DB에서 전환된 유저에 `previous_segment = 'NEW'` 설정
3. 백엔드 재시작
4. 프론트엔드 빌드/배포
5. 텔레그램 공지 발송
