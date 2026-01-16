# 도파민 2차: 복권 컬렉션 & 합성 전략 (Dopamine Phase 2: Lottery Collection)

**문서 정보**
- **작성일**: 2026-01-16
- **상태**: Draft (승인 대기)
- **목표**: 복권 "꽝" 경험 개선 및 수집/합성(Synthesis)을 통한 체류시간 증대
- **관련 스키마**: `LotteryConfig`, `GameTokenType`, `ExchangeService`
- **준수 표준**:
    - `2026_game_action_schema_ko.md`: API 응답 (`collection_piece` 필드 활용)
    - `2026_core_economy_glossary_ko.md`: 토큰 명명 규칙 (`PUZZLE_*`)

---

## 1. 개요 (Executive Summary)

### 1-1. 배경
- 현재 복권은 **최소 50P 이상 당첨되는 "No-Lose" 구조**로 운영 중이나, 낮은 금액(50P~200P) 당첨 시 유저가 느끼는 효능감이 낮음.
- 단순 반복적인 소액 당첨 경험을 개선하고, **"조각을 모아 확실한 큰 보상을 얻는다"**는 메타 목표(Meta Goal)를 부여하여 지속적인 플레이 동기를 제공해야 함.

### 1-2. 핵심 전략: "C.C.J.M" 컬렉션
- **수집**: 복권 긁기 시 확률적으로 **글자 조각(C, J, M)** 획득 (Option A: 별도 경품으로 배치).
- **합성**: **C + C + J + M**을 모으면 **`GOLD_KEY` (골드 룰렛 확정권)**로 교환.
- **기대 효과**: "50P 당첨"의 지루함을 "조각 획득 기회"로 전환하여 체류시간 및 티켓 소진율 증대.

---

## 2. 상세 기획 (Specifications)

### 2-1. 신규 재화 (New Tokens)
`app/models/game_wallet.py`의 `GameTokenType`에 추가.

| Token Type | 한글명 | 설명 | 비고 |
| :--- | :--- | :--- | :--- |
| `PUZZLE_C` | 퍼즐 C | 컬렉션 조각 | |
| `PUZZLE_J` | 퍼즐 J | 컬렉션 조각 | |
| `PUZZLE_M` | 퍼즐 M | 컬렉션 조각 | |

### 2-2. 획득 구조 (Acquisition)
- **방식**: `LotteryPrize` 테이블에 일반 경품처럼 등록 (Option A).
- **확률 예시**:
- **확률 예시**:
    - 50P (최저 당첨): 40% (기존 대비 축소)
    - **퍼즐 C**: 10%
    - **퍼즐 J**: 5%
    - **퍼즐 M**: 5%
    - 200P/500P 등: 40%
- **장점**: 어드민에서 `LotteryConfig` 수정만으로 확률 제어 가능.

### 2-3. 교환(합성) 레시피 (Recipe)
`ExchangeService` 내 하드코딩 또는 설정화.

| Input (재료) | Output (결과) | 연출 |
| :--- | :--- | :--- |
| `PUZZLE_C` (2개) + `PUZZLE_J` (1개) + `PUZZLE_M` (1개) | **`GOLD_KEY` 1개** (또는 포인트 5만) | **CCJM 완성!** (화려한 합성 이펙트) |

> **Note**: 황금복권 시스템 구현 비용 절감을 위해, 우선 **`GOLD_KEY` (골드 룰렛 확정권)** 제공으로 대체 제안. (황금복권은 별도보상 로직 개발 필요)

---

## 3. 구현 단계 (Implementation Steps)

### Phase 2-3: Backend & Ops (완료 - 2026.01.16)
1.  **Model Update**: `GameTokenType`에 `PUZZLE_C, J, M` 추가 (Core Economy Glossary 준수). (완료)
2.  **API Response**: `LotteryPlayResponse` 수정 (Game Action Schema 준수). (완료)
    - `reward_type`이 `PUZZLE_*`일 경우, `game_data.collection_piece` 필드에 해당 문자(C/J/M)를 매핑하여 반환.
3.  **Seed Update**: `scripts/seed_lottery_ccjm.py` 작성 및 실행. (완료)
    - 기존 복권 설정에 퍼즐 조각 경품 추가 (C:10, J:5, M:5 Weight).
    - 낮은 등급(50P) 당첨 확률을 소폭 감소시켜 밸런스 조정.
4.  **Exchange Logic**: `ExchangeService.craft` 메서드 분기 추가. (완료)
    - `target_token_type="GOLD_KEY_FROM_PUZZLE"` 요청 처리.
    - 재료 소모: C(2), J(1), M(1).

### 2-4. 검증 결과 (Verification Result)
- **스크립트**: `scripts/verify_lottery_collection.py`
- **결과**:
  ```bash
  [SUCCESS] Found Puzzle Piece at try 1!
    - Label: 퍼즐 조각 C
    - Reward Type: PUZZLE_C
    - Game Data: {'collection_piece': 'C'}
  ✅ Verification Passed
  ```

### Phase 2-4: Frontend (Lottery UI) - Modal Ver.
1.  **Collection Button**:
    - 위치: `LotteryPage` 상단 `Stats Bar` 영역.
    - UI: "🧩 내 컬렉션" 아이콘/버튼.
    - 동작: 클릭 시 `LotteryCollectionModal` 오픈.
    - 획득 강조: 미확인 퍼즐이 있으면 Red Dot(뱃지) 표시.

2.  **LotteryCollectionModal.tsx (신규)**:
    - **현황판**: C, C, J, M 슬롯 비주얼 (보유 시 활성, 미보유 시 비활성).
    - **합성 UI**:
        - 퍼즐 조각 모두 보유 시 **"황금열쇠 교환하기"** 버튼 활성화.
        - 교환 성공 시 모달 내부에서 축하 메시지 출력 후 자동 닫힘 or 갱신.
    - **기대 효과**: 메인 복권 화면(긁기)을 깔끔하게 유지하면서도 파고들기 요소 제공.

3.  **Prize Badge Update**:
    - 복권 결과 화면에서 퍼즐 조각 획득 시, 텍스트 대신 **알파벳 아이콘**을 크게 표시하여 수집 욕구 자극.

3.  **Prize Badge Update**:
    - 복권 결과 화면에서 퍼즐 조각 획득 시, 텍스트 대신 **알파벳 아이콘**을 크게 표시하여 수집 욕구 자극.

---

## 4. 일정 계획 (Timeline)
- **Today (Now)**: 문서 작성 및 Backend (`TokenType`, `Exchange`) 구현.
- **Next**: Frontend UI (`LotteryPage`) 구현 및 연동.
- **Verification**: 로컬 테스트 및 운영일지 업데이트.
