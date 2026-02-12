# W07 트러블슈팅: 발렌타인 & 설 연휴 이벤트 기획

**문서 정보**
- **작성일**: 2026-02-11
- **작성자**: Claude Sonnet 4.5
- **문서 타입**: 이벤트 기획 트러블슈팅
- **상태**: 기획 완료 (구현 대기)

---

## 1. 작업 요약

### 요청 사항
- **목적**: 2026-02-14 (발렌타인데이) ~ 2026-02-17 (설 연휴) 통합 이벤트 기획
- **타겟**: 한국 20-50대 남성 도박 성향 유저
- **목표**: 씨씨카지노 리텐션율 상승

### 주요 제약 조건
1. **백엔드 로직 재활용**: 신규 개발 최소화, 기존 시스템 최대 활용
2. **프론트 신규 개발 허용**: UI/UX 요소는 신규 개발 가능
3. **코드베이스 근거 필수**: 모든 기획은 실제 구현체 기반

---

## 2. 기술 분석 결과

### 2.1 활용 가능한 기존 시스템

#### ✅ 미션 시스템 (완전 재활용 가능)
**SoT**: `docs/SOT/00_mission/00_mission_sot_master.md`
**코드**: `app/v2/models/core/mission.py`, `app/v2/services/mission_service.py`

**재활용 요소**:
- `category="SPECIAL"`: 특별 이벤트 미션 분류
- `action_type`: "PLAY_GAME", "CC_DEPOSIT", "CONSECUTIVE_LOGIN" 지원
- `start_date/end_date`: 일자별 미션 활성화 자동 처리
- `reward_type`: "BUNDLE", "TICKET_BUNDLE" 등 다양한 보상 타입 지원
- 자동 진행도 업데이트 (`update_progress()` 메서드)

**구현 방안**: 마이그레이션으로 미션 데이터 5종 삽입

---

#### ✅ 세그먼트 시스템 (완전 재활용 가능)
**SoT**: `docs/SOT/00_segment/01_segment_policy_sot_ko.md`
**코드**: `app/v2/services/segment_service.py`

**재활용 요소**:
- 세그먼트 종류: NEW, COMMON, VIP, WHALE, AT_RISK
- 자동 분류: 입금액, 활동일수, 텔레그램 인증 기반
- 배치 실행: 일 1회 자동 재분류

**구현 방안**: 보상 지급 시 세그먼트 조회 후 배수 적용

---

#### ✅ 보상 시스템 (부분 확장 필요)
**SoT**: `docs/SOT/00_inventory/정본/02_v2_reward_type_and_delivery_routing_sot_ko.md`
**코드**: `app/v2/services/reward_service.py`

**재활용 요소**:
- 기존 번들 ID: 3 (티켓 3종), 7 (1만P + 골드키), 15 (10만P + 골드키 2), 20 (30만P + 다이아 3)
- 번들 처리 로직: `deliver()` 메서드의 BUNDLE 케이스

**확장 필요**:
- 신규 번들 ID 3종 추가 (21, 22, 23)
- 세그먼트별 배수 적용 로직 (`_get_event_multiplier()` 메서드)

---

#### ✅ 금고 시스템 (완전 재활용 가능)
**SoT**: `docs/SOT/00_vault/01_vault_policy_sot_ko.md`
**코드**: `app/v2/services/vault_service.py`

**재활용 요소**:
- `V2VaultService.deposit()`: 포인트 지급
- `VaultLedger`: 모든 거래 자동 로깅
- `benefits_suspended`: 제재 유저 자동 차단

**구현 방안**: 보상 지급 시 기존 메서드 호출

---

#### ✅ 인벤토리 시스템 (완전 재활용 가능)
**SoT**: `docs/SOT/00_inventory/정본/03_v2_game_token_type_sot_ko.md`
**코드**: `app/v2/services/inventory_service.py`

**재활용 요소**:
- `grant_wallet_tokens()`: 티켓 지급
- `grant_item()`: 기프티콘 지급
- 게임 토큰 타입: ROULETTE_TICKET, DICE_TICKET, LOTTERY_TICKET, GOLD_KEY_FRAGMENT 등

**구현 방안**: 번들 처리 로직 내에서 반복 호출

---

### 2.2 신규 개발 필요 항목

#### 🔨 백엔드 (최소한의 확장)

1. **보상 서비스 번들 확장** (`app/v2/services/reward_service.py`)
   - 번들 ID 21, 22, 23 처리 로직 추가
   - 세그먼트별 배수 적용 메서드 (`_get_event_multiplier()`)
   - 예상 작업량: 50줄

2. **연속 로그인 체크 로직** (`app/v2/services/mission_service.py`)
   - 4일 연속 미션 완료 여부 자동 체크
   - 예상 작업량: 80줄

3. **관리자 통계 API** (`app/v2/api/admin/event_routes.py`)
   - 이벤트 대시보드용 통계 엔드포인트
   - 예상 작업량: 120줄

**총 백엔드 신규 코드**: 약 250줄

---

#### 🎨 프론트엔드 (신규 개발)

1. **이벤트 배너 컴포넌트** (`frontend/src/components/Event/ValentineSeolBanner.tsx`)
   - 날짜별 배너 4종
   - 예상 작업량: 150줄 + CSS 80줄

2. **연속 달성 진행 바** (미션 페이지 내 삽입)
   - 4일 중 완료한 일수 시각화
   - 예상 작업량: 60줄

3. **세그먼트별 보상 표시** (`frontend/src/components/Mission/MissionRewardDisplay.tsx`)
   - 배수 뱃지 표시
   - 예상 작업량: 50줄

**총 프론트엔드 신규 코드**: 약 340줄

---

## 3. 기획 결과물

### 3.1 생성된 문서

**파일**: `docs/events/2026_valentine_seol_event_proposal.md`

**주요 섹션**:
1. **이벤트 개요**: 쉬운 설명 + 전략적 목표
2. **상세 기획**: 일정, 세그먼트별 보상, 미션 구조
3. **기술 구현 방안**: 백엔드/프론트엔드 코드 예시
4. **운영 체크리스트**: 배포 전후 점검 항목
5. **리스크 관리**: 기술/운영/비즈니스 리스크 및 대응
6. **성공 지표 (KPI)**: 측정 가능한 목표값

**코드 근거**: 모든 기능은 실제 코드베이스 참조
- 미션 시스템: `app/v2/models/core/mission.py`
- 세그먼트: `app/v2/services/segment_service.py`
- 보상: `app/v2/services/reward_service.py`
- 금고: `app/v2/services/vault_service.py`

---

### 3.2 핵심 설계 결정

#### 세그먼트별 차등 보상
| 세그먼트 | 포인트 배수 | 티켓 배수 | 특별 혜택 |
|----------|-------------|-----------|-----------|
| NEW | 1.5x | 1.5x | 튜토리얼 팝업 |
| COMMON | 1.0x | 1.0x | - |
| VIP | 1.2x | 1.5x | 골드키 조각 +3 |
| WHALE | 1.5x | 2.0x | 다이아몬드 티켓 +1 |
| AT_RISK | 2.0x | 2.0x | 치킨 기프티콘 |

**근거**:
- `docs/SOT/00_segment/01_segment_policy_sot_ko.md` - 세그먼트 분류 기준
- 복귀 유저(AT_RISK) 최우선 리텐션 전략

---

#### 4일 연속 달성 구조
- **2/14**: 게임 3회 → 티켓 번들
- **2/15**: 입금 1만원 → 2만P + 룰렛 2장
- **2/16**: 게임 5회 → 골드키 조각 5개 + 주사위 3장
- **2/17**: 입금 3만원 → 5만P + 다이아몬드 티켓
- **연속 보너스**: 4일 완료 → 3만P + 골드키 티켓

**근거**:
- 입금 미션과 플레이 미션 교차 배치로 ARPU 상승 유도
- 최종일 고액 입금 유도로 매출 극대화

---

## 4. 구현 우선순위

### Phase 1: 백엔드 핵심 로직 (필수)
1. ✅ 마이그레이션 파일 생성 (`alembic/versions/20260214_1000_event_valentine_seol_missions.py`)
2. ✅ 보상 서비스 번들 확장 (`app/v2/services/reward_service.py`)
3. ✅ 연속 로그인 체크 로직 (`app/v2/services/mission_service.py`)

**예상 작업 시간**: 4시간

---

### Phase 2: 프론트엔드 UI (필수)
1. ✅ 이벤트 배너 컴포넌트 (`frontend/src/components/Event/ValentineSeolBanner.tsx`)
2. ✅ 미션 페이지 수정 (배너 및 진행 바 삽입)
3. ✅ CSS 스타일링

**예상 작업 시간**: 3시간

---

### Phase 3: 관리자 도구 (선택)
1. ⚪ 통계 API (`app/v2/api/admin/event_routes.py`)
2. ⚪ 대시보드 UI (`frontend-admin/src/pages/EventDashboard.tsx`)
3. ⚪ 텔레그램 공지 스크립트 (`scripts/send_event_announcement.py`)

**예상 작업 시간**: 5시간

---

### Phase 4: 운영 준비 (필수)
1. ✅ 배포 전 체크리스트 실행
2. ✅ 이벤트 배너 이미지 제작 (디자이너 협업)
3. ✅ FAQ 문서 준비
4. ✅ Circuit Breaker 임계값 조정

**예상 작업 시간**: 2시간

---

## 5. 리스크 및 대응

### 기술적 리스크

#### ⚠️ 높음: Circuit Breaker 발동 가능성
**원인**: 이벤트 참여 폭증으로 분당 보상 지급 임계값 초과
**영향**: 보상 지급 차단, 유저 불만
**대응**: 이벤트 기간 임계값 2배 상향 (10만P/분 → 20만P/분)
**코드**: `app/v2/services/circuit_breaker_service.py`

---

#### ⚠️ 중간: 보상 중복 지급
**원인**: 미션 클레임 중복 요청
**영향**: 경제 시스템 밸런스 붕괴
**대응**: Idempotency 키 적용 (`user_id + mission_id + reset_date`)
**코드**: `app/v2/services/idempotency_service.py`

---

### 운영적 리스크

#### ⚠️ 높음: 참여율 저조
**원인**: 이벤트 인지도 부족, 보상 매력도 낮음
**대응**:
- 2/14 18:00 기준 참여율 20% 미만 시 긴급 프로모션 (텔레그램 쿠폰 5천원 발송)
- 세그먼트별 맞춤 메시지 발송

---

#### ⚠️ 중간: 악의적 어뷰징
**원인**: 다중 계정으로 보상 중복 수령
**대응**:
- IP/디바이스 중복 체크
- 하루 미션 완료 횟수 1회 제한
- 의심 계정 수동 검토 (어드민 플래그)

---

## 6. 성공 지표

### KPI 목표
| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| DAU 증가율 | +30% | 2/14~2/17 평균 vs 2/7~2/10 평균 |
| 신규 가입자 | +100명 | `created_at` 기준 |
| ARPU 증가율 | +15% | 총 입금액 / 활성 유저 |
| 미션 완료율 | 60% | 완료 유저 / 시도 유저 |
| 연속 달성률 | 20% | 연속 보너스 수령 / 전체 참여 |

---

## 7. 후속 작업

### 이벤트 종료 후 (2/18)
1. ✅ 최종 통계 리포트 작성
2. ✅ 세그먼트별 ROI 분석
3. ✅ 사후 회고 (Retrospective)
4. ✅ 다음 이벤트 개선점 도출

### 트러블슈팅 문서 업데이트
- **파일**: `docs/90_troubleshooting/W07_EVENT_valentine_seol_execution.md` (이벤트 실행 후 작성)
- **내용**: 실제 발생한 이슈, 해결 방법, 교훈

---

## 8. 변경 로그

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-11 | v1.0 | 초안 작성 | Claude Sonnet 4.5 |

---

## 9. 관련 문서

- **이벤트 기획서**: [2026_valentine_seol_event_proposal.md](C:\Users\JAVIS\ch\ch25\docs\events\2026_valentine_seol_event_proposal.md)
- **미션 SoT**: [00_mission_sot_master.md](C:\Users\JAVIS\ch\ch25\docs\SOT\00_mission\00_mission_sot_master.md)
- **세그먼트 SoT**: [01_segment_policy_sot_ko.md](C:\Users\JAVIS\ch\ch25\docs\SOT\00_segment\01_segment_policy_sot_ko.md)
- **금고 SoT**: [01_vault_policy_sot_ko.md](C:\Users\JAVIS\ch\ch25\docs\SOT\00_vault\01_vault_policy_sot_ko.md)
- **보상 라우팅 SoT**: [02_v2_reward_type_and_delivery_routing_sot_ko.md](C:\Users\JAVIS\ch\ch25\docs\SOT\00_inventory\정본\02_v2_reward_type_and_delivery_routing_sot_ko.md)

---

**상태**: ✅ 기획 완료, 구현 대기
