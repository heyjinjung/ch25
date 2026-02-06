문서 타입: SoT (정본)
버전: v2.1
최종 검토일: 2026-02-06
상태: Stable
도메인: vault
정합성 상태: 🟢 (spending_ledger 및 vault_locked_balance 일치)

## 0. SoT 정합성 지표
- **대상 테이블**: `v2_spending_ledger`, `v2_user` (vault 필드), `user` (legacy)
- **코드 매핑**: `app/v2/models/v2_spending_ledger.py`, `app/v2/services/vault_service.py`
- **정합성 요약**:
  - 🟢 금고 잔액 정본 (`v2_user.vault_locked_balance`)
  - 🟢 통합 지출 원장 (`v2_spending_ledger`)
  - 🔴 혜택 중단 (`benefits_suspended`): DB 필드 직접 존재 여부 확인 중 (서비스 계산식 의존)

---

## 1. 개요 (Overview)
재화의 지출(Outflow)과 금고 잔액 관리의 단일 진실 공급원(SoT)을 정의한다. 지출 통합 원장(Spending Ledger)을 통해 투명한 자산 흐름을 보장한다.

## 2. 출금/입금 관련 용어 정의
- **금고포인트**: 금고 잠금 잔액 (`vault_locked_balance`).
- **당일 실질 입금 (`cc_deposit`)**: 전일 대비 순증(Net Increase) 기준의 유효 입금액. (일순수익 계산의 핵심)
- **혜택 중단 (`benefits_suspended`)**: 장기 미활동(7일↑) 또는 무입금 유저의 상점/참여 차단 상태. (금고 한도 30,000 제한)

## 3. 출금 자격 및 조건 (Withdrawal Eligibility)
| 세그먼트 | 최근 3일 게임 플레이 | 오늘 상점 이용 금액 | 비고 |
| :--- | :--- | :--- | :--- |
| **NEW** | **5회** | **0원** | 신규 혜택 강조 |
| **COMMON** | **15회** | **5,000원** | 당일 1만↑ 입금 필수 |
| **VIP** | **10회** | **0원** | 당일 10만↑ 입금 시 면제 |
| **AT_RISK** | **30회** | **10,000원** | 위험군 관리 강화 |

---

## 4. 운영 리스크 및 패치 가이드

### [긴급 주의사항]
- **제재 필드 누락**: `ShopService.purchase` 시 `benefits_suspended` 검사가 누락될 경우 정책 위반 구매가 가능함. (긴급 패치 반영 여부 확인 필)
- **리셋 시점 충돌**: 09:00 KST 리셋 정책과 기존 자정(00:00) 기준이 서비스별(Vault/Mission)로 혼용되지 않도록 주의.

### [통합 지출 원장 기록 소스]
- `HQ_W`: 외부 카지노 환전액.
- `VAULT_W`: 내부 금고 출금 승인.
- `SHOP_U`: 상점 아이템 구매.

---

## 5. 검증 체크리스트 (QA)
- [x] 🟢 모든 출금 신청 시 `v2_spending_ledger`에 고유 ID로 기록되는지 확인
- [ ] 🔴 제재된 유저가 상점 호출 시 403 에러가 발생하는지 통합 테스트
- [ ] 🟡 09:00 KST 리셋 정책이 금고 사용 한도 초기화에 정상 적용되었는지 확인

---

## 6. 변경 이력
- v2.1 (2026-02-06, Antigravity): 수동 정리 요청에 따라 누락된 상세 출금 조건, 정책 충돌 주의사항, 패치 원칙 복원 통합.
- v1.0 (2026-01-18, GitHub Copilot): 초기 금고 정책 작성
