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

## Issue 4: 금고 집계 카드 상세 모달에서 유저 상세 이동 불가

### 📝 증상
- 금고 관리 화면에서 집계 카드(총 유저 수/총 잠금 잔액/총 가용 잔액/제재 유저) 클릭 시 상세 모달이 열리지만,
  모달 내 유저 클릭 시 회원관리 디테일 드로우로 이동하지 못함.

### 🔍 원인
- 상세 모달의 유저 행이 단순 텍스트로 렌더링되어 라우팅 연결이 없었음.
- 회원관리 드로우를 열기 위한 URL 파라미터 연동이 누락됨.

### 🛠 해결
1) 금고 상세 모달 유저 행 클릭 시 `/admin/users?userId={id}&tab=vault`로 이동
2) 회원관리 페이지에서 URL 파라미터로 드로우 자동 오픈 처리

### ✅ 검증 방법
- 금고 관리 > 집계 카드 클릭 후 유저명 클릭 시 회원관리 드로우가 열리는지 확인
- 드로우 기본 탭이 `vault`로 열리는지 확인

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

## 01-21 - [VAULT/ADMIN] 티켓 및 인벤토리 로그 닉네임 검색 불가

**우선순위**: P2
**관련 도메인**: VAULT, INVENTORY, ADMIN

### 증상
- 티켓/인벤토리 로그 화면에서 닉네임 입력 후 조회 시 필터링이 동작하지 않고 전체 결과가 표시됨.
- 리스트 내 닉네임 필드가 `-`로 표시됨.

### 근본 원인
- **계약 불일치**: 프론트엔드는 camelCase(`userId`)로 쿼리를 보내나, 백엔드(`inventory_routes.py`)는 snake_case(`user_id`)만 처리함.
- **데이터 누락**: 지갑/인벤토리 로그 원장 조회 시 닉네임 필드 조인이 누락됨.

### 해결 조치
- API 호출 파라미터를 snake_case로 통일.
- 로그 조회 쿼리에 User 테이블 조인을 추가하여 `nickname` 필드 보강.

### 검증 방법
- 특정 유저의 닉네임으로 검색 시 해당 유저의 로그만 정확히 필터링되는지 확인.

---

## 01-25 - [VAULT/REWARD] INVALID_REWARD_TYPE 어드민 오류

**우선순위**: P2
**관련 도메인**: VAULT, GAME, ADMIN

### 증상
- 어드민 페이지에서 수동 보상 지급 시 `INVALID_REWARD_TYPE` 에러 발생하며 지급 실패.

### 근본 원인
- V2 보상 시스템(`vault2_service.py`)에서 허용하지 않는 레거시 보상 타입 상수가 전달됨.

### 해결 조치
- 보상 타입 상수를 V2 표준으로 동기화하고, `vault2_service.py` 내의 유효성 체크 로직 강화.

### 검증 방법
- 어드민 보상 지급 모달에서 모든 타입(TICKET, POINT 등)의 보상이 정상 지급되는지 확인.

---

## 변경 이력
- 2026-02-01: W05 VAULT 문서 생성 및 금고 입출금 통합 내역 조회 UI 연동
- 2026-02-01: 세그먼트별 출금 조건 목표값 불일치(20,000 vs 5,000) 수정 및 SoT 정렬
- 2026-02-02: 보상 타입 오류 및 상점 비즈니스 검증 내역 추가 (Antigravity)
- 2026-02-02: 티켓/인벤 로그 검색 및 닉네임 매핑 사례 추가 (Antigravity)
- 2026-02-02: V2 세그먼트 키 불일치 및 유저 상세 이동 오류 해결 내역 추가 (Antigravity)
