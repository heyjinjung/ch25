문서 타입: SoT (정본)
버전: v1.2
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: Stable

## 1. 목적
미션 도메인의 단일 진실 공급원(SoT)을 정의한다. 최신 일자 문서의 규칙을 우선 적용한다.

## 2. 범위
- 유저 미션/스트릭 정책
- 미션 리셋(운영일) 기준
- 보상/클레임 정책

## 3. SoT 우선순위
1) 최신 일자의 mission 문서가 최우선
2) 정책 충돌 시 최신 문서의 내용으로 정렬
3) 운영일/타임존은 반드시 KST(Asia/Seoul) + 오전 9시 리셋 기준

## 4. 용어 정의
- 미션: 유저의 특정 행동을 조건으로 보상을 지급하는 단위 과제
- 스트릭: 연속 일수 기반 보상/상태
- 운영일: KST 기준 오전 9시 리셋을 적용한 날짜
- 진행도: current_value/target_value 비교로 완료 여부 판단
- 수동 클레임: 완료 후 사용자가 직접 보상 수령

## 5. 데이터 모델(개념)
### 5.1 미션 엔터티
- mission: category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward
- progress: current_value, is_completed, is_claimed, approval_status, reset_date

### 5.2 스트릭 엔터티
- streak_info: current_streak, claimable_day, claimable_rewards

## 6. 미션 라이프사이클
1) 생성: 어드민에서 프리셋/룰 기반 생성
2) 진행: update_progress 이벤트로 current_value 증가
3) 완료: current_value >= target_value
4) 클레임: 수동 수령(승인 필요 시 APPROVED 후 가능)
5) 리셋: 운영일 변경 시 reset_date 갱신

## 7. 핵심 정책
### 5.1 운영일(리셋) 기준
- 모든 미션/스트릭의 날짜 계산은 KST 기준으로 수행
- 운영일 리셋은 오전 9시
- API 레이어에 자정 기준 날짜 계산 금지(서비스 단일화)

### 5.2 리셋 키 포맷
- DAILY: YYYY-MM-DD (운영일)
- WEEKLY: YYYY-WXX (ISO 주차, Monday 기준)

### 5.3 신규 유저 미션
- 자격 기간: 가입 시점(created_at) 기준 168시간(7일)
- 만료: 168시간 경과 시 미션 탭 비활성화 및 미수령 보상 소멸
- FAB 타이머: 남은 시간 HH:MM:SS 표시, 만료 1시간 전부터 점멸

대표 미션(예시):
| ID | Logic Key | 미션명 | 조건 | 보상 |
| --- | --- | --- | --- | --- |
| M_WELCOME_01 | welcome_signup | 가입 축하 | 가입 즉시 | 3,000 POINT |
| M_WELCOME_02 | welcome_telegram | 텔레그램 연동 | 계정 연동 완료 | 1 Ticket |
| M_START_01 | start_play_roulette | 룰렛 플레이 | 1회 플레이 완료 | 100 EXP |
| M_START_04 | start_first_deposit | 첫 충전 도전 | 생애 첫 입금 | Starter Pack |
| M_SEO_DAILY | seo_search_code | 구글 검색 미션 | 매일 검색 코드 입력 | 1,000 ~ 5,000 POINT (랜덤) |

참고: 신규 유저 미션 6종의 상세 구성은 운영 시드/어드민 설정을 기준으로 한다.

### 5.4 보상/클레임 원칙
- 기본은 수동 클레임(auto_claim=False)
- 승인 필요 미션은 approval_status가 APPROVED일 때만 지급
- 중복 지급 방지: is_completed, is_claimed 선제 체크

### 5.5 실시간 이벤트
- 미션 완료 시 Redis 채널 golden:v2:mission:complete 발행

### 5.6 식별자 기준
- 미션 진행 FK는 user.id 기준을 사용
- V2 인증 식별자(cc_id)와의 매핑은 서비스 계층에서 일원화

### 5.7 FE 라우팅 표준
- 유저 미션 라우트 표준: /v2/missions
- 레거시 라우트는 리다이렉트 또는 단계적 폐기 대상

## 8. 정합성 체크리스트
- KST 9AM 리셋 기준 적용 여부
- WEEKLY reset_date 포맷(YYYY-WXX) 일치 여부
- 신규 유저 168시간 정책 일치 여부
- claimable_day 기반 스트릭 버튼 노출 여부
- action_type/logic_key 매칭 누락 여부

## 9. 참고 문서(아카이브)
- [docs/SOT/mission/archive/v2_sot_mission_ko.md](docs/SOT/mission/archive/v2_sot_mission_ko.md)
- [docs/SOT/mission/archive/20260129_mission_logic_alignment_update.md](docs/SOT/mission/archive/20260129_mission_logic_alignment_update.md)
- [docs/SOT/mission/archive/v2_mission_timezone_fix_20260122_ko.md](docs/SOT/mission/archive/v2_mission_timezone_fix_20260122_ko.md)

## 10. 변경 이력
- v1.2 (2026-02-07, GitHub Copilot): 데이터 모델/라이프사이클 섹션 추가
- v1.1 (2026-02-07, GitHub Copilot): 용어/식별자/라우팅 표준 및 체크리스트 확장
- v1.0 (2026-02-07, GitHub Copilot): 미션 SoT 5분류 통합 정본 생성
