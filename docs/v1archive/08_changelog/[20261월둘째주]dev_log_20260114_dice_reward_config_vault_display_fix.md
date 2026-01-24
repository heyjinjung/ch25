# Development Log (2026-01-14)

## 1. 주사위 보상 설정값(어드민) → 실제 보상/금고 적립 정합화
*   **Goal**: 어드민에서 변경한 주사위 보상값이 **게임 화면 표시 + 금고(vault_locked_balance) 적립**에 모두 동일하게 반영되도록 정합.
*   **Problem**:
    *   DiceConfig(DB) 값은 수정되어 있고(예: `WIN=1000 / DRAW=0 / LOSE=-500`), 게임 페이지 결과에는 반영되지만,
    *   금고 적립 로직은 Vault2 전역 설정(`VaultProgram.config_json.game_earn_config.DICE`)이 있으면 그 값을 우선 적용하여 **DiceConfig 변경이 무시되는 케이스**가 발생.
    *   추가로 DiceService가 Vault 적립에 전달하는 `payout_raw.reward_amount`가 `>0`인 경우만 전달되어(음수/0이 0으로 뭉개짐), LOSE/DRAW 같은 케이스가 정확히 반영되지 않음.
*   **Fix**:
    *   **Backend**
        *   `DiceService`에서 `payout_raw.reward_amount`를 **실제 reward_amount(음수 포함)**로 전달하되, 안전하게 `reward_type`이 `POINT/CC_POINT/NONE`일 때만 전달.
        *   `VaultService.record_game_play_earn_event()`에서 DICE에 한해:
            *   `mode=NORMAL`이면 **DiceConfig 기반(payout)** 금액을 우선 적용 (전역 game_earn_config가 있어도 NORMAL은 DiceConfig가 SoT)
            *   `mode=EVENT`이면 기존처럼 **Vault2 전역 설정(game_earn_config.DICE)** 사용
*   **Files**:
    *   `app/services/dice_service.py`
    *   `app/services/vault_service.py`
*   **Verification**:
    *   Backend: `python -m compileall app/services/dice_service.py app/services/vault_service.py` 통과

## 2. 어드민 상점 운영 UX 개선
*   **Goal**: 신규 상품 생성 시 SKU 생성/관리 스트레스를 낮추고 운영 속도 향상.
*   **Changes**:
    *   어드민 상점 상품 추가 모달에 **SKU 자동 생성** 버튼 추가
    *   VAULT 결제 상품의 토큰 라벨(표기) 지원 보강
*   **Files**:
    *   `src/admin/pages/AdminShopPage.tsx`

## 3. 교환소(/shop) 버튼 레이아웃 안정화 (텔레그램 인앱 좁은 뷰포트)
*   **Goal**: 모바일/텔레그램 인앱에서 버튼 찌그러짐 제거.
*   **Changes**: 버튼 내부 레이아웃을 가격 pill/라벨 분리 + shrink/min-height 처리로 안정화.
*   **Files**:
    *   `src/pages/ExchangePage.tsx`

## 4. 보안 힌트 대응 (noopener/noreferrer)
*   **Goal**: `target="_blank"` 링크 보안 가이드 준수.
*   **Changes**: 외부 링크에 `rel="noopener noreferrer"` 적용, `window.open` 옵션 보강.
*   **Files**:
    *   `src/pages/NewUserWelcomePage.tsx`
    *   `src/components/vault/VaultPageCompact.tsx`

## 5. Build Status
*   **Frontend Build**: 성공 (재확인)
    *   Note: 직전 빌드에서 `src/admin/components/vault/VaultSettingsEditor.tsx` TypeScript 문법 오류가 관측되었으나, 현재는 해소되어 빌드가 통과하는 상태.

## 6. 문서 상태
*   본 문서(`dev_log_20260114_dice_reward_config_vault_display_fix.md`)의 렌더링/포맷 깨짐 이슈는 복구 완료.

## 7. Next Actions (Pending)
*   **Admin 금고 페이지 주사위 값 표시**:
    *   어드민 금고 페이지에서 주사위 값이 하드코딩되어 최신 설정값을 못 받는 이슈가 보고됨.
    *   다음 작업에서 하드코딩 제거 후, **활성 DiceConfig 기반 표시**로 교체(필요 시 NORMAL/EVENT 값을 분리 표기).

*   **Admin 상점 상품 Create/Update 즉시 저장(Autosave)**:
    *   어드민 상품 추가/수정 모달의 Create/Update가 서버에 즉시 저장되지 않아, 유저 교환소 노출(/api/shop/products)이 지연/누락되는 운영 이슈가 확인됨.
    *   다음 작업에서 Create/Update 시점에 `/admin/api/shop/products/overrides`로 **즉시 PUT 저장**(autosave)으로 변경.
    *   저장 성공 시 어드민 목록/오버라이드 쿼리 refetch(invalidate)로 UI 즉시 갱신.
    *   (옵션) 운영 속도를 위한 “계속 추가” 토글 제공.

## 8. 오늘 진행내용 추가 정리 (운영 UX / 상점 / 보유함)
*   **범위**: 본 문서는 “2026-01-14 오늘 작업 모음” 로그로 누적 업데이트.
    *   VIP 관련 상세 로그는 별도 문서로 관리: [[20261월둘째주]dev_log_20260114_vip_entry_production.md](./[20261월둘째주]dev_log_20260114_vip_entry_production.md)

*   **Vault 출금 에러 UX**:
    *   출금 실패 에러코드(예: `DEPOSIT_REQUIRED_TODAY`)를 사용자 친화 한글 메시지로 정리.

*   **헤더 동선 변경**:
    *   헤더 드롭다운의 “인벤토리” 동선을 “교환소(/shop)”로 변경.

*   **프리미엄 룰렛 403 UX 개선**:
    *   403을 “로그아웃”으로 오인하는 흐름 제거.
    *   충전 유도(CTA) 모달 제공 및 탭 클릭 사전 차단으로 튕김/혼선 방지.

*   **금고 페이지 버튼 컴팩트화**:
    *   버튼 크기 및 hover 강도를 낮춰 UI 과장 느낌을 완화.

*   **체험 티켓(TRIAL_TOKEN) 정책 검증**:
    *   문서/코드 근거 기반으로 “체험티켓 유지” 결론 정리.

*   **유저 상점/교환소 UI 개선**:
    *   구매 버튼에 “구매” 텍스트를 명시하고, 가격 pill 스타일을 정리.
    *   텔레그램 인앱(좁은 뷰포트)에서 버튼/텍스트가 깨지지 않도록 레이아웃 안정화.

*   **보유함(인벤토리) UI 정리**:
    *   영어 문구 제거, 카드 내부 가운데 정렬, 2줄 타이틀 깨짐 방지(line-clamp/min-height).

*   **교환소 문구/라벨 정리**:
    *   “마일리지 사용” 라벨 제거.
    *   결제 토큰이 DIAMOND인 경우 부족 문구를 “다이아 부족”으로 표시(기타 토큰은 기존 정책 유지).

*   **관련 파일(주요)**:
    *   `src/pages/ShopPage.tsx`
    *   `src/pages/ExchangePage.tsx`
    *   `src/pages/InventoryPage.tsx`
    *   `src/components/vault/VaultPageCompact.tsx`

## 9. 어드민에서 추가한 상품이 유저 교환소에 안 뜨는 이슈 (조사 결과)
*   **현상**: 어드민에서 상품을 “추가했다”고 생각했는데, 유저 교환소(/shop) 새로고침 후에도 노출되지 않음.

*   **구조(SoT)**:
    *   유저 노출 상품 목록은 `ShopService.list_products()`가 생성.
    *   구성은 기본 `SHOP_PRODUCTS` + DB `AppUiConfig(shop_products)` 오버라이드 병합.

*   **근거(운영 확인)**:
    *   DB `AppUiConfig(shop_products)`의 key 수가 **6개** 수준으로 확인됨.
    *   서버 `ShopService.list_products()` 결과도 **6개**만 노출(기본 5 + 커스텀 1).

*   **결론(가장 가능성 높음)**:
    *   어드민 모달 Create/Update는 로컬 상태만 변경되고, 실제 서버 저장은 별도의 “전체 저장” 버튼에 의존하는 흐름일 가능성이 큼.
    *   결과적으로 신규 SKU가 DB에 upsert되지 않아 유저 API(`/api/shop/products`)에 반영되지 않음.

*   **대응(예정)**:
    *   Create/Update 시 즉시 서버 저장(Autosave)로 전환하여 “추가 즉시 노출” 운영 정합 보장.
