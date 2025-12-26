# 업데이트 로그 (2025-12-13 ~ 2025-12-18)

요청: 12일 이후 로그가 비어 있어 13~18일 사이 업데이트 내역을 수집했습니다.

## 기간 요약
- 로컬 기본 브랜치: 12/13~12/17 신규 커밋 없음, 12/18에 `mamam1281` 커밋 5건.
- 원격 `heyjin/main`: 12/14~12/18 사이 `heyjinjung` 커밋 다수 확인(퍼널/신규회원/시즌패스/팀배틀/크리스마스 테마 개선 등).

## 커밋 상세 (최신순)
- d763f079e006a3b497cdb44fb6375e5880c33514 — 2025-12-18 15:00:57 +0900 — mamam1281 — refactor: update import statements to use config module; enhance season pass progress calculation logic
  - 파일: app/services/admin_external_ranking_service.py, app/services/game_wallet_service.py, app/services/reward_service.py, app/services/season_pass_service.py, docs/ONBOARDING_CHECKLIST.md, requirements.txt, src/components/season-pass/SeasonPassBar.tsx
  - 영향: 시즌패스 진행 계산 로직 개선, 서비스 모듈 import 정리, 온보딩 체크리스트와 의존성(requirements) 업데이트, 프론트 시즌패스 바 UI 조정.

- 7ac5b04204fae2ce5cfb7aa6bddeff8561b011a4 — 2025-12-18 14:36:17 +0900 — mamam1281 — docs: add ops checkpoints for env and DB selection
  - 파일: docs/ONBOARDING_CHECKLIST.md
  - 영향: 온보딩 체크리스트에 운영/환경/DB 선택 관련 점검 항목 추가.

- 59b1884573ee50e3d376b1e491f79ca07ff23183 — 2025-12-18 14:11:35 +0900 — mamam1281 — docs: mark onboarding checklist progress
  - 파일: docs/ONBOARDING_CHECKLIST.md
  - 영향: 체크리스트 진행 상태 표기 업데이트.

- 635f35815f6c5c34c61ebc4495ef1c116c13b45f — 2025-12-18 14:09:46 +0900 — mamam1281 — docs: drop deprecated today-feature from onboarding
  - 파일: docs/ONBOARDING_CHECKLIST.md
  - 영향: 온보딩에서 사용 중단된 today-feature 항목 제거.

- aa0eff1cc0af42e6c4e562a8ff446b12a43052f6 — 2025-12-18 14:03:45 +0900 — mamam1281 — fix: flush user before event log; add onboarding checklist
  - 파일: app/api/routes/auth.py, docs/ONBOARDING_CHECKLIST.md
  - 영향: 인증 루트에서 사용자 flush 순서 보정, 온보딩 체크리스트 신규 추가.

## 원격 `heyjin/main` 커밋 (2025-12-14 ~ 2025-12-18, 최신순)
- 6f2afb4 — 2025-12-18 12:14:15 +0900 — heyjinjung — refactor: 신규회원 유입 퍼널 및 리텐션 분석 문서 추가
- 7e7e525 — 2025-12-17 23:20:48 +0900 — heyjinjung — refactor: UI 개선을 위한 테이블 열 구성 및 스타일 조정
- bbb6aca — 2025-12-17 19:03:24 +0900 — heyjinjung — refactor: 테이블 열 너비 조정으로 UI 개선
- fc171a9 — 2025-12-17 18:23:58 +0900 — heyjinjung — refactor: 불필요한 필드 제거 및 UI 개선으로 코드 간소화
- 2825441 — 2025-12-17 18:22:09 +0900 — heyjinjung — refactor: 불필요한 날짜 포맷팅 함수 및 관련 UI 요소 제거로 코드 간소화
- 26bcfb3 — 2025-12-17 18:14:17 +0900 — heyjinjung — refactor: 불필요한 useEffect 및 useState 제거로 코드 간소화
- da8f27b — 2025-12-17 18:13:44 +0900 — heyjinjung — feat: 팀 선택 및 관리자 패널 표시 로직 추가로 UI 개선
- bdd15cb — 2025-12-17 18:12:57 +0900 — heyjinjung — refactor: "시즌패스" → "레벨" 용어 교체 및 문서/코드 정리
- f1593f4 — 2025-12-17 18:11:37 +0900 — heyjinjung — feat: 크리스마스 효과 관련 상태 관리 및 UI 개선
- b840a2f — 2025-12-17 17:57:03 +0900 — heyjinjung — feat: 사용자 승률을 0.05에서 0.0으로 수정
- ad24b28 — 2025-12-17 17:52:54 +0900 — heyjinjung — feat: 금고 해금 로직 및 UI 개선으로 외부 충전 처리 방식 업데이트
- dac7160 — 2025-12-17 17:15:07 +0900 — heyjinjung — feat: 신규회원 주사위 페이지 레이아웃 개선 및 스타일 수정
- e1b09b9 — 2025-12-17 17:14:58 +0900 — heyjinjung — feat: 배너 이미지 스타일 및 링크 버튼 레이아웃 수정
- 9de9d7a — 2025-12-17 17:08:59 +0900 — heyjinjung — feat: 홈 페이지 레이아웃 개선 및 배너 이미지 스타일 수정
- 6e685d5 — 2025-12-17 17:05:35 +0900 — heyjinjung — refactor: 구조 가독성 개선
- eb6b05c — 2025-12-17 16:59:35 +0900 — heyjinjung — feat: 세그먼트 규칙 및 유저 세그먼트 페이지 UI/레이아웃 업데이트
- eecb824 — 2025-12-17 16:43:49 +0900 — heyjinjung — feat: 시즌 패스 진행률 계산 로직 개선 및 UI 업데이트
- 1fab501 — 2025-12-17 16:23:10 +0900 — heyjinjung — feat: 금고 상태 조회 API 시드 생성 정책 수정 및 관련 문서 업데이트
- 9c2394c — 2025-12-17 16:22:12 +0900 — heyjinjung — feat: 금고 서비스 자동 시드 비활성화 및 테스트 수정
- e1dfe2f — 2025-12-17 16:12:11 +0900 — heyjinjung — feat: 신규회원 금고 퍼널 v1.0 구현 (플로우/UI/UX 가이드 포함)
- 5415e5f — 2025-12-17 13:17:12 +0900 — heyjinjung — chore: public/videoplayback.mp3 추가
- 5a11cf5 — 2025-12-17 00:15:48 +0900 — heyjinjung — feat: 신규회원 주사위 게임 UI 개선 및 메시지 스타일 수정
- 230793b — 2025-12-17 00:06:56 +0900 — heyjinjung — feat: 신규회원 주사위 게임 메시지 수정 및 설명 개선
- db6a83d — 2025-12-17 00:06:19 +0900 — heyjinjung — feat: 신규회원 에어드랍 이벤트 메시지 및 UI 개선
- 50b0331 — 2025-12-17 00:00:21 +0900 — heyjinjung — feat: 백업 스크립트 개선 및 환경 파일 백업 로직 수정
- ccd2aaf — 2025-12-16 23:57:18 +0900 — heyjinjung — feat: 로그인 후 리다이렉션 경로를 동적으로 설정하도록 수정
- 4272577 — 2025-12-16 23:49:45 +0900 — heyjinjung — feat: 신규 멤버 주사위 자격 검증 로직 추가 및 사용자 ID 입력 처리 개선
- 8b21f52 — 2025-12-16 23:42:51 +0900 — heyjinjung — feat: Alembic 머지 리비전 추가 및 신규 멤버 주사위 테이블/활동 통합
- 14c6d02 — 2025-12-16 23:38:25 +0900 — heyjinjung — feat: SQLAlchemy 예외 처리 핸들러 추가 및 DB 오류 메시지 개선
- 24ecc95 — 2025-12-16 23:24:22 +0900 — heyjinjung — feat: 신규 멤버 주사위 게임 도입
- 35a670d — 2025-12-16 18:53:06 +0900 — heyjinjung — feat: LotteryCard/LotteryPage 스크래치 및 결과 표시 로직 개선
- 1c13785 — 2025-12-16 18:20:46 +0900 — heyjinjung — feat: 삭제된 사용자의 팀 멤버십 정리 및 테스트 추가
- 6745365 — 2025-12-16 17:55:41 +0900 — heyjinjung — feat: 팀 최대 멤버 수 5→7로 수정
- de6c4ab — 2025-12-16 17:32:19 +0900 — heyjinjung — feat: 터치 이벤트 핸들러 추가 및 스크래치 진행률 계산 개선
- 91b6577 — 2025-12-16 16:39:33 +0900 — heyjinjung — feat: 사용자 세그먼트 페이지 열 숨김/외부 ID 표시 개선
- de0c978 — 2025-12-16 15:51:28 +0900 — heyjinjung — feat: 사용자 세그먼트 조회 제한 500으로 수정
- 32e118a — 2025-12-16 15:49:54 +0900 — heyjinjung — feat: 관리 페이지 텍스트 한국어 번역
- de2a606 — 2025-12-16 15:39:47 +0900 — heyjinjung — feat: 백필 사용자 활동 스크립트 추가 및 경로 설정 개선
- bfbad42 — 2025-12-16 15:31:51 +0900 — heyjinjung — feat: 사용자 세그먼트 선택 로직 개선 및 마지막 플레이 시간 추가
- d56f147 — 2025-12-16 15:31:40 +0900 — heyjinjung — feat: 사용자 활동 마지막 플레이 시각 기록 기능 추가
- 6662c46 — 2025-12-16 15:10:38 +0900 — heyjinjung — feat: .env 파일 추가 및 환경 변수 설정 구성
- 23f48a9 — 2025-12-16 15:08:30 +0900 — heyjinjung — feat: .env 파일 추가 및 환경 설정 구성
- 942be37 — 2025-12-16 15:05:24 +0900 — heyjinjung — feat: UX 개선 및 성능 최적화 기능 추가
- 2699418 — 2025-12-16 14:50:55 +0900 — heyjinjung — feat: 개인화 기능 체크리스트 및 런북 문서 추가
- 95166a1 — 2025-12-16 11:46:36 +0900 — heyjinjung — feat: 팀 강제 가입 기능 개선 및 포인트 유지 옵션 추가
- c0d1282 — 2025-12-16 11:39:56 +0900 — heyjinjung — feat: _normalize_to_utc 개선 및 create_season 지역 시간 처리 추가
- cbdaeca — 2025-12-16 00:53:45 +0900 — heyjinjung — feat: 활성 팀 배틀 시즌 기간 고정
- 4d860ef — 2025-12-16 00:50:47 +0900 — heyjinjung — feat: 시즌 정보 처리 개선 및 UTC 적용
- bda33fa — 2025-12-16 00:25:45 +0900 — heyjinjung — feat: 팀 목록 조회 개선 및 팀 최대 인원 제한 추가
- a4898bb — 2025-12-16 00:10:17 +0900 — heyjinjung — feat: 팀 배틀 보상 구조 수정 및 팀 이름 정제 마이그레이션 추가
- a7527b6 — 2025-12-15 23:44:05 +0900 — heyjinjung — feat: 홈/팀배틀 페이지 텍스트 수정
- 112fbdb — 2025-12-15 23:30:46 +0900 — heyjinjung — feat: 팀 배틀 기간 표시 및 룰 안내 개선
- c4eb392 — 2025-12-15 23:16:52 +0900 — heyjinjung — feat: 팀 배틀 기능 개선 및 일정 조정
- 2e642f9 — 2025-12-15 22:53:21 +0900 — heyjinjung — refactor: 코드 구조 가독성 개선
- d29659c — 2025-12-15 22:32:21 +0900 — heyjinjung — feat: 신규 사용자 생성 및 로그인 감사 로그 테스트 추가
- 3225205 — 2025-12-15 22:26:37 +0900 — heyjinjung — feat: 관리자 룰렛 구성 업데이트 시 제약 위반 방지 테스트 추가
- 457f284 — 2025-12-15 22:13:08 +0900 — heyjinjung — feat: 백업/업데이트 스크립트에서 APP_DIR 경로 설정 개선
- fc2df54 — 2025-12-15 22:10:42 +0900 — heyjinjung — feat: 서버 업데이트 런북 문서 추가
- 67b1560 — 2025-12-15 21:59:55 +0900 — heyjinjung — feat: LotteryCard/LotteryPage 결과 공개 로직 개선 및 상태 관리 추가
- 5b11ead — 2025-12-15 21:52:16 +0900 — heyjinjung — fix: Dockerfile pip 설치 시 캐시 사용 및 버전 체크 비활성화
- 910ff20 — 2025-12-15 21:50:21 +0900 — heyjinjung — fix: Docker Compose 명령어 v2 플러그인 대응
- b77cc74 — 2025-12-15 21:46:20 +0900 — heyjinjung — feat: 3D Dice/Roulette 컴포넌트 구현(애니메이션 포함)
- c41574f — 2025-12-14 22:34:16 +0900 — heyjinjung — fix: 시즌 패스 페이지 레벨 XP 새로 고침 로직 수정
- a4c7618 — 2025-12-14 22:31:25 +0900 — heyjinjung — fix: 시즌 패스 페이지 레이아웃 수정
- 1a5bd9b — 2025-12-14 22:18:11 +0900 — heyjinjung — refactor: 시즌 패스 서비스에서 레벨 XP 서비스 제거 및 로직 수정
- 107d332 — 2025-12-14 22:02:53 +0900 — heyjinjung — fix: 시즌 패스 XP 미러링 로직 수정(보상 중복 방지)
- 0f4c6b8 — 2025-12-14 21:56:37 +0900 — heyjinjung — refactor: 시즌 패스 서비스 구현 파일 삭제
- e0fe1d5 — 2025-12-14 20:46:57 +0900 — heyjinjung — feat: 시즌 패스 페이지 UI 개선 및 로딩/오류 처리 추가
- 5c8ab26 — 2025-12-14 20:41:45 +0900 — heyjinjung — fix: 관리자 메시지를 "지민이"로 변경
- 32ea50e — 2025-12-14 20:23:35 +0900 — heyjinjung — feat: 크리스마스 효과 및 음악 토글 기능 추가
- 73f9b87 — 2025-12-14 20:10:02 +0900 — heyjinjung — feat: 보상 시스템 업데이트 및 팀 배틀 조건 변경
- 5b5245f — 2025-12-14 19:09:48 +0900 — heyjinjung — feat: 지갑 목록 조회에 잔액/토큰 유형 필터 추가
- 702913a — 2025-12-14 18:49:22 +0900 — heyjinjung — fix: API 경로 수정 및 고유 ID 생성 로직 개선
- 22aaed0 — 2025-12-14 17:17:09 +0900 — heyjinjung — fix: 로컬 mp3만 사용하도록 수정(외부 404 방지)
- 7ded5d8 — 2025-12-14 16:57:04 +0900 — heyjinjung — refactor: 코드 구조 가독성 개선
- cdb7b79 — 2025-12-14 16:30:58 +0900 — heyjinjung — fix: API 경로 수정 및 크리스마스 음악 소스 변경
- b9fab89 — 2025-12-14 16:16:08 +0900 — heyjinjung — fix: 크리스마스 배경음악 URL 수정
- 46fae25 — 2025-12-14 16:02:48 +0900 — heyjinjung — feat: 크리스마스 테마 추가(눈효과/배경음악/장식 아이콘)

## 메모
- 12/13~12/17에는 커밋 기록이 없습니다.
- 추가로 필요한 기간/브랜치가 있으면 알려주세요.

## 12/14~12/18 변경 파일 (Git 로그 기준)
- d763f079e006a3b497cdb44fb6375e5880c33514 — 수정: app/services/admin_external_ranking_service.py, app/services/game_wallet_service.py, app/services/reward_service.py, app/services/season_pass_service.py, docs/ONBOARDING_CHECKLIST.md, requirements.txt, src/components/season-pass/SeasonPassBar.tsx
- 7ac5b04204fae2ce5cfb7aa6bddeff8561b011a4 — 수정: docs/ONBOARDING_CHECKLIST.md
- 59b1884573ee50e3d376b1e491f79ca07ff23183 — 수정: docs/ONBOARDING_CHECKLIST.md
- 635f35815f6c5c34c61ebc4495ef1c116c13b45f — 수정: docs/ONBOARDING_CHECKLIST.md
- aa0eff1cc0af42e6c4e562a8ff446b12a43052f6 — 추가: docs/ONBOARDING_CHECKLIST.md / 수정: app/api/routes/auth.py

## 기능 확인 메모 (2025-12-18)
- 비교 기준: 현 로컬 HEAD(sync/heyjin-main) vs heyjin/main
- 주요 차이 요약:
  - 백엔드: 신규 마이그레이션(설문/팀배틀 시간창 고정/유저 활동 원장/세그먼트 규칙/금고/신규회원 주사위 테이블), 신규 어드민/유저 설문 API, 세그먼트·세그 규칙·신규회원 주사위·설문·금고·팀배틀 서비스 확장, 에러 핸들러 추가, 활동 로깅/원장/시드 정책 변경.
  - 프론트: 설문 리스트·실행 페이지, 신규회원 주사위 페이지, 팀배틀 UI/페이지네이션·크리스마스 테마, 시즌패스 UI/애니메이션 개선, 크리스마스 데코/음악 컴포넌트, Admin 라우트에 설문/세그먼트/세그 규칙/신규회원 주사위 페이지 추가, 테스트 setup에 canvas mock 추가.
  - 문서/스크립트: 신규 퍼널/금고/개인화 체크리스트·런북 다수, 리뷰/체크리스트/테스트 가이드 추가, 서버/백업/runbook 스크립트 확장, .env 샘플/백업 추가, package-lock/requirements 대규모 변경.
- 실행/테스트: docker-compose로 db/redis/backend 재기동 후 alembic upgrade HEAD 성공(중복 생성/컬럼을 우회하도록 guard 추가). 스모크 일부 수행: auth 토큰 발급 OK, vault 상태 조회(eligible=false → fill 시 VAULT_NOT_ELIGIBLE), 신규회원 주사위 eligibility 수동 부여 후 status/play OK(LOSE), 설문 활성 조회 및 응답 세션 생성·부분 응답 저장 OK.
- 2025-12-18 추가 스모크: 팀배틀 활성 시즌 조회 OK(Team Battle 2025-12-16), 팀 목록 조회 OK, 초기 팀 자동 배정은 TEAM_SELECTION_CLOSED → admin patch로 시즌 시간창 재설정(starts_at=2025-12-18T08:00:00Z, ends_at=2025-12-21T08:00:00Z) 후 auto-assign 성공(team_id=1, user_id=2). 리더보드: admin points delta=50 가산 후 team_id=1 points=50 → roulette 1회 플레이로 team_battle GAME_PLAY 추가 적립(+10) 확인(최신 points=60, member_count=1). 세그먼트 리스트 OK(demo-user/smoke-user segment=NEW), 세그 규칙: create→update→delete 테스트 완료(최종 리스트 빈 상태). 시즌패스 status/internal-wins OK, stamp(ROULETTE) 1회 추가로 xp_added=10, auto_claim 보상 level1 COIN 100 수령. 게임 토큰 월렛: admin game-tokens grant CC_COIN 500 to smoke-user → wallet balance 500, ledger GRANT 기록 1건 확인. roulette coin 5 지급 후 1회 소모(balance 4), DICE_TOKEN 5 지급.
- 프론트 빌드: npm install 후 `npm run build` 성공(vite/tsc).
- 프론트 프리뷰: npm run preview --host --port 4175 시도했으나 "dist 없음" 오류로 기동 실패(동일 경고 반복). dist 디렉터리는 존재해 원인 추가 조사 필요.
- 스크립트 실행: docker compose up -d db redis backend 후 컨테이너 내부에서 실행. scripts/backup.sh --help는 CRLF로 인해 `command not found`/`invalid option name` 오류로 실패. scripts/seed_test_data.py --help 실행 시 feature_config에 max_daily_plays 컬럼 부재로 OperationalError(1054) 발생(현 스키마와 스크립트 불일치). 
- 추가 메모: 기존 user_level_progress 중복 오류는 idempotent guard로 해결. heyjin/main 기능 스모크를 완전 재현하려면 남은 엔드포인트/프론트 경로 추가 확인 필요.

---

## (추가) 프론트엔드 UI/라우팅 작업 반영 (대화 기반 정리)

> 아래 항목은 Git 로그 스캔 외에, 작업 요청(대화) 기준으로 실제 반영된 프론트 변경사항을 별도로 정리한 내용입니다.

### 라우팅/플로우
- 앱 진입 플로우를 `로그인 → 메인(/home) → 상세`로 정리.
  - `/`(기존 랜딩) 접근 시 `/login`으로 리다이렉트.
  - Figma 랜딩은 인증 후 접근하도록 `/landing`, `/landing/tablet`, `/landing/mobile`로 이동(보호 라우트).
- 로그인 페이지는 단독 화면으로 취급하여 전역 헤더/음악/눈 효과를 숨김 처리.

### Figma 랜딩(데스크탑/태블릿/모바일)
- Figma 기반 랜딩 3종 추가 및 빌드/런타임 오류 수정.
- 랜딩 내부 클릭 동작을 기존 페이지로 연결(React Router `Link` 사용).
  - 게임 타일: `/roulette`, `/dice`, `/lottery`
  - 메뉴: `/home`, `/season-pass`, `/team-battle` (금고는 임시로 `/home` 연결)

### 자산(아이콘/이미지) 복구
- 게임 타일 아이콘 경로를 실제 존재하는 SVG로 정정:
  - `/images/layer-1.svg`, `/images/layer-2.svg`, `/images/layer-3.svg`
- Bento 영역 아이콘도 실제 SVG로 매핑:
  - `/images/vector111.svg`, `/images/vector112.svg`, `/images/unnamed113.svg`
- SVG 로드 실패 시 PNG로 폴백하도록 `<img onError>` 처리 추가.

### 폰트
- Google Fonts `Noto Sans KR`를 추가.
- 전체 앱에 강제하지 않고, 랜딩 라우트에만 적용되도록 `.landing-font` 래퍼로 스코프 제한.

### 패딩(간격) 정책 반영
- 랜딩 페이지 전반 세로 패딩을 20~30px 범위로 정규화(요청: “전체적으로 20-30 사이”).
- 홈 페이지 주요 카드 래퍼 패딩을 축소(`p-7` → `p-6`)하여 과도한 세로 간격을 완화.
- Figma 특정 노드의 패딩 값(“패딩만”)을 기존 코드에 반영:
  - 노드 `1:57` Header container
  - 노드 `1:59` Reliable app section(ongoing events)

### 배포/실행 확인(프론트)
- Vite production build 성공 확인.
- Docker(멀티 스테이지 빌드)로 프론트 정적 배포(Nginx) 구성 및 포트 `8080` 서빙 확인.

### 문서
- 프론트 UI 전면 개편을 위한 “API/Auth 계약 고정(변경 금지)” 문서 추가:
  - `docs/frontend_api_contract_freeze.md`
  - 내용: 토큰 저장/헤더 규칙, 401/403 시 `/login` 처리, RequireAuth 리다이렉트, 주요 API 엔드포인트/필드 계약 정리

### 남은 확인 포인트(리스크)
- “Figma 노드 패딩을 그대로 적용” 요구와 “세로 패딩 20~30 정규화” 요구가 충돌할 수 있어,
  특정 섹션(예: 노드 `1:57`의 큰 py 값)에서 최종 우선순위 확정이 필요.
