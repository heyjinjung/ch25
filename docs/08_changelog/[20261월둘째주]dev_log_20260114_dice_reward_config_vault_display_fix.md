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
*   **Frontend Build**: 실패
    *   Error: `src/admin/components/vault/VaultSettingsEditor.tsx` TypeScript syntax error (TS1109/TS1128 등 다수)
    *   Note: 본 로그에 포함된 주사위 정합화 패치는 backend 2개 파일 중심이며, 프론트 빌드 실패는 별도 원인으로 분리 추적 필요.

## 6. Next Actions (Pending)
*   **Admin 금고 페이지 주사위 값 표시**:
    *   어드민 금고 페이지에서 주사위 값이 하드코딩되어 최신 설정값을 못 받는 이슈가 보고됨.
    *   다음 작업에서 하드코딩 제거 후, **활성 DiceConfig 기반 표시**로 교체(필요 시 NORMAL/EVENT 값을 분리 표기).
