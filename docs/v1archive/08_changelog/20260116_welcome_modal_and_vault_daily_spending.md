# 2026-01-16 New User Welcome Modal & Vault Withdrawal Logic Update

## 1. 개요
- 신규 사용자 웰컴 모달을 "웰컴(2종)"과 "스타터(4종)"로 분리하여 순차적으로 표시하도록 개편.
- Vault 출금 조건을 "누적 사용"에서 "일일 리셋 사용(Daily Spent)" 방식으로 변경하여 매일 사용 실적을 트래킹하도록 개선.
- Vault UI를 최신 "글래스모피즘(Glassmorphism)" 스타일로 전면 리디자인하여 프리미엄 사용자 경험 제공.

## 2. 주요 변경 사항

### A. Frontend: Modal Separation & Event Flow
- **파일**: `src/components/modal/NewUserWelcomeModal.tsx`, `src/components/modal/StarterMissionsModal.tsx` [NEW], `src/hooks/useNewUserWelcome.ts`
- **변경 내용**:
  - **모달 분리**: 
    - `NewUserWelcomeModal`: 2종 웰컴 미션(2,000원 + 5티켓) 표시.
    - `StarterMissionsModal` [NEW]: 4종 스타터 미션(각 2,500원, 총 10,000원) 표시.
  - **순차 표시 로직**: 웰컴 모달에서 "받기" 성공 시에만 스타터 모달로 자동 전환. 닫기(X) 클릭 시에는 전체 종료.
  - **디버깅 강화**: 미션 카드 및 모달 클레임 로직에 상세 console 로그 추가하여 트러블슈팅 용이성 확보.

### B. Backend: Daily Vault Spent Tracking
- **파일**: `app/models/user.py`, `app/services/vault_service.py`, `app/api/routes/vault.py`
- **변경 내용**:
  - **DB 스키마 추가**: `user` 테이블에 `vault_spent_today` (Integer), `vault_spent_reset_date` (String) 컬럼 추가.
  - **일일 리셋 로직**: KST 오전 9시 기준으로 미션 수행 데이터 리셋 시 `vault_spent_today`도 함께 리셋되도록 구현.
  - **VIP 조건 상향**: VIP 세그먼트의 일일 금고 사용 실적 목표를 5,000원에서 20,000원으로 상향 조정.
  - **적용**: `/api/vault/status` 엔드포인트가 이제 누적액이 아닌 당일 사용액(`vault_spent_today`)을 반환하도록 수정.
  - **로직 최적화**: 금고 출금 조건 중 '최근 플레이' 판정 기준을 기존 7일에서 3일로 단축하여 UI 설명 문구와 일치시키고 허들을 완화.
  - **데이터 정합성**: 플레이 횟수 집계 시 `UserEventLog` 대신 `VaultEarnEvent`를 Source of Truth로 사용하여 금고 적립 기록 기반의 정확한 실적 산출.
  - **버그 수정**: 신규 웰컴 미션(2,000원 + 룰렛 5장) 보상 지급 시, 룰렛 티켓이 정상적으로 지급되지 않던 백엔드 로직 오류 수정 (MissionService와 RewardService 간의 리워드 타입 매핑 불일치 해결).

### C. UI/UX: Premium Vault Design
- **파일**: `src/components/vault/VaultPageCompact.tsx`
- **변경 내용**:
  - **Glassmorphism**: 출금 조건 현황 카드에 `backdrop-blur-3xl`, `bg-white/[0.04]`, `border-white/10` 등을 적용하여 투명하고 고급스러운 유리 질감 구현.
  - **Visual Effects**: 게이지 바에 움직이는 `shimmer` 애니메이션과 앰버 컬러의 네온 글로우 효과 추가.
  - **에셋 업데이트**: 금고 이미지를 범용적인 `vault_open.png`로 단일화하여 시각적 일관성 확보.
  - **최종 정리**: 불필요한 상단 헤더와 안내 문구를 제거하고, 주요 텍스트 폰트 크기를 조정하여 미니멀하고 직관적인 디자인 완성.

## 3. 검증 결과 (Verification)
- **Database**: Alembic 마이그레이션 (`vault_spent_today` 추가) 성공.
- **Backend Sync**: `seed_starter_missions.py` 스크립트를 통해 운영 서버 DB에 4종 스타터 미션(starter_play_1, 3, channel_join, attendance) 강제 주입 완료.
- **API Test**: `/api/new-user/claim-welcome` 호출 시 6종 미션이 동시 클레임되거나, 개별 클레임 상태에 따라 멱등성이 유지됨을 확인.
- **Frontend Type Check**: `npx tsc --noEmit` 결과 에러 없음 (Exit code: 0).

## 4. 향후 계획 (Next Steps)
- CI 배포 후 실제 신규 가입 유저 플로우(웰컴 -> 스타터) 최종 모니터링.
- 일부 유저가 보고한 미션 카드 클릭 무반응 이슈에 대해 추가된 디버그 로그 기반으로 추적 예정.
