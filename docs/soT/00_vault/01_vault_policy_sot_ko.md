문서 타입: SoT (정책 통합)
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: Stable
도메인: VAULT

## 1. 목적
- 분산된 금고 정책 SoT를 단일 기준으로 통합한다.
- 정책 충돌 시 최신 일자 우선 규칙을 명시해 운영 혼선을 제거한다.
- 금고 잔액, 출금, 제재, 리셋 기준을 일관된 기준으로 고정한다.

## 2. 범위
- 금고 잔액 SoT, 출금 자격, 혜택 중단, 리셋 기준
- 상점 및 게임 연동 정책(차감, 적립, 제재 적용)
- 정책 표현, 운영 체크리스트, 충돌 처리 규칙

## 3. SoT 우선순위 및 충돌 해결
- 동일 주제 충돌 시 최신 작성일 문서가 우선한다.
- 최신 정책 적용 근거(최신 순):
  - 2026-02-06: v2_sot_vault_ko.md
  - 2026-02-04: 20260204_vault_ledger_bypass_critical_fix.md
  - 2026-02-04: 20260204_vault_ledger_reward_alignment.md
  - 2026-02-04: 20260204_legacy_purge_and_v2_migration_completion.md
  - 2026-01-28: 20260128_vault_balance_sync_update.md
  - 2026-01-27: 20260127_vault_today_spent_shop_purchase_update.md
  - 2026-01-27: 20260127_vault_play_count_update.md
  - 2026-01-27: 20260127_vault_withdrawal_modal_condition_delivery_fix.md
  - 2026-01-27: 20260127_dice_vault_deduction_fix.md
  - 2026-01-26: 2026-01-26_vault_withdrawal_condition_consistency_report.md
  - 2026-01-19: v2_strict_vault_policy_sot_ko.md
  - 2026-01-18: v2_vault_glossary_sot_ko.md

## 4. 정책 상태 요약
- SoT 수립일: 2026-01-18
- SoT 최신화일: 2026-02-06
- 최신 정책 핵심: locked 단일 기준, VaultLedger 기록 의무, 09:00 KST 리셋
- 제재 정책 상태: benefits_suspended는 서비스 레이어 강제 차단

## 5. 용어 및 기본 정의
- 금고포인트: user.vault_locked_balance 단일 기준
- 당일 실질 입금: cc_deposit 순증(Net Increase)
- 오늘 사용 금액: user.vault_spent_today (09:00 KST 리셋)
- 출금 요청: vault_withdrawal_request
- 혜택 중단: benefits_suspended 또는 정책 계산 상태

## 6. 금고 잔액 SoT
### 6.1 단일 진실 공급원
- 금고 보유액은 user.vault_locked_balance만 사용한다.
- 모든 화면, 리포트, 집계는 locked 단일 기준으로 표기한다.

### 6.2 금지 규칙
- locked + available 합산 로직은 정책 위반이다.
- vault_available_balance 신규 write 금지.
- vault_balance 신규 write 금지(레거시 호환 목적 제외).

### 6.3 동기화 원칙
- User와 V2User 잔액은 사건 발생 후 즉시 동기화한다.
- 브릿지 경로에서는 DB의 최종 잔액을 기준으로 절대값 동기화한다.

## 7. 출금 자격 정책
### 7.1 기본 조건
- 당일 실질 입금(cc_deposit 순증) 충족
- 당일 금고 사용(vault_spent_today) 충족
- 최근 3일 내 게임 플레이 횟수 충족
- 회차별 최소 출금 금액 충족

### 7.2 세그먼트별 출금 조건
- 기준: Asia/Seoul, 09:00 리셋

| 세그먼트 | 최근 3일 게임 플레이 | 오늘 사용 금액 | 입금 조건 | 비고 |
| --- | --- | --- | --- | --- |
| NEW | 5회 | 0원 | 당일 1만 이상 | 신규 혜택 강조 |
| COMMON | 15회 | 5,000원 | 당일 1만 이상 | 표준 조건 |
| VIP | 10회 | 0원 | 당일 10만 이상 | 혜택 강화 |
| WHALE | 0회 | 0원 | 당일 10만 이상 | 플레이/소비 면제 |
| AT_RISK | 30회 | 10,000원 | 당일 1만 이상 | 위험군 완화 |

### 7.3 회차별 최소 금액
| 회차 | 최소 금액 |
| --- | --- |
| 1회 | 10,000 |
| 2회 | 10,000 |
| 3회 | 30,000 |
| 4회 | 50,000 |

### 7.4 조건 표기 원칙
- UI 문구는 BE 정책과 동일한 시간 범위를 사용한다.
- 플레이 조건: 최근 3일 기준 표기
- 사용 조건: 오늘 사용 금액 표기
- 입금 조건: 당일 실질 입금 표기

### 7.5 조건 계산 원칙
- 플레이 횟수는 v2 및 legacy 게임 로그를 합산한다.
- 소비 금액은 상점 소비만 반영한다.
- 입금 조건은 cc_deposit 순증 기준을 사용한다.

## 8. 혜택 중단 정책
### 8.1 상태 정의
| 상태 | 조건 | benefits_suspended | 제재 |
| --- | --- | --- | --- |
| ACTIVE | 최근 입금 7일 이내 | False | 정상 |
| WARNING | 4~6일 경과 | False | 경고 표시 |
| INACTIVE | 7일 이상 | True | 상점/게임 차단 |
| ADMIN_FORCED | 수동 설정 | True/False | 운영 통제 |

### 8.2 금고 한도
- INACTIVE 유저 금고 한도 30,000
- 한도 초과 적립은 차단 또는 소멸 처리

### 8.3 차단 적용 원칙
- 차단은 서비스 레이어에서 강제한다.
- UI 차단만으로는 정책 충족으로 보지 않는다.

## 9. 상점 연동 정책
- 상점 구매는 금고 차감과 오늘 사용 금액 누적을 동시에 수행한다.
- 상점 구매는 소비 전용 메서드를 사용한다.
- 상점 구매는 VaultLedger에 ref_type=SHOP로 기록한다.
- benefits_suspended 유저는 구매 403으로 차단한다.

## 10. 게임 연동 정책
- POINT/CC_POINT 보상은 금고 적립으로 처리한다.
- 음수 보상은 금고 차감으로 처리한다.
- 골든아워 배율은 금고 적립과 차감 결과에 반영된다.

## 11. 원장 정책(VaultLedger)
- 모든 금고 잔액 변경은 VaultLedger 기록이 필수다.
- 직접 잔액 수정은 금지한다.
- 보상 적립 경로는 반드시 deposit 경로로 기록한다.
- 관리자 수동 조정도 VaultLedger 기록이 필수다.

## 12. 시간대 및 운영일 정책
- 모든 비즈니스 로직은 Asia/Seoul 기준이다.
- 운영일 리셋은 09:00 KST 기준이다.
- Naive datetime 사용 금지.
- 일일 지표는 09:00~익일 08:59:59를 기준으로 계산한다.

## 13. 정책 충돌/예외 처리
- 정책과 구현이 불일치할 경우 최신 SoT 문서를 우선한다.
- 예외가 필요하면 운영 예외로 명시하고 변경로그에 남긴다.
- 레거시 경로는 제거 전까지 정책 표현을 고정한다.

## 14. 데이터 흐름 예시
1) CC 입금 순증 감지
2) 금고 적립 및 VaultLedger 기록
3) V2User 잔액 동기화
4) 출금 조건 업데이트

## 15. 운영 체크리스트
- 금고 잔액 SoT가 locked 단일 기준인지 확인
- benefits_suspended 차단이 서비스 레이어에서 수행되는지 확인
- 상점 구매 시 vault_spent_today 누적 여부 확인
- 출금 조건 UI 문구가 BE와 일치하는지 확인
- VaultLedger 기록 누락 경로가 없는지 확인

## 16. 위험 포인트
- Admin 집계/정렬에서 locked+available 합산 금지
- API 응답 필드 snake/camel 혼재 금지
- 레거시 라우트 혼재 시 정책 표현 고정 필요
- 제재 정책이 UI만으로 처리되지 않도록 주의

## 17. 참고 문서
- v2_sot_vault_ko.md
- v2_strict_vault_policy_sot_ko.md
- v2_vault_glossary_sot_ko.md
- v2_cc_deposit_sot_ko.md
- 20260204_vault_ledger_bypass_critical_fix.md

## 18. 정책-코드-운영 매핑 요약
| 정책 항목 | 대표 로직 | 운영 포인트 | 비고 |
| --- | --- | --- | --- |
| 잔액 SoT | vault_locked_balance 사용 | Admin 집계 locked 단일 기준 | 합산 금지 |
| 출금 조건 | 최근 3일 플레이, 오늘 사용 | 모달 표기 일치 | 표기 일관성 |
| 혜택 중단 | benefits_suspended 차단 | 403 차단 확인 | 서비스 레이어 강제 |
| 소비 누적 | vault_spent_today 누적 | 09:00 리셋 | 상점 구매 경로 |
| 원장 기록 | VaultLedger 기록 | 누락 경로 탐지 | 직접 수정 금지 |

## 19. 운영 시나리오
### 19.1 상점 구매 시나리오
- 조건: benefits_suspended False
- 기대: 금고 차감, vault_spent_today 증가, VaultLedger 기록

### 19.2 출금 신청 시나리오
- 조건: 최근 3일 플레이 충족, 오늘 사용 충족, 당일 입금 충족
- 기대: 출금 요청 생성, status=PENDING

### 19.3 제재 유저 접근 시나리오
- 조건: benefits_suspended True
- 기대: 상점/게임 403 차단

## 20. 운영 FAQ
### 20.1 금고 잔액이 화면과 다르게 보임
- 원인: locked+available 합산 또는 캐시 지연
- 조치: locked 단일 기준으로 비교

### 20.2 출금 조건이 갑자기 낮아짐
- 원인: 운영일 리셋 시점 오해
- 조치: 09:00 KST 기준 확인

### 20.3 상점 구매 후 잔액이 갱신되지 않음
- 원인: 캐시 무효화 키 불일치
- 조치: v2-vault-status 키 무효화 확인

## 21. 체크리스트 상세
- 서비스 레이어 차단이 적용되었는지 확인
- VaultLedger 기록 누락이 없는지 확인
- 출금 조건 모달 표기가 정책과 일치하는지 확인
- 운영일 리셋이 09:00 KST인지 확인
- CC 입금 순증 로직이 감소 케이스를 무시하는지 확인

## 22. 변경 이력
- v1.1 (2026-02-07, GitHub Copilot): 정책 확장 및 구성 강화
- v1.0 (2026-02-07, GitHub Copilot): 분산 SoT 정책 통합
