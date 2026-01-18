문서 타입: SoT
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 금고 관련 용어의 단일 기준을 확정한다.

## 2. 범위 (Scope)
- 출금/입금 판단/혜택 중단 관련 용어
- **관련 문서**:
    - [강력한 금고 정책 SoT](v2_strict_vault_policy_sot_ko.md) (혜택 중단 상세)
    - [보상 매핑 SoT](v2_reward_mapping_sot_ko.md) (적립 경로 상세)

## 3. 용어 정의 (Definitions)
- 금고포인트: 금고 잠금 잔액(SoT)
- 출금: 금고 누적액을 외부 환전 가능한 흐름으로 전환/신청

## 4. 금고 용어 표 (SoT)

### 4.1 출금 조건 표기 형식
출금 조건의 표기 방식은 아래 표를 기준으로 하며, 정책 상세는 [강력한 금고 정책 SoT](v2_strict_vault_policy_sot_ko.md#31-출금-자격-withdrawal-eligibility)를 따른다.
| 용어 | 키워드 | SoT (DB.Field) | 설명 | 로그/레저 | 주의사항 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 환전(출금) | Withdraw | `vault_withdrawal_request` | **[조건]**<br>1) 당일 `cc_deposit` 1만 이상 (순증)<br>2) 당일 상점 1만 포인트 사용<br>3) 3일간 V2 게임 30회 이용<br>(정책 상세: [강력한 금고 정책 SoT](v2_strict_vault_policy_sot_ko.md#31-출금-자격-withdrawal-eligibility)) | **[회차별 한도]**<br>1회: 1만 / 2회: 1만<br>3회: 3만 / 4회: 5만 |
| 당일 실질 입금 | `cc_deposit` / `cc_data` | `cc_deposit` / `cc_data` | 출금 조건을 위한 "오늘의 유효 입금" 판단 로직.<br>**단순 입금액이 아닌 전일 대비 순증(Net Increase) 기준** | 키워드 `daily_deposit` 폐기 |
| 혜택 중단 | `benefits_suspended` | `vault_policy_status` | 장기 미활동(7일 이상) 또는 무입금 유저의 상점/게임/적립 차단 상태<br>(상세: [Strict Vault Policy](v2_strict_vault_policy_sot_ko.md) 참조) | 금고 한도 30000 제한 및 구매 불가 |

## 5. 운영/검증 (QA)
- [ ] 용어/키워드/SoT 일치 여부 확인
- [ ] 출금/입금 조건 해석 일관성 확인

## 6. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
