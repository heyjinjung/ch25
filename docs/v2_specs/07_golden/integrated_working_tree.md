# Golden V2: 통합 워킹트리 (Phases 1, 2, 3, 4 + Ops Gaps)

본 문서는 **Phase 1~4**와 **기존 백로그(미구현/부분구현)** 과업을 통합한 최종 실행 로드맵입니다.

---

## 🏗️ 1. 백엔드 및 데이터 모델 (Backend & Models)

### 1.1 데이터 모델링 (Models)
- [x] **v2_golden_intervention_log**: `status` 필드 추가 (PENDING_APPROVAL, APPROVED, REJECTED, SENT)
- [ ] **v2_retention_roi_log**: 개입별 기여도 및 CC 입금액 트래킹 테이블 구현
- [ ] **v2_funnel_stats**: 퍼널 분석용 집계 테이블 (추출/승인/발송/복귀)
- [ ] **v2_user_badge**: 유저 지위(Status) 및 뱃지 소유 정보 테이블 (Phase 3)
- [ ] **v2_streak_history**: 유저 스트릭 및 복구권 사용 이력 테이블 (Phase 3)
- [ ] **v2_user_deposit_evidence**: 유저 측 증거 데이터 저장 테이블 (Phase 4)
- [ ] **A/B Test Framework**: 개입 효과 측정용 실험 그룹 분리 모델 (🟢 Low)

### 1.2 서비스 및 워커 (Services & Workers)
- [x] **GoldenInterventionService**: 트리거 감지 시 `PENDING_APPROVAL` 상태로 로그 선적재 로직 구현
- [ ] **GoldenEventService/Worker**: `golden:v2` 채널을 통한 실시간 개입 이벤트 브릿지 강화
- [ ] **ROI Calculator Service**: 개입 유저의 24시간 내 행동 데이터를 분석하여 ROI 산출 로직 구현
- [ ] **Cohort Health Monitor**: 특정 그룹의 리텐션 급감을 감지하여 CPR 자동 발송 트리거 (Phase 3)
- [ ] **Pre-payout & Verification Engine**: 증거 제출 시 선지급 및 사후 데이터 대조 로직 (Phase 4)
- [ ] **Wait-time Reward Worker**: 데이터 지연 시간당 보너스 포인트 자동 계산 및 적재 (Phase 4)

---

## ⚙️ 2. 반자동 CRM 및 운영 제어 (Semi-Auto & Ops Control)

### 2.1 API 및 통신 (API & Contract)
- [ ] **POST `/api/v2/admin/crm/approve`**: 복수건 일괄 승인/거절 API 구현 (Phase 2)
- [ ] **WebSocket Stream**: `/api/v2/admin/ws/golden/events` (source: `golden:v2:events:game`) 기반 관제 스트림 연결
- [ ] **Daily Nudge Scheduler**: 매일 무료 토큰 정보 발송 스케줄러 (🔴 High)
- [ ] **Team Battle Notifier**: 팀 배틀 시작/랭킹 변동 알림 엔진 (🟡 Medium)

### 2.2 운영 로직 및 안전장치 (Ops Logic & Safety)
- [ ] **Circuit Breaker**: 과다 지급 시 시스템 자동 중단 로직 연동 (🔴 High)
- [ ] **Rollback Policy**: 잘못된 개입/지급에 대한 회수 자동화 정책 구현 (🟡 Medium)
- [ ] **POST `/api/v2/user/evidence/submit`**: 유저 측 증거 제출 인터페이스 API (Phase 4)
- [ ] **WebSocket Stream**: `/api/v2/admin/ws/golden/events` (source: `golden:v2:events:game`) 기반 관제 스트림 연결 (Phase 2)
### 2.2 운영 로직 (Ops Logic)
- [ ] **Batch Processing**: 승인된 건에 대한 실제 보상 지급 및 텔레그램 푸시 연동
- [ ] **Rate Limiting**: 동일 유저에 대한 중복 개입 방지 및 발송 제한 로직
- [ ] **CPR 자동 타겟팅**: 코호트 리텐션 하락 시 관리자 승인 없이 CPR 패키지 즉시 발송 (Phase 3)
- [ ] **Fraud Detection**: 증거 제출 데이터와 실제 데이터 불일치 시 유저 차단 및 보상 회수 (Phase 4)
- [ ] **Intervention-Push Hook**: 인터벤션 트리거와 자동 발송 로직의 완전 연결 (⚠️ Partial)
---

## 🎨 3. 프론트엔드 및 UX (TMA & Admin UI)

### 3.1 어드민 인터페이스 (Admin Dashboard)
- [ ] **ApprovalQueue.tsx**:
    - [ ] `PENDING_APPROVAL` 상태 로그 필터링 및 대시보드 리스트업
    - [ ] 유저 심리 상태(Frustrated 등) 및 최근 게임 결과 요약 카드
    - [ ] 일괄 승인/거절 인터랙션
- [ ] **Bento ROI Dashboard**:
    - [ ] 5단계 퍼널 분석 (추출 → 승인 → 발송 → 복귀) 시각화
    - [ ] 코호트별 D-1 리텐션 증분(Delta) 비교 차트
    - [ ] CC 입금 기여도(ROI) 가시화 카드
### 3.1 유저 사이드 (TMA / User-side)
- [ ] **Evidence Submission UI**: 입금 미확인 시 나타나는 증거 제출 및 즉시 보상 피드백 화면 (Phase 4)
- [ ] **Streak Recovery View**: 깨진 스트릭 복구 제안 및 감성적 케어 메시지 인터페이스 (Phase 3)
- [ ] **Honor Report Dashboard**: 유저의 누적 성취(지위, 뱃지)를 자산으로 보여주는 레포트 (Phase 3)

### 3.2 관리자 사이드 (Admin / Ops Center)
- [ ] **ApprovalQueue.tsx**: `PENDING_APPROVAL` 상태 로그 관리 및 벌크 승인 (Phase 2)
- [ ] **Bento ROI Dashboard**: 5단계 퍼널 분석 및 개입별 ROI(CC 기여도) 실시간 시각화 (Phase 1)
- [ ] **Crisis Radar**: 이탈 위험 및 고액 손실 코호트를 레이더 형태로 시각화 (Phase 1)
---

## ⛓️ 4. Ops Plan 시스템 확장 (Ops Plan Expansion)

### 4.1 실행 엔진 고도화
- [ ] **Action Service Integration**: 5대 Kind(`INVENTORY_GRANT`, `GOLDEN_HOUR` 등)별 상세 구현
- [ ] **Personalized Message Scheduler**: 개인화 메시지 자동 발송 스케줄러 구현 (⚠️ Partial)
- [ ] **Async Batch Processor**: 대규모 유저 대상 보상 지급 비동기 엔진
`
## 🧪 5. 검증 계획 (Verification)

### 5.1 시나리오 테스트
1. **트리거 감지**: 유저 5연패 발생 -> DB에 `PENDING_APPROVAL` 상태 적재 확인.
2. **Safety Check**: 시간당 지급액 임계치 초과 시 Circuit Breaker 작동 확인.
3. **효과 분석**: 개입 유저가 24시간 내 재접속 -> `analyze_retention.sql` 결과 연동 확인.

---

## 📝 변경 이력
- v1.3 (2026-01-28): 미구현(Circuit Breaker, Daily Nudge 등) 및 부분구현 과업 통합 확장.
- v1.2 (2026-01-28): Ops Plan 시스템 확장(5대 Action Kind) 반영.
- v1.1 (2026-01-28): Phase 3 & 4 과업 통합 확장.
- v1.0 (2026-01-28): Phase 1 & 2 통합 워킹트리 최초 작성.
