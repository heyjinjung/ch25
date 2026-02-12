문서 타입: 변경로그
버전: v1.0
작성일: 2026-02-12
작성자: GitHub Copilot
대상: V2 Admin (Economy / Latency Survival)
상태: SoT

# 20260212 - Admin Latency Survival 승인 드롭다운(미매칭 입금 로그) 미노출 수정

## 요약
어드민 Latency Survival 승인(verify) 시, 입금 로그 선택 드롭다운이 비어 보이는 문제를 수정했다.

- 원인 1) 백엔드 `/api/v2/admin/economy/deposits/unmatched`가 운영 입금 로그 소스와 맞지 않거나 조건이 과도하게 좁아 빈 배열을 반환할 수 있었음
- 원인 2) 프론트 조회 시간창이 24시간으로 고정되어 운영상 최근 며칠치 매칭이 필요한 경우 목록이 비었음

## 변경 내용
### Backend
- `/api/v2/admin/economy/deposits/unmatched`
  - 조회 소스를 `HQDailyDepositLog` 기반으로 변경
  - 이미 latency evidence에 `matched_log_id`로 연결된 로그는 제외

### Frontend
- Latency Survival 페이지에서 미매칭 입금로그 조회 범위를 최신 5일(120h)로 확대

## 수정 파일
- [app/v2/api/admin/economy_routes.py](../../../app/v2/api/admin/economy_routes.py)
- [src/v2/admin/pages/economy/LatencySurvivalPage.tsx](../../../src/v2/admin/pages/economy/LatencySurvivalPage.tsx)

## 검증
- `npm run build` 성공
- 어드민 승인 다이얼로그에서 `GET /api/v2/admin/economy/deposits/unmatched?hours=120` 응답 기반으로 옵션 렌더링 확인
