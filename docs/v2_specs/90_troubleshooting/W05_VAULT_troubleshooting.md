# W05 VAULT (금고) Troubleshooting

## 📅 기간: 2026-01-27 ~ 2026-02-02

---

## Issue 2: 출금조건 세그먼트별 금액 기준 불일치 (VIP 5,000원 → 20,000원 표기)

### 📝 증상
- VIP 유저가 상점 이용 후에도 출금조건 모달의 “오늘 사용 금액” 목표가 20,000원으로 표시되어 조건 미달로 노출됨.
- 실제 정책(SoT)은 VIP 5,000원 기준인데 UI/백엔드 목표값이 불일치함.

### 🔍 원인
- SoT(세그먼트별 조건): COMMON 10,000원 / VIP 5,000원 / WHALE 0원 / AT_RISK 30,000원 (최근 3일 기준 플레이/당일 사용)
- 백엔드 `V2VaultService.get_vault_info()`와 `request_withdrawal()`에서 VIP `spend_target`이 20,000원으로 설정됨.

### 🛠 해결
1) SoT 문서 통일
    - `v2_strict_vault_policy_sot_ko.md` 및 `v2_vault_glossary_sot_ko.md`에 세그먼트별 기준(최근 3일) 반영
2) 백엔드 로직 수정
    - VIP `spend_target`을 5,000원으로 통일
3) 프론트 UI 정합
    - WHALE 조건은 0/0 값 그대로 표기(면제 문구 제거)

### ✅ 검증 방법
- VIP 유저 기준으로 `/api/v2/vault/status`에서 `daily_vault_spent_target=5000` 반환 확인
- 출금조건 모달에서 VIP 목표값이 5,000원으로 표시되는지 확인
- WHALE 유저는 플레이/소비 조건이 0/0으로 표시되는지 확인

### 📅 적용 일자
- 2026-02-02

---

## Issue 3: V2 세그먼트 키 불일치로 출금 조건/타겟팅 불일치

### 📝 증상
- V2 세그먼트가 COMMON/VIP/WHALE/AT_RISK 기준으로 동작해야 하나, DB 규칙은 ACTIVE/DORMANT/NEW가 남아 있어 통계/타겟팅이 비정상.
- 출금 조건 계산 로직과 운영/관리 UI 세그먼트 키가 달라 필터/타겟이 어긋남.

### 🔍 원인 (증거 기반)
- DB 규칙 조회 결과(운영일 KST 기준 무관, 규칙 자체 불일치):
  - `v2_segment_rule_segments`: [('VIP',1),('ACTIVE',1),('AT_RISK',1),('DORMANT',1),('NEW',1)]
- V2 서비스는 COMMON/VIP/WHALE/AT_RISK 기준으로 계산하도록 변경되어 있어 DB 규칙과 충돌.
- 이벤트 타겟팅이 레거시 `user_segment`를 조회해 V2-only 정책 위반.

### 🛠 해결
1) DB 규칙 재시드
    - `v2_segment_rule`을 COMMON/VIP/WHALE/AT_RISK로 재시드
2) 코드/통계/타겟팅 정렬
    - 세그먼트 통계/관리 UI/이벤트 타겟팅을 동일 키로 통일
3) 문서 정합
    - `v2_user_segment_policy_sot_ko.md`, DB 스키마 문서에 표준 키/기본값 반영

### ✅ 검증 방법
- DB에서 `v2_segment_rule_segments`가 COMMON/VIP/WHALE/AT_RISK만 존재하는지 확인
- `/api/v2/admin/segments/stats` 응답에 4개 세그먼트가 정상 집계되는지 확인
- 이벤트 타겟팅이 V2 세그먼트 기준으로 동작하는지 확인

### 📅 적용 일자
- 2026-02-02

---

## Issue 1: 어드민 금고 내역 로그 시각화 부재

### 📝 증상
- 어드민 > 유저 디테일 드로우에서 유저의 금고 변동 내역(입출금, 게임, 상점 구매 등)을 확인할 수 없음.
- 단순 총액(`vault_locked_balance`)만 표시되어 구체적인 차감/지급 사유 추적 불가.

### 🔍 원인
- 백엔드에 `VaultLedger`를 유저별로 전체 조회하는 전용 API 부재.
- 프론트엔드 `UserDetailDrawer`에 금고 내역 탭 미구현 (또는 레거시 API 의존).

### 🛠 해결
- **Backend**: `GET /api/v2/admin/users/{user_id}/vault-logs` 엔드포인트 신설. (UserRoutes)
    - `VaultLedger` 테이블을 조회하여 Game, Admin, Shop, Mission 등 모든 `ref_type` 필터링 없이 반환.
- **Frontend**: `UserDetailDrawer` > `Vault History` 탭 구현 및 `useV2Admin` 훅 연결.

### 📅 적용 일자
- 2026-02-01 (Hotfix)

---
