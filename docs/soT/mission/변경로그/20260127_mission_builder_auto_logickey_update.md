# 2026-01-27 미션관리 자동 logicKey 생성 업데이트

## 관리자가 원했던 것 (핵심)
**"같은 프리셋(예: 게임플레이)으로 목표만 다른 미션 여러 개 만들고 싶다"**
- 예: "일일 게임 1회 → 보상 A", "일일 게임 5회 → 보상 B"
- 기존 문제: logicKey 중복 에러가 나서 안 됨

## 해결책: 자동 logicKey 생성
이제 **프리셋 + 카테고리 + 목표값**을 조합해서 고유한 logicKey를 자동 생성합니다.

### 예시
| 프리셋 | 카테고리 | 목표 | 자동 생성 logicKey | 자동 생성 제목 |
|--------|----------|------|-------------------|---------------|
| 일일 게임 플레이 | DAILY | 1 | `DAILY_DAILY_PLAY_GENERIC_1` | "일일 게임 플레이 1회" |
| 일일 게임 플레이 | DAILY | 5 | `DAILY_DAILY_PLAY_GENERIC_5` | "일일 게임 플레이 5회" |
| 일일 게임 플레이 | WEEKLY | 10 | `WEEKLY_DAILY_PLAY_GENERIC_10` | "주간 게임 플레이 10회" |
| 골든 아워 | SPECIAL | 3 | `SPECIAL_GOLDEN_HOUR_3` | "스페셜 골든아워 게임 3회" |

## UI 변경사항

### 새 미션 생성 흐름 (4단계)
```
1. 프리셋 선택  → actionType 자동 설정
2. 카테고리 선택 → logicKey + 제목 자동 업데이트
3. 제목 확인    → 자동 생성됨 (필요시 수정 가능)
4. 목표 횟수    → logicKey + 제목 자동 업데이트
```

### 중복 검사 (2단계)
1. **logicKey 중복**: 완전히 동일한 키가 있으면 에러
2. **논리적 중복**: 같은 카테고리 + 같은 actionType + 같은 목표값이면 경고
   - "동일한 조건의 미션이 이미 존재합니다: [미션제목]"

## 가능/불가능 조합

### ✅ 가능한 조합
| 시나리오 | 가능 이유 |
|----------|-----------|
| DAILY + 게임플레이 1회 + DAILY + 게임플레이 5회 | 목표값이 달라서 logicKey가 다름 |
| DAILY + 게임플레이 1회 + WEEKLY + 게임플레이 1회 | 카테고리가 달라서 logicKey가 다름 |
| 골든아워 × 게임플레이 | logicKey에 "golden_hour" 포함 + actionType=PLAY_GAME으로 설정 |

### ❌ 불가능한 조합
| 시나리오 | 불가 이유 |
|----------|-----------|
| DAILY + 게임플레이 5회 2개 | 완전히 동일한 logicKey (논리적 중복) |

## 골든아워 × 게임플레이 가능 여부
**✅ 가능합니다.**

- 프리셋에서 "골든 아워 (Golden Hour)" 선택
- actionType이 자동으로 "PLAY_GAME"으로 설정됨
- logicKey에 "golden_hour"가 포함되어 골든아워 판정이 작동함

## 운영 체크리스트
- [x] 프리셋 선택 시 actionType 자동 설정
- [x] 목표값 변경 시 logicKey + 제목 자동 업데이트
- [x] 중복 에러 시 어떤 미션과 충돌인지 표시
- [x] 논리적 중복(같은 조건) 사전 경고
- [x] 빌드 통과 확인

## 기술 요약
- `generateLogicKey(preset, category, targetValue)` → 고유 키 자동 생성
- `generateTitle(preset, category, targetValue)` → 한글 제목 자동 생성
- `findLogicalDuplicate()` → 같은 카테고리+액션+목표 중복 검사

## 관련 파일
- src/v2/admin/pages/game/MissionManagerPage.tsx
