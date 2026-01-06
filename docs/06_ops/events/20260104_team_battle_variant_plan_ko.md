# 🎪 팀 배틀 변형 기획: 소액러 친화형 (The 'Grinder' Rule)

## 1. 개요 (Overview)
*   **배경**: 기존 팀 배틀이 '고성능 충전자' 위주로 흘러가는 피로도를 해소하고, 소액이지만 매일 앱에 체류하며 활발히 활동하는 '진성 유저(Grinders)'들에게 강력한 소속감과 보상을 제공하기 위함.
*   **목표**: "돈이 없어도 정성(플레이)으로 팀을 승리로 이끈다"는 서사 형성.

---

## 2. 핵심 메커니즘 & 상세 기술 명세 (Technical Specification)

### 2-1) 활동 기반 점수 산정 (Grinder Scoring System)
단순 '금고 적립액'이 아닌, **활동 지수**에 가중치를 둔 점수 체계.

| 활동 항목 | 획득 점수 | 1일 상한 | 관련 서비스/로직 (Source) |
|---|---|---|---|
| **게임 플레이** | +1점 / 회 | 100점 | `TeamBattleService.add_points(action="GAME_PLAY")` |
| **일일 미션 올클리어** | +50점 / 일 | 50점 | `MissionService.check_all_daily_completed` |
| **연속 접속 보너스** | 3일(+10), 7일(+30) | N/A | `Auth.issue_token` 내 스트릭 로직 |
| **팀 기여 미션(관리자)** | +100점 /건 | N/A | `AdminMission` 승인 시 포인트 지급 |

> [!IMPORTANT]
> **보상 수령 최소 조건**: 어뷰징 방지 및 성실 참여 유도를 위해 해당 시즌 **누적 300점 이상** 달성한 팀원에게만 팀 배틀 종료 후 승리 보상이 지급됩니다.

### 2-2) 데이터베이스 스키마 확장 (Schema Update)
#### [Table: `user`]
연속 접속(Streak) 트래킹을 위한 유저 테이블 확장.

```sql
ALTER TABLE `user` ADD COLUMN `login_streak` INT DEFAULT 0;
ALTER TABLE `user` ADD COLUMN `last_streak_updated_at` DATETIME NULL;
-- Index for streak performance/ranking
CREATE INDEX `idx_user_login_streak` ON `user` (`login_streak`);
```

### 2-3) 백엔드 상세 로직 (Backend Logic)

#### [A] 연속 접속(Streak) 판정 알고리즘
`AuthService` 로그인 시점에 실행 (KST 기준).

```python
# Pseudo-code for Auth.py
kst = ZoneInfo("Asia/Seoul")
now_kst = datetime.now(kst)
today = now_kst.date()

if user.last_streak_updated_at:
    last_kst = user.last_streak_updated_at.astimezone(kst).date()
    diff = (today - last_kst).days
    
    if diff == 1: # 어제 로그인했으면 스트릭 +1
        user.login_streak += 1
    elif diff > 1: # 하루 건너뛰면 리셋
        user.login_streak = 1
    # diff == 0 (오늘 이미 갱신됨) -> Pass
else:
    user.login_streak = 1

user.last_streak_updated_at = datetime.utcnow()
```

#### [B] 일일 미션 올클리어(All-Clear) 감지
`MissionService`에 전용 메서드 추가.

```python
# app/services/mission_service.py
def check_all_daily_completed(self, user_id: int) -> bool:
    # 1. 오늘자 DAILY 카테고리 활성 미션 총 개수 조회
    # 2. 유저가 달성(is_completed=True, reset_date=Today)한 미션 개수 조회
    # 3. (1 == 2) 인 경우 True 반환 및 TeamBattleService 연동
```

### 2-4) 팀 배틀 서비스 조정 (`TeamBattleService`)
*   **상수 조정**: `POINTS_PER_PLAY`를 `1`로 하향 (Play 1회당 1점).
*   **Action 가중치**:
    *   `action="GAME_PLAY"`: delta=1, 1일 100회 상한.
    *   `action="MISSION_ALL_CLEAR"`: delta=50, 1일 1회 한정.
    *   `action="STREAK_BONUS"`: delta=10/30 (3일/7일 달성 시점에만).

### 2-5) 어드민 관리 및 CRUD 명세 (Admin Operations)

#### [A] 팀 및 멤버 관리 (Team & Member CRUD)
*   **팀 생성/수정/삭제**: 어드민 UI에서 팀 이름, 아이콘, 활성화 상태 관리. (`/admin/api/team-battle/teams`)
*   **강제 이적/참여**: 특정 유저를 지정된 팀으로 즉시 할당/이동. (`move_member` 로직 활용)
*   **멤버 퇴출**: 팀에서 유저를 제거하여 해당 시즌 기록을 무효화하거나 팀 슬롯 확보.

#### [B] 개인별 활동 내역 및 점수 제어 (Individual Scoring & Logs)
*   **개별 로그 조회**: 특정 유저가 어떤 활동(주사위, 미션 등)으로 몇 점을 획득했는지 정밀 타임라인 노출.
    *   *Source*: `TeamEventLog` 테이블 (`user_id`, `season_id` 필터링)
*   **점수 수동 조정 (Override)**: 운영 시 실수나 어뷰징 발견 시, 관리자가 직접 포인트를 가감(+/-).
    *   *Endpoint*: `POST /admin/api/team-battle/teams/points` (action="ADMIN_ADJUST")
*   **실시간 활동 랭킹**: 팀 내/전체 유저 중 상위 'Grinder'들의 활동 로그 실시간 모니터링.

---

## 3. 운영 및 리스크 관리 (Operations)

### 3-1) 어뷰징 및 인플레이션 방지
*   **엄격한 Daily Cap**: 플레이 횟수는 1일 100회로 캡핑하여 매크로 효율 저하.
*   **정산 자동화**: 미션 시퀀스와 팀 점수 합산을 트랜잭션으로 처리하여 중복 지급 방지.

### 3-2) 프론트엔드 연동 가이드
*   **Attendance UI**: 유저 프로필 상단에 불꽃 모양 아이콘과 `login_streak` 숫자 표시.
*   **Team Dashboard**: "활동 대장" 탭에 최근 24시간 내 플레이 횟수 상위 유저 노출.

---

## 4. 실행 로드맵 (Implementation Roadmap)

### Phase 1: 기반 인프라 (D-Day)
1.  `user` 테이블 컬럼 추가 마이그레이션 적용.
2.  `TeamBattleService` 상수값 환경변수화 및 1차 조정.

### Phase 2: 활동 연동 (D+2)
1.  로그인 스트릭 갱신 로직 배포.
2.  `MissionService` 내 올클리어 트리거 및 팀 점수 합산 로직 배포.

### Phase 3: 어드민 및 UI 고도화 (D+4)
1.  **어드민 대시보드**: 팀원 목록 리스트 및 개인별 활동 로그 조회 UI 구현.
2.  **점수 조정 툴**: 관리자용 점수 가감 버튼 및 사유(Meta) 입력 기능.
3.  **시각화**: 연속 접속 시각화 및 팀 대시보드 내 활동 랭킹 적용.

---

## 5. 어드민 및 프론트엔드 상세 명세 (Frontend & Admin UI)

### 5-1) 유저 프론트엔드 (User App)
*   **AttendancePanel (신규)**: 메인 대시보드 또는 이벤트 페이지에 유저의 `login_streak`를 상시 노출하는 불꽃 에셋 기반 패널 추가.
*   **Mission Status**: 일일 미션 목록 하단에 '올클리어 시 팀 점수 +50' 안내 문구 및 진행 바 시각화.

### 5-2) 어드민 페이지 개편 (Admin Dashboard)

#### [A] 팀 배틀 관리 (`AdminTeamBattlePage.tsx`)
*   **기여도 테이블 확장**: 기존 `contributors` 테이블에 다음 항목 추가.
    *   **컬럼**: `연속 접속(Streak)`, `최근 활동 로그`.
    *   **액션 버튼**: 
        *   `로그(Log)`: 해당 유저의 `TeamEventLog`를 시간순으로 보여주는 모달 팝업.
        *   `조정(Adjust)`: 수동 점수 가감 팝업 (`ADMIN_ADJUST` 액션 실행).
*   **실시간 모니터링**: '활동 대장' 탭 상단에 최근 1시간 내 가장 활발한 유저 5명을 실시간으로 피딩.

#### [B] 유저 관리 (`UserAdminPage.tsx`)
*   **유저 정보 카드**: 기초 정보란에 `login_streak`와 `last_streak_updated_at` 필드 추가하여 CS 응대 시 즉시 확인 가능하게 함.
*   **수동 스트릭 보정**: 운영자가 유저의 접속 일수를 강제로 수정하거나 초기화할 수 있는 인풋 필드 추가.

### 5-3) 신규 모달: 상세 활동 로그 (Activity Log Modal)
*   **데이터 소스**: `app/models/team_battle.py`의 `TeamEventLog`.
*   **UI 구성**:
    *   `ID` | `시간(KST)` | `활동 종류` | `획득 점수` | `비고(Meta)`
    *   예: `12` | `2026-01-04 18:00` | `GAME_PLAY` | `+1` | `(Daily 15/100)`
    *   예: `13` | `2026-01-04 18:05` | `MISSION_ALL_CLEAR` | `+50` | `Daily Missions`

---

## 6. 어드민 유저 관리 및 비-텔레그램 인증 (User Management & Testing)

### 6-1) 텔레그램 독립적 유저 생성 (No-Telegram User CRUD)
*   **어드민 권한**: 어드민은 텔레그램 연동 여부와 관계없이 유저를 생성/편집할 수 있습니다.
*   **필수 항목**: `external_id` (고유 식별자), `nickname`.
*   **비-텔레그램 로그인**: 어드민에서 유저 생성 시 `password`를 설정하면, 해당 유저는 텔레그램 인증 없이도 ID/PW 기반으로 시스템에 접근할 수 있습니다.
    *   *Endpoint*: `POST /api/auth/token` (payload: `external_id`, `password`)

### 6-2) 개발 및 테스트 활용 (Local testing flow)
*   **테스트용 계정 생성**: 팀 배틀 점수 합산 로직 검증을 위해 텔레그램 연동이 없는 다수의 '더미(Dummy) Grinders'를 어드민에서 즉시 생성 가능.
*   **계정 전환**: `external_id` 기반 로그인을 통해 텔레그램 샌드박스 없이도 다양한 활동 시나리오(미션 완료, 연속 접속 등)를 로컬 환경에서 시뮬레이션 가능.

---

## 7. 주요 라우터 및 환경 설정 (Technical Configuration)

### 7-1) 관련 API 라우터 (API Routers)
구현 및 연동에 필요한 주요 엔드포인트 세트입니다.

| 기능 영역 | 라우터 파일 위치 | 베이스 경로 (Prefix) |
|---|---|---|
| **인증 및 스트릭** | `app/api/routes/auth.py` | `/api/auth` |
| **미션 데이터** | `app/api/routes/mission.py` | `/api/mission` |
| **팀 배틀 어드민** | `app/api/admin/routes/admin_team_battle.py` | `/admin/api/team-battle` |
| **유저 관리 어드민** | `app/api/admin/routes/admin_users.py` | `/admin/api/users` |

### 7-2) 환경 변수 및 레버 (Environment Variables)
`.env` 파일 또는 시스템 설정을 통해 제어되는 주요 파라미터입니다. (신규 추가 권장)

| 변수명 | 기본값(권장) | 설명 |
|---|---|---|
| `TEAM_BATTLE_POINTS_PER_PLAY` | `1` | 게임 1회 플레이당 팀 점수 |
| `TEAM_BATTLE_DAILY_PLAY_CAP` | `100` | 1일 플레이당 최대 획득 점수 상한 |
| `TEAM_BATTLE_STREAK_3D_BONUS` | `10` | 3일 연속 접속 보너스 점수 |
| `TEAM_BATTLE_STREAK_7D_BONUS` | `30` | 7일 연속 접속 보너스 점수 |
| `TEAM_BATTLE_ALL_CLEAR_BONUS` | `50` | 일일 미션 올클리어 보너스 점수 |

---

## 8. 구현 진행도 체크리스트 (Implementation Progress)

### 8.1 완료 (Completed)
- [x] **DB Schema**: `user.login_streak`, `user.last_streak_updated_at` 컬럼 및 인덱스 추가.
- [x] **Backend Logic**:
    - [x] `AuthService`: 로그인 시점 `login_streak` 계산 및 업데이트 로직 구현.
    - [x] `MissionService`: 일일 미션 올클리어(`All-Clear`) 시 팀 배틀 보너스(50점) 지급 로직 구현.
    - [x] `TeamBattleService`: 보너스(`STREAK_BONUS`, `MISSION_ALL_CLEAR`) 지급 액션 처리 및 로그 적재.
    - [x] **Streak Bonus**: 3일/7일 연속 접속 시 보너스 점수 자동 지급 확인.
- [x] **Admin Feature**:
    - [x] `UserAdminPage`: 유저 관리 테이블에 `Streak` 컬럼 추가(View/Sort) 및 수정 모달에서 수동 보정 기능 구현.
    - [x] `AdminUserApi`: 사용자 업데이트 API(`PATCH`)에 `login_streak` 필드 처리 추가.
- [x] **API Response**: `POST /api/auth/token` 응답에 `login_streak` 포함하여 프론트엔드 연동 준비 완료.
- [x] **Testing**: `tests/verify_grinder_rule.py` 테스트 슈트 통과 (로그인 스트릭, 미션 올클리어, 게임플레이 상한).

### 8.2 진행 예정 상세 계획 (Upcoming & Detailed Plan)

#### [A] Frontend UI: 스트릭 시각화 (Streak Visualization) (D+1)
*   **목표**: 유저가 자신의 연속 접속 상태를 직관적으로 인지하고 끊기지 않도록 유도.
*   **구현 위치**:
    *   **헤더(AppHeader)**: 모바일 뷰에서 우측 상단 또는 프로필 이미지 옆에 소형 `🔥 {N}` 배지 노출.
    *   **사이드바/메뉴(SidebarAppLayout)**: 유저 프로필 카드 영역에 불꽃 아이콘과 함께 "접속 스트릭: {N}일" 표기.
*   **컴포넌트 명세**:
    *   `StreakBadge.tsx`: `useAuth()` 훅을 통해 `user.login_streak` 값을 구독.
    *   **인터랙션**: 클릭 시 간단한 툴팁("매일 접속하여 보너스를 받으세요!") 또는 기존 `AttendanceStreakModal`(접속 유도용)을 띄워 시너지 효과.
*   **데이터 연동**:
    *   `src/auth/authStore.ts`의 `user.login_streak` 값 활용 (이미 구현됨).

#### [B] Admin Dashboard: 활동 랭킹 및 로그 (Activity Intelligence) (D+2)
*   **목표**: 팀 배틀 승패에 기여하는 '숨은 주역(Grinder)'들을 발굴하고 어뷰징을 감시.
*   **활동 랭킹 탭 (Grinder Ranking Tab)**:
    *   `AdminTeamBattlePage.tsx` 내 신규 탭 추가.
    *   **API**: `GET /admin/api/team-battle/stats/ranking?season_id={id}&sort=points`
    *   **테이블 컬럼**: 순위, 유저명, 총 기여 포인트, 플레이 횟수(Game), 올클리어 횟수(Mission), 최근 활동 시간.
*   **상세 활동 로그 뷰어 (Activity Log Modal)**:
    *   랭킹/멤버 리스트에서 유저 클릭 시 모달 오픈.
    *   **API**: `GET /admin/api/team-battle/logs?user_id={id}&season_id={id}`
    *   **필터링**: 전체 / 게임플레이 / 미션 / 보너스 / 어드민조정.
    *   **시각화**: 타임라인(Timeline) 형태로 하루 동안의 활동 밀집도 표현.
