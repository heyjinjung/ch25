문서 타입: 운영 로그
버전: v1.0
작성일: 2026-02-02
작성자: GitHub Copilot
대상: V2 운영/개발
상태: SoT

## 1. 목적
PATCH 단계에서 실제로 적용된 변경과 실행된 명령을 투명하게 기록한다.

## 2. 범위
- V2 Ops Dashboard 및 Analytics Dashboard의 HQ Margin 연동 패치
- 백엔드/프론트엔드 DTO 및 표시 로직 변경
- 로컬 빌드/전송 명령 기록

## 3. 변경 내역 (파일)
### 3.1 백엔드
1) app/v2/services/game_log_analytics_service.py
- HQ Margin 기반 집계 메서드 추가
- get_revenue_summary()를 HQ Margin 우선 통합 방식으로 변경
- HQ Margin 기반 주간 성장률 계산 로직 추가

2) app/v2/schemas/v2_admin_ops.py
- RevenueStatsDto에 total_charge, data_source 필드 추가

3) app/v2/api/admin/ops_routes.py
- RevenueStatsDto 생성 시 total_charge, data_source 매핑 추가

### 3.2 프론트엔드
1) src/v2/api/adminApi.ts
- RevenueStatsDto 타입에 totalCharge, dataSource 필드 추가

2) src/v2/admin/pages/ops/AnalyticsDashboard.tsx
- 데이터 소스 배지(HQ 마진/게임 로그) 표시
- 오늘 수익 카드 하단에 총 충전 표시

## 4. 실행 명령 (로컬)
- docker compose build backend
- docker save ghcr.io/heyjinjung/xmas-backend:latest -o backend-latest.tar
- scp -i C:\Users\JAVIS\.ssh\id_ed25519_vultr C:\Users\JAVIS\ch\ch25\backend-latest.tar root@149.28.135.147:/root/

## 5. 주의사항
- backend-latest.tar는 GitHub 100MB 제한으로 인해 Git에 포함 불가
- 배포는 이미지 전송 방식으로 수행

## 6. 변경 이력
- v1.0 (2026-02-02, GitHub Copilot): PATCH 단계 실행 내역 기록
