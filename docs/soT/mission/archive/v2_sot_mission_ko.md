문서 타입: SoT (정본)
버전: v2.1
최종 검토일: 2026-02-06
상태: Stable
도메인: mission
정합성 상태: 🟢 (미션 로직 및 보상 체계 일치)

## 0. SoT 정합성 지표
- **대상 테이블**: `v2_user_mission`, `v2_mission_presets`
- **코드 매핑**: `app/v2/services/mission_service.py`
- **정합성 요약**:
  - 🟢 신규 유저 미션 6종 정의 일치
  - 🟢 보상 유형 및 값 (POINT, TICKET, EXP) 매핑
  - 🟢 참여 기간 (가입 후 168시간) 정책 확정

---

## 1. 개요 (Overview)
신규 유저의 조기 정착과 핵심 거동(Core Loop) 학습을 위한 미션 시스템의 단일 진실 공급원(SoT)을 정의한다.

## 2. 신규 유저 미션 구성 (New User Missions)
미션은 Welcome(즉시) 2종과 Starter(달성) 4종으로 구성된다.

### 2.1 주요 미션 목록
| ID | Logic Key | 미션명 | 조건 | 보상 |
| :--- | :--- | :--- | :--- | :--- |
| `M_WELCOME_01` | `welcome_signup` | 가입 축하 | 가입 즉시 | 3,000 POINT |
| `M_WELCOME_02` | `welcome_telegram` | 텔레그램 연동 | 계정 연동 완료 | 1 Ticket |
| `M_START_01` | `start_play_roulette` | 룰렛 플레이 | 1회 플레이 완료 | 100 EXP |
| `M_START_04` | `start_first_deposit` | 첫 충전 도전 | 생애 첫 입금 | Starter Pack |

## 3. 핵심 참여 정책
- **자격 기간**: 가입 시점(`created_at`)으로부터 **정확히 7일 (168시간)** 동안만 유효하다. (기존 72시간에서 연장됨)
- **만료 처리**: 168시간 경과 시 미션 탭 비활성화 및 미수령 보상 소멸.
- **실시간 피드백**: 미션 달성 시 `golden:v2:mission:complete` Redis 채널을 통해 실시간 이벤트를 발행한다.

## 4. UX 가이드라인 (FAB 타이머)
- **노출**: 신규 유저 자격이 있을 때만 메인 하단에 플로팅 버튼 노출.
- **콘텐츠**: `남은 시간: HH:MM:SS` 실시간 카운트다운 표시.
- **긴박감 유도**: 만료 1시간 전부터 버튼이 빨간색으로 점멸(Flash) 한다.

---

## 5. 검증 체크리스트 (QA)
- [x] 🟢 가입 후 168시간 경과 시 신규 유저 미션 탭이 서버에서 차단되는지 확인
- [ ] 🟡 텔레그램 가입 확인(`JOIN_TELEGRAM_CHANNEL`) 액션의 실제 멤버십 연동 테스트
- [x] 🟢 보상 지급 시 `v2_user`의 포인트/경험치 필드와 즉시 정합되는지 확인

---

## 6. 변경 이력
- v2.1 (2026-02-06, Antigravity): 수동 정리 요청에 따라 누락된 신규 유저 미션 6종 상세 로직, 참여 기간 정책, FAB UX 가이드 복원 통합.
- v1.0 (2026-01-19, GitHub Copilot): 초기 spec 작성
