문서 타입: 인덱스 (정본 지도)
버전: v2.0
작성일: 2026-02-06
상태: Stable

# 🗺️ V2 System of Truth (SoT) 지도

이 문서는 프로젝트의 모든 정책과 스펙을 관리하는 정본(SoT) 문서들의 관제탑입니다. 각 도메인은 단 하나의 **메인 SoT**를 가지며, 모든 최신 정책은 해당 문서에 병합됩니다.

---

## 1. 도메인별 핵심 SoT (Stable)

| 도메인 | 메인 SoT 문서 (정본) | 정합성 | 설명 |
| :--- | :--- | :---: | :--- |
| **User** | [v2_sot_user_ko.md](./user/v2_sot_user_ko.md) | 🟢 | 유저 정보, JIT 동기화, 세그먼트, 제재 정책 |
| **Vault** | [v2_sot_vault_ko.md](./vault/v2_sot_vault_ko.md) | 🟢 | 금고 잔액, 출금 자격, 통합 지출 원장 |
| **Auth** | [v2_sot_auth_ko.md](./auth/v2_sot_auth_ko.md) | 🟢 | 인증 감사 로그, 마케팅 메시징 가드레일 |
| **Game** | [v2_sot_game_ko.md](./game/v2_sot_game_ko.md) | 🟢 | 외부 로그 CSV 포맷, 실시간 개입 로직 |
| **Shop** | [v2_sot_shop_ko.md](./shop/v2_sot_shop_ko.md) | 🟢 | 상품 SKU, 구매 차단 정책, 공백 리스크 방어 |
| **Mission** | [v2_sot_mission_ko.md](./mission/v2_sot_mission_ko.md) | 🟢 | 신규 유저 미션 6종, 보상 및 FAB 타이머 |
| **Golden** | [v2_sot_game_ko.md](./game/v2_sot_game_ko.md#3-실시간-분석-및-개입-정책-golden-logic) | 🟢 | 고액 배팅/연패 개입 및 이탈 위험도 분석 |

> **이모지 가이드**: 🟢 (정합 완료) / 🟡 (확정 중) / 🔴 (불일치 - 수정 요망) / ⚪ (준비 중)

---

## 2. 문서 관리 원칙
1. **정본 1법칙**: 각 도메인 폴더(`docs/SOT/{domain}/`)에는 단 하나의 `v2_sot_*.md`만 존재한다.
2. **패치 격리**: 아직 정본에 합쳐지지 않은 변경사항은 `변경로그/` 폴더에 위치한다.
3. **아카이브**: 정본 업데이트 후 이전 버전은 `아카이브/` 폴더로 이동한다.

---

## 3. 유용한 링크
- [개발 환경 구축 가이드](../v2_specs/99_guides/v2_dev_env_setup_ko.md)
- [트러블슈팅 로그](../v2_specs/90_troubleshooting/)
- [API 명세 (OpenAPI)](../v2_specs/03_api/)

---

## 변경 이력
- v2.0 (2026-02-06): 급진적 정본 중심 구조로 전면 개편
