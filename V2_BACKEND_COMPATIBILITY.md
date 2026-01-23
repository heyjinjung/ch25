# V2 Backend Compatibility Guide

## 📋 Overview

The V2 frontend pages (Roulette, Dice, Lottery) are connected to the backend via a specialized adapter. Originally designed for V1 compatibility, this adapter has been upgraded to connect directly to **V2 API endpoints** while maintaining the expected data structures for the frontend.

## 🔧 Current Situation (2026-01-21 Update)

**Status**: V2 Backend Integration Complete
- The adapter now routes all calls to `/api/v2/*` endpoints.
- **Client**: Uses `v2Client` (with V2-style Bearer authentication).
- **Paths**:
  - `/api/v2/roulette/status`
  - `/api/v2/dice/status`
  - `/api/v2/lottery/status`
  - `/api/v2/vault/status`

## 🚀 Standardized Ticket Naming (SoT)

All V2 components must use the **Standardized Token Naming** defined in the Source of Truth (SoT).

| Legacy (Deprecated) | V2 Standard (Current) |
|---------------------|----------------------|
| `ROULETTE_COIN`     | `ROULETTE_TICKET`    |
| `DICE_TOKEN`        | `DICE_TICKET`        |
| `GOLD_KEY`          | `GOLD_KEY_TICKET`    |
| `DIAMOND_KEY`       | `DIAMOND_TICKET`     |
| `TRIAL_TOKEN`       | `TRIAL_TICKET`       |

> [!IMPORTANT]
> Frontend code and the adapter implementation have been updated to use these standard strings. Do not use legacy "COIN" or "TOKEN" suffixes in V2 code.

## 📊 V2 Backend Adapter Flow

The adapter in `src/v2/api/v1CompatAdapter.ts` now acts as a bridge to the V2 Backend:

1. **Sends V2 path requests** (e.g., `/api/v2/roulette/status`)
2. **Uses `v2Client`** for proper header/auth handling
3. **Maps legacy fields** if necessary to ensure frontend components receive consistent data
4. **Handles V2-specific errors**

## 🧭 Frontend Routing & Layout Standardization

- V2 게임 라우팅을 `/v2/game/*`로 표준화하고 V2 경로(`/api/v2/*`)로 고정했습니다.
- 티켓 명칭은 SoT 표준(ROULETTE_TICKET, DICE_TICKET, LOTTERY_TICKET 등)으로 통일되었습니다.
- Telegram WebView 최적화를 위해 레이아웃을 `100dvh + flex-col` 구조로 정리했습니다.
- 상단 헤더/하단 네비가 V2 레이아웃 흐름에 포함되도록 통합되었습니다.

## 🔍 Troubleshooting

### 1. 404 Not Found (Error: `NO_FEATURE_TODAY`)
- **Symptoms**: Axios error 404, response body `{"detail":"NO_FEATURE_TODAY"}`.
- **Cause**: The backend's `FeatureService` rejects the request because the game feature is not active in DB.
  - If `FEATURE_GATE_ENABLED=true`, an active `feature_schedule` for today may be required.
  - Even when schedule gating is OFF (archived/default), **missing `feature_config` rows** (or `is_enabled=false`) can still cause `NO_FEATURE_TODAY`.
- **Solution**:
  - Ensure `feature_config` has rows for `DICE/ROULETTE/LOTTERY` with `is_enabled=true`.
  - If schedule gating is enabled, also ensure a "Feature Schedule" exists and is active for today.
- **Dev Bypass**: 로컬에서만 `FEATURE_GATE_ENABLED=false`, `TEST_MODE=true`로 우회 가능.

### 2. 401 Unauthorized
- **Cause**: Invalid or expired JWT token.
- **Solution**: Log in again using the V2 login page. Ensure the token is stored correctly in `localStorage`.

### 3. Ticket Type Mismatch
- **Cause**: Using `ROULETTE_COIN` instead of `ROULETTE_TICKET`.
- **Solution**: Ensure `src/types/gameTokens.ts` is updated and your component uses the `V2Standard` naming.

## 🔄 Migration Path

### Phase 1: V1 Bridge (Old)
```
V2 Frontend → v1CompatAdapter → V1 Backend (/api/*)
```

### Phase 2: V2 Backend Adapter (Current)
```
V2 Frontend → v2BackendAdapter → V2 Backend (/api/v2/*)
```

### Phase 3: Direct API (Next Step)
```
V2 Frontend → gameApi → V2 Backend (/api/v2/*)
```
*Currently, we use the adapter to ensure consistent data structures as the V2 backend response models stabilize.*

---
**Last Updated**: 2026-01-21
**Status**: V2 Integration (Adapter Mode)