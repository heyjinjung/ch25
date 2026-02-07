# Latency Survival (지연 입금 선지급) Master Spec

**문서 타입**: Master SOT (Integrated)
**버전**: v1.1 (2026-02-07)
**도메인**: Golden / Economy / Trust
**상태**: ✅ Active

---

## 1. 개요 (Overview)

**Latency Survival**은 외부 입금 데이터 지연(4~12시간)으로 인한 유저 이탈을 방지하기 위해, 유저가 제출한 증거(TX ID 등)를 신뢰하여 **재화를 선지급(Provisional Grant)**하고 사후 검증하는 **신뢰 기반 거버넌스 시스템**입니다.

## 2. 핵심 로직 및 정책 (Core Policies)

### 2.1 선지급 정책 (Provisional Grant)
- **보상**: `ROULETTE_TICKET` x 3 (기본값, 설정 가능)
- **Rate Limit**: 유저당 시간당 최대 3회 제출 제한.
- **제재 유예 (Bypass)**: 7일 무입금 등으로 인한 혜택 중단 상태여도, 유효한 증거(`PENDING`, `PROVISIONAL`)가 있으면 **최대 24시간 동안 제재를 일시 해제**하여 활동을 보장합니다.
- **Idempotency**: 제출 API는 `Idempotency-Key` 필수.

### 2.2 엄격한 회수 정책 (Strict Clawback)
허위 신고 반려 시, 지급된 원금뿐만 아니라 **파생 이익(Winnings)까지 철저히 회수**합니다.
- **FIFO 추적**: 선지급 이후 최초 N판의 결과를 선지급분 사용으로 간주.
- **음수 잔액 (Negative Balance)**: 회수 시 잔액이 부족하면 시스템 부채로 기록하여 추후 상환 유도.
- **강제 차감**: 반려 시 `force=True` 옵션으로 무조건 차감 수행.
- **부채 기록**: 회수 후 음수 잔액은 부채로 기록하고 추후 입금 시 상환.
- **신뢰 점수**: 반복 반려 유저는 Latency Survival 영구 차단.

### 2.3 중복 방지 및 스키마
- **Unique Index**: `v2_user_deposit_evidence(tx_id)`
- **상태값**: `PENDING`, `PROVISIONAL`, `VERIFIED`, `REJECTED`

## 3. 유저 인터페이스 (User UX)

### 3.1 신고 프로세스
1. **진입**: Vault 페이지 내 "입금이 지연되고 있나요?" 링크.
2. **입력**: 입금액, 날짜, 시간 (심플 폼).
3. **피드백**: 접수 즉시 "티켓 3장 선지급 완료" 및 컨페티 효과.

### 3.2 심리적 장치 (Pending UX)
- **프로그레스 바**: "입금 확인 중... (약 X시간 남음)" 시각화로 유저의 Lock-in 유도 (제이가르닉 효과).
- **대기 보상**: 지연 시간에 비례하여 포인트 누적 보너스 제공 (선택 사항).

## 4. 관리자 기능 (Admin Control)

### 4.1 매칭 관제 (`LatencySurvivalPage`)
- **Smart Match**: 유저 제출 정보(금액/시간)와 실제 입금 로그 후보군 하이라이팅.
- **Action**: 승인(Verify) 시 `VERIFIED` 전환 / 반려(Reject) 시 즉시 `Clawback` 실행.

## 5. 시스템 연동

### 백엔드
- `latency_survival_service.py`: 선지급 및 회수 핵심 로직.
- `v2_user_deposit_evidence`: 증거 및 상태 관리 테이블.
- `InventoryService`: 강제 차감(`force=True`) 지원.

---

## 변경 이력
- v1.1 (2026-02-07): 선지급 수량/Idempotency/중복 방지/부채 정책 통합.

---
**관련 아카이브**: `docs/SOT/golden/Archive/` 내 15, 2026_01_29_latency_survival_spec_ko.md 참조
