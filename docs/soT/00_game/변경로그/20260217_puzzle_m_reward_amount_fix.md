문서 타입: 변경로그
버전: v1.0
작성일: 2026-02-17
작성자: GitHub Copilot
대상: V2 운영/개발
상태: SoT

# CCJM 퍼즐 조각 인벤토리/모달 미표시 버그 수정

## 1. 증상 (Symptom)
| 항목 | 내용 |
|---|---|
| **대상 기능** | 인벤토리 페이지 + 복권 플레이 결과 알림 |
| **HTTP Status** | 200 (FE Logic Error — 표시 누락) |
| **영향 범위** | 전체 유저 (퍼즐 조각 보유자) |
| **재현 빈도** | 항상 |

## 2. 근본 원인 (RCA)

### 버그 1: 인벤토리 페이지에서 퍼즐 조각 미표시
- **원인**: `InventoryPage.tsx`에서 API 응답의 `items`만 렌더링하고, 퍼즐 조각이 저장된 `wallet` 데이터를 **완전히 무시**
- **구조**: 퍼즐 조각은 `user_game_wallet` 테이블에 토큰 잔액으로 저장됨 → `/api/v2/inventory` 응답의 `wallet` 필드에 포함
- FE는 `items` (인벤토리 아이템 테이블)만 순회 → 퍼즐 조각이 보이지 않음

### 버그 2: 복권 상금 당첨 시 퍼즐 획득 피드백 누락
- **원인**: `v2_lottery_game_service.py`의 `play()` 메서드에서 `collection_piece`를 사이드 드랍(`V2_LOTTERY_PUZZLE_DROP`) 시에만 설정
- 복권 상금으로 PUZZLE_C1 등을 당첨받아도 `collection_piece = None` → FE에서 퍼즐 획득 피드백 없음
- 사이드 드랍 exception 핸들러에서 `collection_piece = None`으로 초기화 → 상금 퍼즐 정보도 함께 소실

### 증거: 운영 DB 분석
```
전체 유저 퍼즐 보유 현황: C1/C2 조각만 편중 (J, M 극소수)
→ 당첨은 되나 결과 피드백이 없어 유저가 인지하지 못함
→ 인벤토리에도 안 보여서 "적용이 안됐다"고 인식
```

## 3. 수정 내용

### 3.1 인벤토리 퍼즐 표시 — `InventoryPage.tsx`
- `wallet` 데이터에서 `PUZZLE_*` 토큰을 필터링하여 `items` 목록에 합산 표시
- 퍼즐 이미지 매핑 추가 (`puzzle_c.png`, `puzzle_j.png`, `puzzle_m.png`)

### 3.2 복권 퍼즐 피드백 — `v2_lottery_game_service.py`
- 상금이 퍼즐 타입일 때 `collection_piece` 값을 설정
- 사이드 드랍과 상금 퍼즐을 분리하여 exception에서 상금 정보 소실 방지

## 4. 수정 파일
| 파일 | 변경 내용 |
|---|---|
| `src/v2/pages/inventory/InventoryPage.tsx` | wallet → 퍼즐 합산 표시 + 이미지 매핑 |
| `app/v2/services/v2_lottery_game_service.py` | 퍼즐 상금 collection_piece 설정 + 사이드 드랍 분리 |

## 5. 배포
- `docker compose build --no-cache; docker compose up -d`
