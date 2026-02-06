문서 타입: 패치
버전: v1.0
작성일: 2026-02-04
작성자: GitHub Copilot
대상: V2 운영/개발 담당자
상태: 적용 완료

# 어드민 회수(REVOKE) 로그 분류 정합성 패치

## 1. 배경
- 어드민 회수(지급 반대) 기록이 로그에서 `USE`로 표시되어 통계/필터가 왜곡됨.
- 실제 회수 여부를 명확히 구분할 필요가 있음.

## 2. 변경 내용
- `GET /api/v2/admin/inventory/logs` 응답에서 회수 로그를 **REVOKE**로 분류.
- 판단 기준:
  - **지갑(티켓) 로그**: `delta < 0` 이고 `label`이 `ADMIN` 접두사일 때 `REVOKE`
  - **인벤토리 로그**: `change_amount < 0` 이고 `related_id`가 `admin_` 또는 `admin:` 접두사일 때 `REVOKE`

## 3. 영향 범위
- 티켓/인벤토리 관리 페이지의 회수 필터 및 통계가 정상적으로 동작.
- 기존 `USE` 분류는 유저 소비 로그에만 적용됨.

## 4. 수정 파일
- `app/v2/api/admin/inventory_routes.py`
- [W06 INVENTORY 트러블슈팅](../../../90_troubleshooting/W06_INVENTORY_troubleshooting.md)

## 5. 검증 방법
1. 어드민에서 티켓/아이템 회수 실행
2. `/api/v2/admin/inventory/logs` 확인
3. 해당 항목 `type=REVOKE` 표시 확인

## 6. 변경 이력
- v1.0 (2026-02-04): 어드민 회수 로그 REVOKE 분류 추가
