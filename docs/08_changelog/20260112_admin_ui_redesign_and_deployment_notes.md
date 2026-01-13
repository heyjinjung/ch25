# 2026-01-12 Dev Log: Admin Dashboard 리디자인 및 배포 주의사항

## 1. 개요

Admin UI 개선 Phase 2(운영 대시보드 리디자인) 작업을 완료하였습니다. 12단 그리드 시스템과 실시간 모니터링 위젯(SeasonOps, LiveOpsPulse, Watchtower, CommandControl)을 연동했습니다.

## 2. 작업 내용 및 수정 사항 (Hotfixes)

### 2.1 Backend: `admin_audit.py` Import 오류 수정

- **현상**: `admin_audit.py`에 `datetime` 임포트가 누락되어 백앤드 컨테이너가 시작되지 않는 문제 발생.
- **수정**: `from datetime import datetime` 추가.
- **영향**: 모든 환경(로컬/서버)에 필수적으로 적용되어야 하는 수정사항입니다.

### 2.2 Nginx: Local Development를 위한 SSL 비활성화

- **현상**: 로컬 환경에 SSL 인증서(`cc-jm.com`)가 없어 `nginx` 컨테이너가 시작되지 않고 종료됨.
- **수정**: `nginx/nginx.conf` 내의 443(HTTPS) 서버 블록을 주석 처리.
- **[주의] 배포 시 주의사항**: 서버(Production) 환경에서는 반드시 해당 주석을 해제하고 인증서 경로가 올바른지 확인해야 합니다. 로컬 설정이 그대로 배포될 경우 HTTPS 접속이 불가능해집니다.

## 3. 배포 및 환경 차이점 관리

### 3.1 DB 경로 및 볼륨 설정

- 로컬 `docker-compose.yml`에서는 `mysql_data` 볼륨을 사용하지만, 실 서버에서는 `/var/lib/mysql` 또는 특정 호스트 경로를 사용할 수 있습니다.
- 배포 전 `docker-compose.yml`의 볼륨 마운트 설정을 서버 환경에 맞춰 점검해야 합니다.

### 3.2 데이터 시딩 (Seeding)

- 작업 중 사용된 `scripts/seed_dashboard_data.py`는 **대시보드 UI 레이아웃 및 연동 검증용**입니다.
- 대시보드는 "실시간 운영(Live Ops)"을 지향하므로, 현재 시간 기준의 활동이 없을 경우 빈 상태로 노출되는 것이 정상입니다.
- **[주의]**: 실 서버 배포 시에는 이 시드 스크립트를 실행하지 않도록 주의해야 합니다. 실 서비스는 실제 이용자 로그를 통해 작동해야 합니다.

## 5. Phase 3: 핵심 모듈 통합 & CRM 개선 (2026-01-12 오후)

### 5.1 백엔드 API 구현

#### 5.1.1 보상 타입 정의 API (`admin_reward_types.py`)

- **목적**: GameTokenType enum 기반 보상 타입 메타데이터 제공
- **엔드포인트**: `GET /admin/api/reward-types/`
- **응답**: 각 보상 타입별 표시명, 아이콘, 색상, 카테고리, 설명
- **등록**: `app/api/admin/__init__.py`에 라우터 추가
- **의의**: 하드코딩 제거, 프론트엔드가 백엔드 데이터 기반으로 동적 렌더링 가능

### 5.2 프론트엔드 페이지 및 API 클라이언트 구현

#### 5.2.1 보상 타입 관리 페이지

- **파일**: `src/admin/pages/RewardTypesPage.tsx`, `src/admin/api/adminRewardTypesApi.ts`
- **기능**:
  - TanStack Query로 백엔드 API 실시간 fetch
  - 카드 기반 UI로 각 보상의 시각적 정체성(아이콘, 색상) 표시
  - 카테고리별 구분 (게임 토큰, 금고 키, 미션 보상)
- **제거**: 기존 하드코딩된 mock 데이터 완전 삭제 ✅

#### 5.2.2 게임 관리 허브 페이지

- **파일**: `src/admin/pages/GameHubPage.tsx`, `src/admin/api/adminGameConfigApi.ts`
- **기능**:
  - 주사위/룰렛/복권 설정을 통합한 대시보드형 허브
  - 실제 게임 설정 API에서 활성 설정 수, 전체 설정 수, 최근 수정일 fetch
  - 각 게임 카드 클릭 시 해당 설정 페이지로 이동
- **제거**: 기존 하드코딩된 게임 상태/메트릭스 완전 삭제 ✅

#### 5.2.3 유저 상세 사이드 패널

- **파일**: `src/admin/components/UserDetailSidePanel.tsx`
- **통합**: `src/admin/pages/UserAdminPage.tsx`에 연동
- **기능**:
  - 회원 리스트에서 유저 클릭 시 우측 슬라이드-인 패널로 상세 정보 표시
  - 페이지 이동 없이 프로필, 자산, 활동 로그, 메모, 태그 확인
  - 빠른 보상 지급 버튼 제공
- **UX 개선**: 전체 페이지 네비게이션 최소화, CRM 워크플로우 효율화

### 5.3 라우팅 및 네비게이션 업데이트

- **`AdminRoutes.tsx`**:
  - `/admin/reward-types` → `RewardTypesPage` 등록
  - `/admin/games` → `GameHubPage` 교체 (기존 placeholder 제거)
  - `/admin/streak-rewards` 라우트 재등록
- **`AdminLayout.tsx`**:
  - "자산 및 경제 관리" 섹션에 "보상 타입 정의" 메뉴 추가 (Palette 아이콘)
  - "서비스 문구/상태" 메뉴에 Box 아이콘 적용
  - 미사용 Cog 아이콘 import 제거

### 5.4 Audit 문서 충돌 검증 결과 ✅

**검증 대상 문서**:

- `phase1_user_crm_audit_report.md`
- `phase2_economy_game_audit_report.md`
- `phase3_rewards_missions_seasons_audit_report.md`
- `phase4_games_events_audit_report.md`
- `[2026001#]admin_audit_plan_ko.md`

**검증 결과**: 모든 audit 문서와 완벽히 일치, 충돌 없음

- Reward Types 관리: Audit plan 358번 라인 제안과 정확히 일치
- 게임 관리 통합: Audit plan 게임 관리 섹션 요구사항 충족
- 유저 상세 패널: `admin_ui_improvement_checklist.md` 114번 라인 요구사항 구현

### 5.5 빌드 및 검증

- **TypeScript 컴파일**: ✅ 성공
- **Vite 프로덕션 빌드**: ✅ 성공 (Exit code: 0)
- **하드코딩 제거 확인**: ✅ 완료 (모든 페이지가 백엔드 API 데이터 사용)

## 6. 향후 계획 (Next Steps)

- **Phase 3: 모듈 기능 고도화**: 회원 관리 리포트 및 크리티컬 액션 승인 프로세스 강화.
- **표준화**: 공통 모달 및 유효성 검사 로직 단일화.
- **환경 분리**: 로컬/서버용 `docker-compose` 및 `nginx.conf` 분리 또는 환경 변수화 검토.
