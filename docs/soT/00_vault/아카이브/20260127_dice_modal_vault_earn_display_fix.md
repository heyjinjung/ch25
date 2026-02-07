# V2 주사위 게임 모달 금고 적립/차감액 표시 수정

**작성일**: 2026-01-27
**상태**: ✅ 해결됨
**영향 범위**: V2 주사위 게임 결과 모달의 금고 적립/차감액 표시

---

## 1. 문제 요약

V2 주사위 게임에서 결과 모달에 **금고 적립/차감액이 표시되지 않는** 문제 발생.

### 증상
- 게임 결과 모달에서 항상 `0P` 또는 비정상적인 값 표시
- 백엔드에서 `vault_earn`이 0으로 반환될 때 `game_data.reward_amount`를 사용하지 않음
- 패배 시 차감액(음수)이 `Math.max(0, vaultEarn)`로 인해 0으로 표시됨

---

## 2. 근본 원인 분석

### 2.1 프론트엔드 데이터 흐름

```
DicePage.tsx
  ↓ playV2Dice API 호출
  ↓ result = { vault_earn, game_data: { reward_amount, ... } }
  ↓ setLastVaultEarn(result.vault_earn)  ← 문제점 1
  ↓
DiceResultModal.tsx
  ↓ vaultEarn prop 수신
  ↓ Math.max(0, vaultEarn).toLocaleString()  ← 문제점 2
```

### 2.2 문제점 1: vault_earn vs reward_amount

| 필드 | 의미 | 값이 0인 경우 |
|------|------|--------------|
| `vault_earn` | **실제로 금고에 적립된 금액** | eligibility 실패, vault_limit 도달, 정책 차단 |
| `game_data.reward_amount` | **게임 설정에 따른 보상 금액** | DiceConfig 미설정 |

**문제**: `vault_earn`이 정책에 의해 0일 때에도 사용자에게는 게임 결과 금액을 보여줘야 함.

### 2.3 문제점 2: 음수 값 처리

```tsx
// Before (버그)
Math.max(0, vaultEarn).toLocaleString()
// 패배 시 -200 → 0으로 표시됨
```

---

## 3. 해결 방안

### 3.1 DicePage.tsx 수정

**파일**: `src/v2/pages/game/DicePage.tsx`

**변경 전**:
```tsx
setLastVaultEarn(result.vault_earn);
```

**변경 후**:
```tsx
// vault_earn이 0이면 game.reward_amount를 사용 (금고 적립/차감 표시)
const displayEarn = result.vault_earn !== 0 ? result.vault_earn : (game.reward_amount ?? 0);
setLastVaultEarn(displayEarn);
```

### 3.2 DiceResultModal.tsx 수정

**파일**: `src/v2/components/game/DiceResultModal.tsx`

**변경 전**:
```tsx
<div className="text-3xl font-black text-white tracking-tight">
  {Math.max(0, vaultEarn).toLocaleString()}
</div>
```

**변경 후**:
```tsx
<div
  className={cn(
    "text-3xl font-black tracking-tight",
    vaultEarn >= 0 ? "text-white" : "text-red-400",
  )}
>
  {vaultEarn >= 0
    ? `+${vaultEarn.toLocaleString()}`
    : vaultEarn.toLocaleString()}
</div>
```

---

## 4. 핵심 변경 사항

1. **Fallback 로직 추가**: `vault_earn`이 0일 때 `game_data.reward_amount` 사용
2. **음수 값 표시**: 패배 시 차감액을 빨간색으로 표시 (예: `-200P`)
3. **양수 값 접두사**: 승리 시 `+` 접두사 추가 (예: `+500P`)

---

## 5. 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/v2/pages/game/DicePage.tsx` | displayEarn 로직 추가, vault_earn fallback |
| `src/v2/components/game/DiceResultModal.tsx` | 음수 값 표시, 색상 분기, +/- 접두사 |

---

## 6. UI 변경 사항

| 결과 | Before | After |
|------|--------|-------|
| 승리 +500 | `500P` (흰색) | `+500P` (흰색) |
| 무승부 0 | `0P` | `+0P` |
| 패배 -200 | `0P` (음수 숨김) | `-200P` (빨간색) |

---

## 7. 관련 API 응답 구조

```typescript
interface DicePlayResponse {
  result: "OK";
  vault_earn: number;     // 실제 금고 적립액 (정책 적용 후)
  game_data: {
    outcome: "WIN" | "DRAW" | "LOSE";
    reward_amount: number; // 게임 설정 보상액 (DiceConfig)
    // ...
  };
  is_golden_hour: boolean;
}
```

---

## 8. 교훈

### 8.1 데이터 의미론 구분
- `vault_earn`: 금고 정책 적용 후 실제 적립액
- `reward_amount`: 게임 설정에 따른 보상액
- 사용자에게 보여줄 때는 게임 결과 금액(`reward_amount`)이 더 적절

### 8.2 음수 값 처리
- 금융/포인트 시스템에서 음수 값은 반드시 표시해야 함
- `Math.max(0, x)`는 차감/손실을 숨기므로 UX 측면에서 부적절

---

## 9. 관련 문서

- V2 주사위 게임 서비스: `app/v2/services/v2_dice_game_service.py`
- V2 금고 정책: `docs/v2_specs/03_vault/v2_vault_policy_ko.md`
- V2 게임 정책: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/03.game.md`

---

**문서 끝**
