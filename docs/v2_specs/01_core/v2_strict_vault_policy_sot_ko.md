# V2 강력한 금고 정책 (Strict Vault Policy SoT)

**문서 타입**: 정책(Policy) / V2 SoT
**버전**: v2.0
**작성일**: 2026-01-19
**상태**: SoT (Source of Truth)
**프로젝트**: Golden V2

---

## 1. 목적 (Purpose)
- 금고(Vault)의 보안성을 강화하고 무입금자(Free-Rider) 및 장기 미활동(Inactive) 유저에 대한 혜택 제한 기준을 명확히 합니다.
- 입금 유인을 제공하고 시스템의 경제 건전성을 유지하기 위한 "혜택 중단(Benefit Suspension)" 로직을 표준화합니다.

## 2. 적용 범위 (Scope)
- **대상 유저**: 전체 V2 유저
- **영향 기능**: 출금(Withdraw), 상점(Shop), 게임(Game), 금고 적립(Earn)
- **관련 문서**:
    - [금고 용어 SoT](v2_vault_glossary_sot_ko.md) (입/출금 용어 정의)
    - [보상 매핑 SoT](v2_reward_mapping_sot_ko.md) (보상 경로 정의)

---

## 3. 정책 상세 (Policy Details)

### 3.1 출금 자격 (Withdrawal Eligibility)
출금(`vault_withdrawal_request`)은 아래 **당일 실질 입금(`cc_deposit`)** 조건을 만족해야만 신청 및 승인 가능합니다.

조건 표기 형식: [금고 용어 SoT](v2_vault_glossary_sot_ko.md#41-출금-조건-표기-형식) 기준.

| 조건명 | 기준 (SoT) | 설명 |
| :--- | :--- | :--- |
| **당일 실질 입금** | `cc_deposit` / `cc_data` | 단순 데이터 갱신이 아닌, **전일 대비 순증(Net Increase)**이 확인되어야 함. (정의: [Vault Glossary](v2_vault_glossary_sot_ko.md)) |
| **활동성 체크** | `UserActivity` | (Fallback) 외부 연동 지연 시 내부 원장의 `last_charge_at` 등을 보조적으로 활용 가능하지만, 원칙은 `cc_deposit` 우선. |

### 3.2 유저 상태 및 혜택 중단 (Status & Suspension)
유저의 활동 이력(입금/접속)에 따라 등급을 분류하고, 제재 상태(`benefits_suspended`)를 적용합니다.

| 상태 (Status) | 조건 (Condition) | 제재 여부 (`benefits_suspended`) | 제재 내용 |
| :--- | :--- | :--- | :--- |
| **ACTIVE** | 최근 입금일로부터 **7일 이내** | `False` | 정상 이용 (무제한 금고 한도) |
| **WARNING** | 최근 입금일로부터 **4~6일 경과** | `False` | 정상 이용 (UI 경고 노출) |
| **INACTIVE** | 최근 입금일로부터 **7일 이상 경과** | **`True`** | **상점/게임 이용 차단, 금고 한도 축소** |

### 3.3 금고 보유 한도 (Vault Limit Cap)
시스템 리스크 관리를 위해 상태별로 금고 보유 한도를 차등 적용합니다.

- **ACTIVE 유저**: **무제한 (Unlimited)**
- **INACTIVE / 무입금 유저**: **30,000 KRW**
    - 한도 초과 시 추가 적립(Earn)이 차단되거나 소멸됩니다. (UI: "⚠️ 한도 초과")

### 3.4 데이터 정합성 (Data Consistency)
**Double Counting 방지를 위한 단일 진실 공급원(SSoT) 원칙입니다.**

1.  **Balance SoT**: `User.vault_locked_balance` (Locked)
    - Admin/Client UI는 오직 이 필드만 참조하여 "금고 보유액"으로 표기해야 합니다.
    - `vault_available_balance` (Available) 필드는 **사용하지 않거나 0으로 고정**합니다.
    - `vault_balance` (Legacy) 필드는 `vault_locked_balance`와 항상 동기화되어야 합니다. (Legacy Migration용)

2.  **계산 공식**:
    - `Total Vault Balance` = `vault_locked_balance`
    - (`vault_locked_balance` + `vault_available_balance`)와 같은 합산 로직은 **엄격히 금지**합니다.

---

## 4. 구현 요구사항 (Implementation Requirements)

### 4.1 서비스 레이어 차단 (Service Enforcement)
`benefits_suspended=True` 상태인 유저가 접근 시, 백엔드 서비스 레이어에서 즉시 차단해야 합니다.

1.  **Shop Service**: 기프티콘, 아이템 구매 시도 시 `403 Forbidden` (Code: `BENEFITS_SUSPENDED`)
2.  **Game Service**: 유료 게임(티켓 소모) 플레이 시도 시 `403 Forbidden`
    - *예외*: 무료 티켓이나 Daily Free Spin은 기획 의도에 따라 허용 가능하나, 원칙적으로는 "입금 유도"를 위해 차단 권장.

### 4.2 UI 시각화 (Visual Feedback)
유저가 제재 상황을 명확히 인지해야 합니다.

- **금고 UI**: 상태 배지(Green/Yellow/Red) 및 한도 경고 표시.
- **상점 UI**: 구매 버튼 비활성화(Lock Icon) 및 "입금 필요" 툴팁 제공.

---

## 5. 변경 이력
- v2.0 (2026-01-19, GitHub Copilot): V2 SoT 표준화. 용어(`cc_deposit`) 통일 및 구조 재정의.
- v1.0 (2026-01-17): 기존 `2026_strict_vault_policy.md` (V1 구현)
