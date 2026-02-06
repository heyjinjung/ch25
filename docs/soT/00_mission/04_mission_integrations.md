문서 타입: 인테그레이션 SoT
버전: v1.2
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/운영
상태: Stable

## 1. 목적
미션 트리거/핸들러/외부 연동 규칙을 통합 정리한다.

## 2. 트리거/매칭 원칙
- 기본: action_type/logic_key 매칭으로 진행도 갱신
- alias 매핑으로 후방호환 유지
- 신규 이벤트는 update_progress 호출을 직접 추가해야 함

### 2.1 멱등성 원칙
- update_progress 내부에서 is_completed 선제 체크
- 같은 이벤트 재전송 시 중복 지급 금지

## 3. 대표 action_type 별칭(요약)
- JOIN_CHANNEL: SUBSCRIBE_CHANNEL, CHANNEL_JOIN, JOIN_TELEGRAM_CHANNEL, JOIN_CC_CHANNEL
- PLAY_GAME: PLAY
- PLAY_DICE: DICE_PLAY
- PLAY_ROULETTE: ROULETTE_PLAY
- PLAY_LOTTERY: LOTTERY_PLAY
- CC_DEPOSIT: DEPOSIT, CC_INPUT
- CONSECUTIVE_LOGIN: NEXT_DAY_LOGIN, LOGIN_STREAK

### 3.1 게임 서비스 트리거
- 주사위: PLAY_GAME + PLAY_DICE
- 룰렛: PLAY_GAME + PLAY_ROULETTE
- 복권: PLAY_GAME + PLAY_LOTTERY

## 4. 로그인 진행도 단일화
- V2 로그인 경로에서 ensure_login_progress 호출 필수
- LOGIN 액션은 한 곳에서만 갱신되도록 통합

### 4.1 식별자 기준
- V2 Native 기준은 V2User.cc_id 사용
- legacy user.id 매핑은 서비스 계층에서 처리

## 5. 채널 가입(텔레그램/CC)
- 텔레그램 채널 가입은 서버 검증(getChatMember) 기반
- 가입 링크: mission.metadata.channel_url 우선, 없으면 기본 URL 사용
- 보상 지급은 승인 상태(approval_status) 확인 후 처리

### 5.1 환경 변수/기본값
- TELEGRAM_CHANNEL_USERNAME 사용
- 기본 URL: https://t.me/cc_jm_official

## 6. 공유/스토리 미션
- 텔레그램 공유는 신뢰 기반 즉시 기록
- 중복 지급 방지를 위해 update_progress 내부에서 is_completed 선제 체크

### 6.1 트리거 가이드
- 채널 가입: 가입 후 서버 검증 API 호출
- 스토리 공유: 공유 함수 호출 직후 기록

## 7. CC 입금 미션/XP 연동
- 입금 증가 시 XP 적립 및 CC_DEPOSIT 미션 진행 동시 반영
- 입금 횟수 카운트는 delta 증가 기준

### 7.1 주의사항
- 입금 증가가 없으면 미션/XP 갱신 불가
- 배치 업데이트 시 중복 카운트 방지 필요

## 8. 참고 문서(아카이브)
- [docs/SOT/mission/archive/20260126_mission_trigger_handler_code_list.md](docs/SOT/mission/archive/20260126_mission_trigger_handler_code_list.md)
- [docs/SOT/mission/archive/mission_channel_join.md](docs/SOT/mission/archive/mission_channel_join.md)
- [docs/SOT/mission/archive/20260129_telegram_mission_reliability_update.md](docs/SOT/mission/archive/20260129_telegram_mission_reliability_update.md)
- [docs/SOT/mission/archive/2026_01_31_cc_deposit_mission_xp.md](docs/SOT/mission/archive/2026_01_31_cc_deposit_mission_xp.md)
- [docs/SOT/mission/archive/20260129_mission_logic_alignment_update.md](docs/SOT/mission/archive/20260129_mission_logic_alignment_update.md)

## 9. 변경 이력
- v1.2 (2026-02-07, GitHub Copilot): 식별자 기준 보강
- v1.1 (2026-02-07, GitHub Copilot): 멱등성/트리거 가이드 및 환경 변수 보강
- v1.0 (2026-02-07, GitHub Copilot): 미션 인테그레이션 규칙 통합 정리
