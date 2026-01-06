# 통합 경제 및 진행 시스템 설계 v3.0 (Unified Economy & Progression Master v3.0)

> **최종 업데이트**: 2026-01-06  
> **상태**: 경제/진행 시스템 리팩토링 확정 기준서

---

## 0. 용어/SoT 재정의 (확정·세분)

이 기준서는 시스템 전반의 통화와 보상 체계를 정의하는 **최종 권위**입니다.

| 자산 | SoT | 세부 원칙 |
| :--- | :--- | :--- |
| **금고 자산 (Vault)** | `user.vault_locked_balance` (+ `vault_earn_event` 로그) | 모든 포인트/현금성 지급 **단일 SoT**. 만료/락 없음. 환전 승인만 필요. |
| **게임 XP (신설)** | `user_level_progress.current_xp`, 로그=`user_xp_event_log` | 보상 타입 `GAME_XP`만이 XP를 증가시킴. **"POINT"와 절대 혼동 금지**. |
| **티켓** | `user_game_wallet` | `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`, `GOLD_KEY`, `DIAMOND_KEY` |
| **다이아몬드** | `user_inventory_item` (`item_type="DIAMOND"`) | 상점→티켓 구매용. 다른 재화로 변환 금지. |
| **배민 기프티콘** | `user_inventory_item` (`BAEMIN_GIFTICON_{5000/10000/20000}`) | 지급대기/보상함 |
| **씨씨코인 기프티콘** | `user_inventory_item` (`CC_COIN_GIFTICON`) | 지급대기/보상함 |
| **외부 환전 가능액** | 금고 잔액 중 1만 이상 | 최소 환전 가능액 = 10,000원. 소액은 누적만 허용. |

---

## 1. 리워드 타입 맵 (최종)

| 보상 타입 | 처리 경로 | 비고 |
| :--- | :--- | :--- |
| `POINT`, `CC_POINT` | **금고 적립** (`vault_locked_balance`) | `cash_balance` 경로 폐기 |
| `GAME_XP` | **시즌 XP** (`SeasonPassService`) | 신설 타입 |
| `CC_COIN_GIFTICON`, `GIFTICON_BAEMIN_*` | **인벤토리 지급대기** | 보상함 노출 |
| `DIAMOND` | **인벤토리 다이아 증가** | |
| 티켓/키 (`ROULETTE_COIN`, `DICE_TOKEN`, etc.) | **게임 월렛 증가** | |
| `NONE` / `0` | 무시 | |

---

## 2. 영역별 적용/수정 스코프 (전수)

### 2.1 서비스 레이어

| 서비스 | 수정 사항 |
| :--- | :--- |
| **RewardService** | `POINT`/`CC_POINT` → `_grant_vault_locked`; `GAME_XP` 신설 분기; `grant_point(cash_balance)` 제거; `xp_from_game_reward` 플래그 제거/무시 |
| **VaultService** | 만료/락 로직 호출 경로 제거(즉시 적립만). `earn_event_id` 멱등 유지. |
| **SeasonPassService** | XP는 `GAME_XP`만 처리 (legacy XP 타입도 `GAME_XP`로 매핑) |

### 2.2 게임 로직

- **Roulette/Dice/Lottery**:
  - 기본/어드민 설정 `reward_type`이 `POINT`이면 **최종 금고 적립 확인**
  - Gold/Diamond 룰렛의 고액 포인트도 **금고 직행**
  - Trial/Key 변환 등 `reward_type` 강제 변경 경로가 금고로 귀결되는지 검증
- **게임 기본 적립(+200/-50) vs 보상 POINT 중복 여부**: 하나의 Vault 적립 루틴에서 누적 처리(이중 적립/누락 방지)

### 2.3 어드민/프론트

| 항목 | 변경 내용 |
| :--- | :--- |
| **REWARD_TYPES** | "금고 적립(POINT)", "게임 XP(GAME_XP)", "씨씨코인 기프티콘(CC_COIN_GIFTICON)" 명시. **Cash Point 제거/비활성** |
| **편집 화면** | Roulette/Lottery/Dice/SeasonPass/Mission 보상 타입 옵션/라벨 교정, 기본값 재시딩 |
| **UX 라벨** | 금고 적립 → "금고 +금액", XP → "XP +수치"로 UI 분리. 기프티콘 → "지급대기" 배지 |

### 2.4 미션/이벤트/골든아워/스트릭

- **보상 타입 전수 교정**: 포인트성 → 금고, XP → `GAME_XP`, 다이아/티켓 → 그대로
- **스트릭/골든아워 배율**: **금고 적립 금액에만 적용**, XP에는 미적용

### 2.5 외부/수동 지급/시드

- **외부 랭킹/관리자 수동 지급**: `reward_type`이 `POINT`/`CC_POINT`면 금고 적립, XP 지급 시 `GAME_XP` 사용
- **시드 스크립트(seed_*.py)**: 기본 프라이즈/세그먼트의 `reward_type` 교정 (`POINT` → 금고, XP → `GAME_XP`)

---

## 3. 데이터 모델/시그널 정리

| 도메인 | SoT | 로그 테이블 | 비고 |
| :--- | :--- | :--- | :--- |
| **XP** | `user_level_progress` | `user_xp_event_log` | 모든 XP 변화는 여기 기록 |
| **금고** | `user.vault_locked_balance` | `vault_earn_event` | 게임/미션/이벤트/수동 지급 모두 멱등키 필요 |
| **인벤토리** | `user_inventory_item` | `user_inventory_ledger` | 기프티콘/다이아/바우처 등 대기형 보상 |

---

## 4. 감사/로그/메트릭

### 멱등키
- 모든 금고 적립은 `earn_event_id` **필수** (중복 적립 차단)

### 분리된 로그 채널
| 채널 | 대상 |
| :--- | :--- |
| `vault.earn.{source}` | 게임/미션/수동/외부 |
| `xp.event.{source}` | GAME_XP 지급 |
| `inventory.grant.gifticon` | 기프티콘 지급대기 |

### 메트릭
- 금고 적립액/건수
- GAME_XP 적립량
- 기프티콘 지급대기 수
- 타겟별 에러율

---

## 5. 테스트 매트릭스

### Unit
- [ ] `RewardService` POINT/GAME_XP/CC_COIN_GIFTICON 분기 → 각각 금고/XP/인벤토리로만 가는지
- [ ] Roulette/Dice/Lottery POINT → vault 적립 + 멱등

### Integration
- [ ] 골든아워/스트릭 배율 적용 시 **금고 금액만 2배**, XP는 영향 없음
- [ ] 키 룰렛에서 POINT 강제 변환이 금고 적립되는지

### E2E
- [ ] 어드민에서 `reward_type=GAME_XP` 저장 → 플레이/미션 클레임 후 XP 증가 확인, 금고 변화 없음
- [ ] `reward_type=POINT` 저장 → 금고 증가, XP/캐시 미변화 확인
- [ ] 기프티콘 보상 설정 → 인벤토리 "지급대기" 노출

---

## 6. 롤아웃/마이그레이션 제안

### 6.1 코드 변경
- `RewardService` 리팩토링, enum/상수 추가, 만료 로직 비활성, Admin `REWARD_TYPES` 업데이트

### 6.2 시드/설정 교정
- 기본 세그먼트/프라이즈/시즌 보상/미션 보상 `reward_type` 교정 배치

### 6.3 데이터 백필 (선택)
- 과거 `cash_balance` 포인트를 금고로 합산할지 여부 결정 후 스크립트 준비

### 6.4 배포 후 검증
- **메트릭 모니터링**: 금고 적립/XP 적립/기프티콘 지급대기 건수
- **어드민 UI 저장/조회 스모크**

---

## 7. 확인 및 확정 사항 (Confirmed)

| # | 항목 | 상태 |
| :--- | :--- | :--- |
| 1 | `POINT` 단일화 → 현금성 보상은 `cash_balance` 버리고 전부 금고로 통합 | ✅ 확정 |
| 2 | `GAME_XP` 신설 → 경험치 전용 타입을 분리하여 '포인트'와의 용어 혼선 종결 | ✅ 확정 |
| 3 | GIFTICON 노출 → 씨씨코인 기프티콘 포함 실물 보상 계열을 어드민에 명시적 노출 | ✅ 확정 |
| 4 | 금고 만료/락 폐기 → 즉시 적립제로 운영, 환전 승인만 필요 | ✅ 확정 |
| 5 | 외부 환전 → 금고 잔액 1만 이상만 환전 가능, 소액은 누적만 | ✅ 확정 |

---

## 8. cash_balance → 금고 이관 절차 (옵션)

### 8.1 사전 준비
| 단계 | 내용 |
| :--- | :--- |
| **DB 스냅샷** | 전체 덤프(마이그레이션 전) 생성 → 관리자 확인/승인 필수 |
| **대상 추출** | `user.id`, `cash_balance`, `vault_locked_balance` + 최근 변경일 → 보고서 제공 |

### 8.2 검토 포인트
- **음수/0/소액(1만 미만) 처리 정책**: 소액도 **전부 이관** (합산 후 누적, 환전은 1만 이상 시에만)
- **동일 유저 기존 금고 잔액과 합산**: 만료/락 없음 (즉시 적립)

### 8.3 이관 스크립트 설계
```python
# 트랜잭션 단위
vault_locked_balance += cash_balance
cash_balance = 0
# ledger 기록
reason = "CASH_TO_VAULT_MIGRATION"
# 멱등키
idempotency_key = f"MIGRATION:{user_id}:{timestamp}"
```

### 8.4 실행 순서
1. **시뮬레이션**: 스테이징/로컬에 최신 덤프 복원 후 dry-run → 합산 총액/이상치 확인
2. **승인 후 실행**: 운영 DB에 동일 스크립트 실행
3. **포스트체크**: 합산 총액 = 사전 보고서와 일치 여부 검증

---

## 9. XP_FROM_GAME_REWARD 플래그 폐기

| 항목 | 변경 내용 |
| :--- | :--- |
| **완전 삭제** | 코드/설정 모두 제거. 게임 보상 XP는 `reward_type=GAME_XP`만 허용 |
| **기존 POINT→XP 전환 로직** | 삭제. `POINT`는 **금고 적립으로 통일** |
| **영향 범위** | RewardService, VaultService, SeasonPassService 내 해당 플래그 참조 코드 |

---

## 10. 기프티콘 브랜드/금액 동적 대응 (어드민)

### 10.1 기본 정책
- **재고**: 빈칸 = **무제한** 유지
- **금액 옵션**: 고정 리스트 대신 **자유 금액 입력** 방식

### 10.2 item_type 네이밍 표준
```
{BRAND}_GIFTICON_{금액}
```
| 예시 | 설명 |
| :--- | :--- |
| `CC_COIN_GIFTICON_5000` | 씨씨코인 5,000원권 |
| `CC_COIN_GIFTICON_10000` | 씨씨코인 10,000원권 |
| `BAEMIN_GIFTICON_5000` | 배민 5,000원권 |
| `BAEMIN_GIFTICON_10000` | 배민 10,000원권 |
| `BAEMIN_GIFTICON_20000` | 배민 20,000원권 |
| `STARBUCKS_GIFTICON_5000` | 스타벅스 5,000원권 (확장 예시) |

### 10.3 브랜드 프리셋 + 커스텀 혼합 구조

#### 기본 프리셋 브랜드 (드롭다운)
| 브랜드 코드 | 라벨 | 아이콘 |
| :--- | :--- | :--- |
| `CC_COIN` | 씨씨코인 | 🪙 |
| `BAEMIN` | 배달의민족 | 🛵 |
| `STARBUCKS` | 스타벅스 | ☕ |
| `CU` | CU편의점 | 🏪 |
| `GS25` | GS25 | 🏪 |
| `CUSTOM` | 직접입력 | 🎁 |

#### 어드민 UI 입력 구조
```
┌─────────────────────────────────────────┐
│ 기프티콘 보상 설정                        │
├─────────────────────────────────────────┤
│ 브랜드:  [CC_COIN     ▼]                │
│         ☑ 직접입력 시: [____________]   │
│ 금액:   [10000      ] 원                │
│ 재고:   [          ] (빈칸=무제한)       │
└─────────────────────────────────────────┘
→ 저장 시 item_type = "CC_COIN_GIFTICON_10000"
```

### 10.4 프론트 지급대기 표시
- **라벨**: 브랜드 맵핑 테이블에서 조회 (없으면 `기프티콘` 기본 라벨)
- **아이콘**: 브랜드별 아이콘 맵핑 (없으면 🎁 기본 아이콘)
- **배지**: "지급대기" 공통 배지

---

## 11. 어드민 수정 대상 파일 전수 목록

### 11.1 상수/공통
| 파일 | 수정 내용 |
| :--- | :--- |
| `src/admin/constants/rewardTypes.ts` | 드롭다운 옵션/라벨/순서 정의. `GAME_XP` 추가, `POINT` 라벨 → "금고 적립(POINT)", `CC_COIN_GIFTICON` 추가 |

### 11.2 설정 페이지 (보상 타입 선택 UI)
| 파일 | 수정 내용 |
| :--- | :--- |
| `src/admin/pages/RouletteConfigPage.tsx` | reward_type 드롭다운 옵션/라벨 교정 |
| `src/admin/pages/LotteryConfigPage.tsx` | reward_type 드롭다운 옵션/라벨 교정 |
| `src/admin/pages/DiceConfigPage.tsx` | reward_type 드롭다운 옵션/라벨 교정 |
| `src/admin/pages/SeasonListPage.tsx` | 시즌 레벨 보상 타입/값, `GAME_XP` 옵션 추가 |
| `src/admin/pages/AdminMissionPage.tsx` | 미션 보상 타입/값 교정 |
| `src/admin/pages/SurveyAdminPage.tsx` | 설문 보상 템플릿 reward_type |
| `src/admin/pages/AdminGameTokensPage.tsx` | 게임 로그 테이블 타입 표시/라벨 |

### 11.3 API 타입/클라이언트
| 파일 | 수정 내용 |
| :--- | :--- |
| `src/admin/api/adminRouletteApi.ts` | reward_type 필드 직렬화 |
| `src/admin/api/adminLotteryApi.ts` | reward_type 필드 직렬화 |
| `src/admin/api/adminDiceApi.ts` | reward_type 필드 직렬화 |
| `src/admin/api/adminSeasonApi.ts` | reward_type 필드 직렬화 |
| `src/admin/api/adminMissionApi.ts` | reward_type 필드 직렬화 |
| `src/admin/api/adminGameTokenApi.ts` | 로그 조회 구조체 |

### 11.4 백엔드 스키마 (프론트 → BE 전달)
| 파일 | 수정 내용 |
| :--- | :--- |
| `app/schemas/admin_roulette.py` | reward_type 필드 |
| `app/schemas/admin_lottery.py` | reward_type 필드 |
| `app/schemas/admin_dice.py` | reward_type 필드 |
| `app/schemas/admin_season.py` | 레벨 보상 reward_type |
| `app/schemas/admin_mission.py` | 미션 보상 |
| `app/schemas/game_tokens.py` | 게임 로그 응답용 reward_type |

### 11.5 기타 (라벨 혼선 방지)
| 파일 | 수정 내용 |
| :--- | :--- |
| `src/data/fallbackData.ts` | 프론트 모의 데이터 reward_type/라벨 |
| `src/pages/LotteryPage.tsx` | 클라이언트 표시 (POINT→금고 등) |
| `src/components/lottery/LotteryCard.tsx` | 보상 라벨 표시 |

### 11.6 유저(클라이언트) 수정 대상 파일 전수 목록

#### 게임 (룰렛/주사위/복권)
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/api/rouletteApi.ts` | reward_type 필드 |
| `src/api/diceApi.ts` | reward_type 필드 |
| `src/api/lotteryApi.ts` | reward_type 필드 |
| `src/pages/RoulettePage.tsx` | 보상 표시 (POINT→금고, GAME_XP→XP) |
| `src/pages/DicePage.tsx` | 보상 표시 |
| `src/pages/LotteryPage.tsx` | 보상 표시 |
| `src/components/lottery/LotteryCard.tsx` | 보상 라벨 |
| `src/data/fallbackData.ts` | 세그먼트/프라이즈 reward_type 라벨 |

#### 금고/Vault
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/api/vaultApi.ts` | 금고 API 타입 |
| `src/pages/VaultPage.tsx` | 금고 잔액 표시 |
| `src/components/vault/VaultMainPanel.tsx` | 금고 메인 패널 |
| `src/components/vault/VaultAccrualModal.tsx` | 적립 모달 |
| `src/components/TicketZeroPanel.tsx` | 티켓 제로 패널 |
| `src/admin/pages/UiConfigTicketZeroPage.tsx` | 운영 카피 참조 |

#### 미션/스트릭/데일리
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/api/missionApi.ts` | 미션 API (있는 경우) |
| `src/stores/missionStore.ts` | 미션 스토어 |
| `src/pages/MissionPage.tsx` | 미션 페이지 |
| `src/components/mission/MissionCard.tsx` | 미션 카드 (웰컴/데일리 선물 안내) |
| `src/components/GoldenHourPopup.tsx` | 골든아워 팝업 (배율 표기 포인트/XP 혼선 여부) |
| `src/components/GoldenHourTimer.tsx` | 골든아워 타이머 |

#### 인벤토리/기프티콘/다이아
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/pages/InventoryPage.tsx` | CC_COIN_GIFTICON, BAEMIN_GIFTICON 라벨/아이콘 |
| `src/pages/ShopPage.tsx` | 다이아/티켓 변환 표기 |

#### 시즌 패스/레벨
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/api/seasonPassApi.ts` | 시즌패스 API |
| `src/pages/SeasonPassPage.tsx` | 시즌패스 페이지 |
| `src/components/SeasonProgressWidget.tsx` | 레벨 보상 표시 (XP/POINT 구분) |

#### 설문/기타 보상
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/pages/SurveyListPage.tsx` | 설문 보상 배너/토스트 |
| `src/pages/SurveyRunnerPage.tsx` | 설문 보상 렌더링 |

#### 공용 타입/컴포넌트
| 파일 | 확인 내용 |
| :--- | :--- |
| `src/types.ts` 또는 `src/types/*.ts` | reward_type 필드 라벨링 |
| `src/components/common/*` | 로그/히스토리 뷰어 reward_type 출력 |
| `src/components/rewards/*` | 보상 라벨/아이콘 표기 (있는 경우) |

#### 주요 확인/수정 포인트
1. **reward_type 조건부 렌더**: `POINT` → "금고 적립", `GAME_XP` → "XP"로 분리 표기
2. **토스트/카피**: "포인트 = 금고" 명시, XP는 별도
3. **기프티콘/다이아/티켓**: 라벨 및 아이콘 노출
4. **골든아워/스트릭 배율**: 금고 금액에만 적용됨을 UI에서 혼동 없게 표기

---

## 12. 전체 리팩토링 후 검증 체크리스트

### 12.1 서비스 레이어
- [ ] `RewardService`: POINT/CC_POINT → 금고, GAME_XP → XP, gifticon → 인벤토리
- [ ] `RewardService`: `cash_balance` 경로 완전 삭제
- [ ] `VaultService`: 만료/락 로직 제거, 즉시 적립만

### 12.2 어드민 REWARD_TYPES
- [ ] 라벨 수정: POINT → "금고 적립(POINT)"
- [ ] `GAME_XP` 타입 추가
- [ ] `CC_COIN_GIFTICON` 입력 가능 (무제한)
- [ ] 브랜드/금액 자유 입력 플로우

### 12.3 게임/미션/이벤트/시즌패스
- [ ] reward_type 전수 확인: POINT = 금고
- [ ] reward_type 전수 확인: XP = GAME_XP
- [ ] 기본 프라이즈/세그먼트 교정

### 12.4 로그/메트릭
- [ ] 금고 적립 건수 분리 로그
- [ ] XP 적립 건수 분리 로그
- [ ] 기프티콘 지급대기 건수 분리 로그

### 12.5 유저 클라이언트 UI
- [ ] 게임 페이지 보상 라벨 (POINT→금고, GAME_XP→XP)
- [ ] 금고/Vault 페이지 표시
- [ ] 미션/스트릭 보상 표시
- [ ] 골든아워 배율 표기 (금고에만 적용 명시)
- [ ] 인벤토리 기프티콘/다이아 라벨
- [ ] 시즌패스 레벨 보상 XP/POINT 구분
- [ ] 설문 보상 렌더링

---

## 13. 플랜 상태

| 단계 | 상태 | 비고 |
| :--- | :--- | :--- |
| 0. 용어/SoT 재정의 | ✅ 완료 | v3.0 확정 |
| 1. 리워드 타입 맵 | ✅ 완료 | |
| 2. 영역별 스코프 정의 | ✅ 완료 | 서비스/게임/어드민/미션/외부 |
| 3. 데이터 모델 정리 | ✅ 완료 | XP SoT, 금고 SoT, 인벤토리 |
| 4. 감사/로그/메트릭 | ✅ 완료 | 멱등키, 채널 분리 |
| 5. 테스트 매트릭스 | ✅ 완료 | Unit/Integration/E2E |
| 6. 롤아웃 제안 | ✅ 완료 | 코드→시드→백필→검증 |
| 7. 확정 사항 | ✅ 완료 | 5개 항목 확정 |
| 8. cash_balance 이관 절차 | ✅ 완료 | 옵션, 소액 전부 이관 |
| 9. XP_FROM_GAME_REWARD 폐기 | ✅ 완료 | |
| 10. 기프티콘 동적 대응 | ✅ 완료 | 브랜드 프리셋+커스텀 |
| 11. 어드민+클라이언트 파일 목록 | ✅ 완료 | 전수 목록 |
| 12. 검증 체크리스트 | ✅ 완료 | |

> **플랜 완료**: 2026-01-06  
> 다음 단계: 실제 코드 수정 및 검증 진행

---

**문서 버전**: v3.1  
**작성일**: 2026-01-06
