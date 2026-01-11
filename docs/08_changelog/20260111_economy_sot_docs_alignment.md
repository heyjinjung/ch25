# 2026-01-11 — Economy SoT 문서 정합성 정리(문서만)

## 배경
최근 경제/진행 도메인의 SoT가 문서 간 불일치(특히 DIAMOND/XP/cash_balance 표현)로 인해 운영/개발 기준이 흔들릴 수 있어, **문서만** 최소 diff로 정리했다.

- 본 작업은 실행/테스트/마이그레이션 없이 문서 정합성 관점에서 수행했다.

## 변경 요약(SoT)
- **DIAMOND SoT**: Wallet이 아니라 **Inventory SoT** (`user_inventory_item`/`user_inventory_ledger`)
- **XP/레벨 SoT**: `season_pass_progress` + `season_pass_stamp_log`/`season_pass_reward_log` (POINT/Vault와 혼용 금지)
- **cash_balance / grant_point**: 신규 지급/차감 write 금지(레거시/마이그레이션/운영툴 목적 외 사용 금지). 문서에서 “완전 제거” 같은 표현은 지양.
- **xp_from_game_reward**: (Deprecated) 신규 설계에서는 `reward_type=GAME_XP`만 XP로 반영하고, POINT는 금고(현금성)와 분리.

## 변경된 문서
- [docs/06_ops/202601/[20261월첫째주] [2026001#]inventory_voucher_system_ko.md](docs/06_ops/202601/%5B20261%EC%9B%94%EC%B2%AB%EC%A7%B8%EC%A3%BC%5D%20%5B2026001%23%5Dinventory_voucher_system_ko.md)
  - “인벤 없음/DIAMOND=wallet” 전제를 제거하고, DIAMOND=Inventory SoT 기준으로 용어/예시를 정리.
- [docs/05_modules/design/[20261월첫째주] [2026001#]inventory_voucher_system_ko.md](docs/05_modules/design/%5B20261%EC%9B%94%EC%B2%AB%EC%A7%B8%EC%A3%BC%5D%20%5B2026001%23%5Dinventory_voucher_system_ko.md)
  - 동일하게 DIAMOND=Inventory SoT 반영 및 Shop auto-fulfill 전제(키/티켓류) 추가.
- [docs/06_ops/new_member_vault_funnel_plan_v1.0.md](docs/06_ops/new_member_vault_funnel_plan_v1.0.md)
  - `vault_balance`/`cash_balance` 도입을 “확정”으로 단정한 과거 설계를 **레거시 배너**로 명시하고, 현행 Vault SoT와 차이를 상단/DB 섹션에 주석 처리.
- [docs/06_ops/202601/[20261월첫째주] [2026001#]economy_onboarding_v7.md](docs/06_ops/202601/%5B20261%EC%9B%94%EC%B2%AB%EC%A7%B8%EC%A3%BC%5D%20%5B2026001%23%5Deconomy_onboarding_v7.md)
  - cash_balance/`grant_point()`/`xp_from_game_reward` 관련 문구를 현행 정책(레거시/Deprecated) 기준으로 현실화.

## 운영/리스크 메모
- 문서가 참조하는 과거 설계(퍼널)와 현행 SoT(금고 단일 SoT)는 다르므로, **운영/개발은 최신 SoT 문서/감사 플랜을 우선**한다.
