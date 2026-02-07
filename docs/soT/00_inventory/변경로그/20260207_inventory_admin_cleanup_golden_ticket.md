[작성일: 2026-02-07]
[상태: SoT]
[도메인: INVENTORY]

# GOLDEN_TICKET 관리자 정리 허용

## 개요
상점 설정 오류로 인벤토리에 생성된 `GOLDEN_TICKET`을
관리자가 인벤토리 조정으로 차감(정리)할 수 있도록 허용한다.

## 변경 내용
- 어드민 인벤토리 조정 허용 목록에 `GOLDEN_TICKET` 추가.
- 기존 게임 지갑 토큰/금고 차감 정책은 유지.

## 수정 파일
- app/v2/api/admin/user_routes.py

## 검증 방법
1) 어드민 인벤토리 조정 API에서 `itemType=GOLDEN_TICKET`, `delta=-1` 호출
2) `user_inventory_item` 수량 감소 확인
3) `user_inventory_ledger`에 관리자 관련 기록 확인

## 변경 이력
- v1.0 (2026-02-07): GOLDEN_TICKET 정리 허용 추가
