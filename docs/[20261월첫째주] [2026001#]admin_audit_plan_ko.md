# 어드민 시스템 전수 검사 계획 (Admin System Comprehensive Audit Plan)

## 목적
어드민 패널 생태계 전체에 대한 "대규모 전수 검사(Large-Scale Total Inspection)"를 수행합니다. 모든 어드민 모듈을 매핑하고, 의존하는 스키마/모델, 작동 로직, 출력 결과를 파악하여 시스템의 무결성을 확보하고 문서화하는 것을 목표로 합니다.

## 세부 감사 계획 (Detailed Audit Plan)

각 영역별로 다음 항목을 중점적으로 "전수 검사"합니다.

### 1단계: 사용자 및 CRM 핵심 (User & Core)
- **대상 파일**: `admin_users.py`, `admin_crm.py`, `admin_segments.py`
- **데이터베이스 모델 (Schema)**:
    - **`User`**: 핵심 사용자 정보 (로그인, 상태, 레벨).
    - **`AdminUserProfile`**: 어드민 전용 사용자 메타(실명, 태그, 메모).
    - **`UserSegment`, `SegmentRule`**: 세그먼트 매핑 및 분류 규칙.
    - **`AdminMessage`, `AdminMessageInbox`**: 메시지 발송 이력 및 수신함.
- **주요 점검 항목**:
    - 사용자 관리: 검색 필터(ID/닉네임), 강제 수정, 차단/해제, 삭제 Cascade.
    - CRM: CSV 대량 임포트(오류 처리), 활동 로그 조회 최적화, 메시지 타겟팅.
    - 세그먼트: 자동 분류 규칙 정확성, 수동 태그 할당 여부.
    - **[User Request - Deep Dive]**: `external_id`, `telegram_id`, `nickname` 간 데이터 불일치(Inconsistency) 집중 점검.
        - **Identity Frame Switch**: 기존 `external_id` 중심에서 `telegram_username` 중심으로 식별 체계 전환 가능성 진단.
        - CSV 임포트 시 `username` 기반 사용자 매핑/생성 로직 검증.
        - 텔레그램 아이디 변경 시 CRM 프로필 반영 여부.


### 2단계: 경제 및 게임 운영 (Ops Economy)
- **대상 파일**: `admin_game_tokens.py`, `admin_team_battle.py`, `admin_dice/roulette/lottery.py`
- **데이터베이스 모델 (Schema)**:
    - **`GameWallet`, `UserGameWalletLedger`**: 유저 재화 잔액 및 변동 내역.
    - **`Team`, `TeamSeason`, `TeamScoreLog`**: 팀 배틀 구조 및 점수 로그.
    - **`DiceLog`, `RouletteLog`, `LotteryLog/Round`**: 게임별 플레이 기록 및 회차 정보.
- **주요 점검 항목**:
    - 토큰: 강제 지급/회수 로그 기록, 음수 잔액 방지.
    - 팀 배틀: 시즌 생성/종료 트리거, 일일 정산(Settlement) 및 보상 지급, 오토 밸런싱.
    - 게임 설정: 다이스/룰렛 확률 테이블, 로또 회차 관리 및 이월 로직.
    - **[User Request]**: 룰렛(골드/다이아) 구분 및 확률 가중치 수정 확인.

### 3단계: 인게이지먼트 및 콘텐츠 (Engagement)
- **대상 파일**: `admin_seasons.py`, `admin_survey.py`, `admin_ranking.py`
- **데이터베이스 모델 (Schema)**:
    - **`SeasonPassConfig`, `SeasonPassLevel`, `SeasonPassProgress`**: 시즌 패스 구조 및 유저 진행도. - 이건 날짜말고 어드민 관리 페이지에서 할수있는게 아무것도 없어... 너무 불편해 
    - **`Survey`, `SurveyResponse`**: 설문지 및 응답 데이터.
    - **`ExternalRanking`**: 타 플랫폼 랭킹 연동 데이터.
- **주요 점검 항목**:
    - **시즌 패스**: 레벨별 필요 XP 곡선, 무료/프리미엄 보상 설정. - 어드민에서 관리 할 수 있는 요소 다 페이지에 반영해줘 / 라우트연결까지 확인 
    - **[User Request]**: 보상 테이블을 DB 의존성 없이 어드민에서 직접 관리할 수 있는지 확인/개선.
    - **설문 조사**: 설문 생성 및 엑셀 다운로드, 참여 보상.
    - **랭킹**: 실시간 랭킹 집계, 외부 랭킹 연동.
    - **[User Request]**: 랭킹 관리 UI/UX를 관리자 친화적으로 개선 필요(검토). 

### 4단계: 금고(Vault) 시스템 (Priority)
- **대상 파일**: `admin_vault_ops.py`, `admin_vault_programs.py`, `admin_vault2.py`
- **데이터베이스 모델 (Schema)**:
    - **`User` (Vault Fields)**: `vault_balance`, `locked_balance`, `total_charge_amount` 등.
    - **`VaultProgram`**: 금고 상품 설정 (이자율, 기간).
    - **`VaultWithdrawalRequest`**: 출금 요청 내역.
- **주요 점검 항목**:
    - 운영: 타이머 강제 제어, VIP 즉시 해금(Total Charge 100k+) 확인.
    - 프로그램: 상품 설정 JSON 및 UI 문구 핫픽스.
    - 전환: Tick 배치(Locked->Available) 처리 정확성.

### 5단계: 시스템 및 기타 (System)
- **대상 파일**: `admin_dashboard.py`, `admin_feature_schedule.py`, `admin_ui_config.py`
- **데이터베이스 모델 (Schema)**:
    - **`AppUiConfig`**: 앱 전역 설정 (점검 모드, 텍스트).
    - **`FeatureSchedule`**: 기능 오픈 스케줄 (Legacy 확인 필요).
    - **`AdminAuditLog`**: 어드민 활동 로그.
- **주요 점검 항목**:
    - 대시보드: 지표(DAU, 매출)의 실시간성 및 쿼리 효율.
    - 설정: UI 문구/URL 원격 제어.
    - **[User Request]**: `admin_feature_schedule.py` 기능의 현재 사용 여부 확인 및 폐기/대체 검토. 

## 실행 방법론 (Execution Strategy)
각 모듈에 대해 다음 3-Step 프로세스를 반복합니다:
1.  **Code Review**: 엔드포인트 코드 레벨에서 숨겨진 로직(Hidden Logic)이나 파라미터 확인.
2.  **Live Test**: 검증 스크립트(`verify_admin_full.py`)에 해당 모듈 테스트 케이스 추가 및 실행.
3.  **UI Verification**: 프론트엔드 어드민 페이지에서 동일 기능 수행 후 DB 반영 확인.


## 실행 일정
1.  **준비**: 감사 보고서 템플릿 작성
2.  **1단계 (Core & Vault)**: 사용자 및 금고 모듈 감사
3.  **2단계 (Economy)**: 게임 토큰 및 팀 배틀 감사
4.  **3단계 (Engagement)**: 시즌 패스 및 설문 감사
5.  **4단계 (System)**: 대시보드 및 설정 감사
6.  **보고**: 최종 `admin_audit_report.md` 작성
