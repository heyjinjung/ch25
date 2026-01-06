# 🛠️ 개발 로그: 팀 배틀 'Grinder Rule' 구현 (Grinder Rule Dev Log)

**작성일**: 2026-01-06  
**작성자**: Antigravity Agent  
**관련 기획**: [20260104_team_battle_variant_plan_ko.md](../06_ops/events/20260104_team_battle_variant_plan_ko.md)

---

## 1. 개요 (Overview)
기존 고액 충전 위주의 팀 배틀 피로도를 완화하고, 소액/무과금 유저(Grinder)들의 활동(접속, 미션 완료)을 점수화하여 리텐션을 강화하기 위한 'Grinder Rule' 변형 규칙의 백엔드 로직 및 어드민 기능을 구현하였습니다.

---

## 2. 구현 내역 (Implementation Details)

### 2.1 데이터베이스 스키마 (Database Schema)
*   **User 테이블 확장**:
    *   `login_streak` (INT, default 0): 연속 접속 일수 저장.
    *   `last_streak_updated_at` (DATETIME): 마지막 스트릭 갱신 시각 (UTC).
*   **Migration**: Alembic 리비전 생성 및 적용 완료.

### 2.2 백엔드 로직 (Backend Logic)
1.  **연속 접속(Login Streak) 판정**:
    *   `app/api/routes/auth.py`의 `issue_token` 로직 수정.
    *   로그인 시점의 KST 날짜와 `last_streak_updated_at`을 비교하여 스트릭 증가(+1) 또는 초기화(1).
    *   **보너스 지급**: 3일(`TEAM_BATTLE_STREAK_3D_BONUS`), 7일(`TEAM_BATTLE_STREAK_7D_BONUS`) 달성 시 팀 배틀 포인트 자동 지급.
    
2.  **미션 올클리어(All-Clear) 감지**:
    *   `app/services/mission_service.py`에 `check_all_daily_completed` 메서드 추가.
    *   모든 'DAILY' 미션 완료 시 `TEAM_BATTLE_ALL_CLEAR_BONUS`(+50점) 자동 지급 로직 구현.
    *   `UserMissionProgress as UserMission` alias 버그 수정 및 `isoformat()` 날짜 비교 로직 안정화.

3.  **데이터 연동 (Data Exposure)**:
    *   로그인 응답(`TokenResponse`) 및 `authStore`에 `login_streak` 필드 추가.
    *   프론트엔드 Header 등에서 즉시 스트릭(불꽃 아이콘) 표출 가능하도록 조치.

### 2.3 어드민 UI (Admin Dashboard)
*   **유저 관리 페이지 (`UserAdminPage.tsx`)**:
    *   테이블 컬럼에 `Streak` 추가 (정렬 지원).
    *   수정 모드에서 `login_streak` 수동 보정 기능 추가 (CS/테스트 대응).
*   **API 스키마**:
    *   `AdminUserPayload`, `AdminUserUpdate`에 스트릭 필드 추가하여 CRUD 연동.

---

## 3. 검증 및 테스트 (Verification & Testing)

### 3.1 테스트 시나리오 (`tests/verify_grinder_rule.py`)
*   **[Pass] Login Streak**: 날짜 변경 시뮬레이션을 통해 스트릭 증가 및 리셋 검증 완료.
*   **[Pass] Streak Bonus**: 3일/7일차 접속 시 추가 포인트 로그 생성 확인.
*   **[Pass] Mission All-Clear**: 일일 미션 전량 완료 시 +50점 지급 트리거 작동 확인.
*   **[Pass] Gameplay Cap**: 게임 플레이 시 +1점 지급 및 일일 상한선 동작 확인.
    *   *Note*: `ExternalRankingData` 모의 객체 주입을 통해 `USAGE_REQUIRED_TODAY` 권한 에러 우회 검증.

### 3.2 충돌성 검증 (Conflict Check)
*   **Login Streak (신규)** vs **Play Streak (기존)**:
    *   **Login Streak**: `user.login_streak` 컬럼 사용, **로그인** 시 갱신.
    *   **Play Streak**: `user.play_streak` 컬럼 사용, **게임 플레이** 시 갱신.
    *   **결과**: 데이터 및 로직 수준에서 **충돌 없음**.
    *   **주의**: UI 표기 시 "접속(Login)"과 "플레이(Play/Attendance)" 용어 구분 필요.

---

## 4. 향후 계획 (Next Steps)
1.  **프론트엔드 연동**:
    *   메인 헤더/프로필 영역에 '불꽃 아이콘' 및 스트릭 숫자 표시.
    *   미션 리스트 하단에 "올클리어 시 +50점" 안내 바 추가.
2.  **팀 배틀 대시보드 개편**:
    *   '활동 대장(Grinder Ranking)' 탭 추가.
3.  **배포**:
    *   프로덕션 DB 마이그레이션 및 앱 배포.

---

## 5. 추가 구현: 웹앱 인프라 및 UX 개선 (WebApp Infrastructure & UX Logic)
사용자 편의성 및 디바이스 간 경험 일관성을 위한 텔레그램 웹앱(TWA) 연동 기능을 추가 구현하였습니다.

### 5.1 클라우드 저장소 동기화 (CloudStorage Sync)
*   **목적**: 로컬 스토리지(`localStorage`)에만 저장되던 사용자 설정을 텔레그램 클라우드에 백업하여, 기기 변경이나 앱 재설치 시에도 설정이 유지되도록 함.
*   **구현 내용**:
    *   `SoundContext.tsx`: 배경음/효과음 볼륨 및 음소거 여부를 `WebApp.CloudStorage`와 양방향 동기화.
    *   `GuideContext.tsx`: 신규 유저 가이드(튜토리얼) 완료 여부를 클라우드에 저장.

### 5.2 내비게이션 및 UI 최적화 (Navigation & UI)
*   **BackButton 연동**:
    *   `TelegramProvider.tsx`에서 텔레그램 네이티브 뒤로가기 버튼(`WebApp.BackButton`) 이벤트를 수신.
    *   `react-router-dom`의 `navigate(-1)`과 연결하여 물리적 뒤로가기 경험 제공.
    *   Root 경로(`/`, `/home`)에서는 숨기고, 하위 페이지 진입 시 자동으로 노출되도록 동적 제어.
*   **MainButton 제어**:
    *   현재 가상 포인트 경제 시스템 단계에서는 결제 프로세스가 없으므로 하단 메인 버튼(`WebApp.MainButton`)을 전역 비활성(Hide) 처리.

### 5.3 개발자 도구 확장 (Developer Tools)
*   **인앱 디버깅 (Eruda)**:
    *   기존 URL 쿼리 파라미터 방식 외에, 텔레그램 실행 링크 파라미터(`startapp=debug`) 감지 로직 추가.
    *   모바일 환경에서 `https://t.me/.../app?startapp=debug` 형태로 진입 시 즉시 개발자 콘솔 활성화 가능.
