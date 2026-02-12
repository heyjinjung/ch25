문서 타입: 변경로그
버전: v1.0
작성일: 2026-02-12
작성자: GitHub Copilot
대상: Admin - 회원 관리(유저 목록)
상태: SoT

## 1. 목적
어드민 회원관리 화면에서 `레벨` 정렬을 선택해도 순서대로 정렬되지 않는 문제를 수정한다.

## 2. 원인
프론트는 `/api/v2/admin/users` 호출 시 `sortBy=level`을 전달하지만, 백엔드 라우트의 정렬 분기에서 `level`(및 `last_active`) 케이스가 누락되어 기본 정렬(업데이트 시각)로 처리되었다.

## 3. 변경 내용
- `/api/v2/admin/users` 정렬 분기에 `sortBy=level` 및 `sortBy=last_active` 지원 추가
- 동일 정렬값에서 결과가 흔들리지 않도록 `id` 타이브레이커 추가

## 4. 영향 범위
- 어드민 유저 목록 정렬(레벨/최근 접속일 포함) 동작만 변경
- API 스키마/응답 구조 변경 없음

## 5. 검증
- `python -m compileall app/v2/api/admin/user_routes.py`
- `npm run build`

## 6. 롤백
- [app/v2/api/admin/user_routes.py](app/v2/api/admin/user_routes.py)에서 `sortBy` 분기 추가분 및 `order_by` 타이브레이커를 제거하면 이전 동작으로 복귀

## 7. 변경 이력
- v1.0 (2026-02-12, GitHub Copilot): 유저 목록 레벨 정렬 미적용 버그 수정
