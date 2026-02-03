문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: VAULT
상태: 진행 중 ⏳

# W06 VAULT 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) VAULT 리포트](./archive/weekly/W05_VAULT_troubleshooting.md)
- [V2 Strict Vault Policy SoT](../01_core/v2_strict_vault_policy_sot_ko.md)

---

## 🔍 주간 이슈 내역

### 02-03 - VAULT/출금조건: "오늘 사용 금액" 충족 후 출금조건 갱신 안됨 (JM9567)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 출금조건 모달 갱신 (오늘 사용 금액/플레이 횟수/오늘 입금) |
| HTTP Status | 200 (조건 미충족 표시) |
| 영향 범위 | 특정 유저 (telegram_username=jm9567, user_id=1) |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
- 운영 서버 확인 결과, 해당 유저의 조건은 **"오늘 입금(Deposit Today)" 미충족**으로 판단됨.
	- `daily_vault_spent=10000`, `daily_vault_spent_target=5000`
	- `daily_play_count=66`, `daily_play_target=15`
	- `daily_deposit_confirmed=False`
	- `deposit_delta_today=0`
- 금일(운영일 KST 09:00 기준) **SHOP 소비 원장(`VaultLedger.ref_type=SHOP`)이 0건**임.
	- 따라서 “오늘 사용 금액”은 **상점 소비 기준**으로 계산되며, 게임/기타 사용은 반영되지 않음.

**근거 로그/쿼리**
- 운영 서버: `docker exec xmas-backend python` 조회
	- `V2VaultService.get_vault_info()` 출력에서 `daily_deposit_confirmed=False` 확인
	- `ExternalRankingDailyDepositDelta`의 `kst_date=2026-02-03` 델타 0 확인
	- `VaultLedger(ref_type=SHOP)` 금일 기록 0건 확인

**결론**
- 출금조건 미갱신 원인은 **“오늘 입금(Deposit Today)” 조건 미충족**으로 확정.
- “오늘 사용 금액”은 **상점 소비만 반영**되며, 게임 플레이 비용은 조건 충족으로 카운트되지 않음.

**조치/안내**
1) 오늘 입금(운영일 기준) 기록이 필요
2) 상점(VAULT 결제) 소비가 있어야 오늘 사용 금액이 반영됨

**검증 방법**
- `GET /api/v2/vault/status`에서 `daily_deposit_confirmed=True` 확인
- `VaultLedger(ref_type=SHOP)` 금일 기록 생성 확인
- 출금조건 모달에서 “오늘 사용 금액/플레이 조건” 정상 갱신 확인

### 02-02 - VAULT/정책 확인: 지연 입금 선반영 XP/레벨 보상 여부

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 지연 입금 선반영(증거 제출 시 즉시 지급) |
| HTTP Status | 200 (정책 확인) |
| 영향 범위 | 유저 보상/레벨 시스템 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `V2LatencySurvivalService.submit_evidence()`는 선반영 보상을 **고정 상수**로 지급하며, XP/레벨 서비스 호출이 없음.
	- 상수: `PROVISIONAL_REWARD_TYPE = "ROULETTE_TICKET"`, `PROVISIONAL_REWARD_AMOUNT = 3`
	- 지급 경로: `V2InventoryService.grant_wallet_tokens()` 또는 `V2InventoryService.grant_item()`
	- 관련 코드: [app/v2/services/latency_survival_service.py](../../app/v2/services/latency_survival_service.py)

**결론**
- 입금지연 신청 시 **레벨 XP는 증가하지 않음**.
- 레벨에 따른 보상도 **지급되지 않음**.
- 보상은 임의 생성이 아니라 **상수로 정의된 고정 지급**(현행: 룰렛 티켓 3장)임.

**검증 방법**
- `submit_evidence()` 호출 시 XP/레벨 관련 서비스 호출이 없는지 코드 확인.
- `V2InventoryService` 지급 로그(지갑/인벤토리 원장)만 생성되는지 확인.

### 02-02 - VAULT/ADMIN: 지연 입금 증거 승인 500

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 지연 입금 증거 승인/반려 |
| HTTP Status | 500 (Server Error) |
| 영향 범위 | 어드민 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 어드민 서비스에서 잘못된 클래스명(`LatencySurvivalService`) 사용 및 시그니처 불일치로 예외 발생.
- 관련 코드: [app/v2/services/admin_economy_service.py](../../app/v2/services/admin_economy_service.py)

**해결 방법**
- `V2LatencySurvivalService`로 교체.
- `verify_evidence`/`reject_evidence` 호출 시 `admin_id` 및 매개변수 순서를 SoT와 일치.

**검증 방법**
- 어드민에서 승인/반려 버튼 클릭 시 200 응답 확인.
- 관련 테스트 재실행: tests/v2/test_latency_survival.py

### 02-02 - VAULT/FRONTEND: 지연 입금 즉시신청 UI 미노출

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 지연 입금 즉시신청 진입 |
| HTTP Status | 200 (UI Visibility Error) |
| 영향 범위 | 유저 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 금고 페이지에 텍스트 링크만 존재하여 UX 가시성이 낮아 기능 미노출로 인식됨.
- 관련 코드: [src/v2/pages/vault/VaultPage.tsx](../../src/v2/pages/vault/VaultPage.tsx)

**해결 방법**
- 금고 CTA에 “입금 지연 신고” 버튼 추가 및 모달 트리거 연결.
- 관련 코드: [src/v2/components/vault/VaultCTA.tsx](../../src/v2/components/vault/VaultCTA.tsx)

**검증 방법**
- 금고 화면 하단 CTA에 버튼 노출 확인.
- 클릭 시 지연 입금 신고 모달 표시 확인.

---

## 📝 관리 가이드
- 금고 잔액, 출금, 포인트 지급 이슈 집중 모니터링
