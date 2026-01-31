# HQ Margin 데이터 연동 상세 설계 - Phase 2: Ops Dashboard 통합

**문서 타입**: Detailed Design / Learned SoT
**도메인**: Ops / Monitoring
**작성일**: 2026-01-31
**상태**: 설계 완료

---

## 1. 목적 (Objective)

본사(HQ)에서 임포트된 마진 데이터를 운영 대시보드에 시각화하여, 관리자가 실시간으로 가입 유저들의 수익 기여도(마진)와 세그먼트 분포를 파악하고 운영 의사결정을 내릴 수 있도록 함.

## 2. 주요 기능 (Key Features)

### 2.1 HQ Margin 인사이트 카드
- **VIP (100만원+) 인원**: 가입 유저 중 마진 100만 원 이상인 'VIP' 세그먼트 수.
- **Whale (500만원+) 인원**: 가입 유저 중 충전액 500만 원 이상인 'WHALE' 세그먼트 수.
- **이탈 위험 유저**: 미접속 7일 이상이면서 마진이 양수인 유저 수.
- **최근 동기화 정보**: 마지막 CSV 임포트 시각 및 임포트 결과(성공/실패 건수) 표시.

### 2.2 실시간 데이터 연동
- 페이지 로드 시 `/api/v2/admin/ops/hq-margin-stats` 엔드포인트를 통해 최신 데이터를 페칭.
- `Audit Log`와 연동하여 임포트 히스토리를 대시보드에서 바로 확인.

---

## 3. 기술 설계 (Technical Specification)

### 3.1 Backend API 개요
- **Endpoint**: `GET /api/v2/admin/ops/status` (기존 확장) 또는 전용 엔드포인트.
- **Data Source**: `v2_user_segment` 테이블 (마진 기반 등급), `v2_admin_audit_log` (임포트 이력).

### 3.2 Frontend UI 구조
- **파일**: `src/v2/admin/pages/dashboard/OpsDashboard.tsx`
- **구현**: `BentoGrid` 내에 `HQMarginStatsCard` 컴포넌트 추가.
- **시각화**: 등급별 분포를 간단한 Bar Chart 또는 Badge 리스트로 표현.

---

## 4. 예외 처리 및 보안
- **권한 관리**: `ADMIN` 역할 이상의 사용자만 마진 데이터 요약을 볼 수 있도록 제한.
- **데이터 레이턴시**: CSV 임포트 방식의 특성상 '실시간'이 아님을 UI에 명시 (예: "2시간 전 데이터").

---

## 5. 단계별 검증
- [ ] 대시보드에 HQ 마진 카드가 정상 노출되는가?
- [ ] CSV 임포트 직후 대시보드 숫자가 갱신되는가?
- [ ] 권한이 없는 어드민 계정에서 데이터가 은닉되는가?
