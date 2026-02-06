# V2 복권 경품 수정 400 에러 수정

**작성일**: 2026-01-27  
**상태**: ✅ 해결됨  
**영향 범위**: V2 복권 어드민 경품 수정 API

---

## 1. 문제 요약

V2 어드민 복권 설정 페이지에서 경품(prize) 수정 시 **400 Bad Request** 에러 발생.

### 증상
```
요청 URL: http://localhost:3000/api/v2/admin/game/lottery/config/1/prize/1
요청 메서드: PUT
상태 코드: 400 Bad Request
```

---

## 2. 근본 원인 분석

### 2.1 백엔드-프론트엔드 계약 불일치

**문제점**: 백엔드 `LotteryPrizeUpdateRequest`는 **모든 필드를 필수**로 요구했으나, 프론트엔드는 **부분 업데이트**를 전송.

#### Before (백엔드 스키마)
```python
class LotteryPrizeUpdateRequest(BaseModel):
    """복권 당첨 항목 수정 요청"""
    label: str                    # ❌ 필수
    weight: int = Field(..., ge=0)  # ❌ 필수
    stock: int | None = None
    reward_type: RewardType       # ❌ 필수
    reward_amount: int = 0
    is_active: bool = True
```

#### 프론트엔드 전송 방식
```typescript
// 부분 필드만 포함
const payload: Record<string, any> = {};
if (data.label !== undefined) payload.label = data.label;
// ... 다른 필드도 조건부 추가
```

**결과**: `label` 등 필수 필드가 `undefined`면 payload에서 제외 → 백엔드 Pydantic validation 실패 → **400 Bad Request**

---

## 3. 해결 방안

### 3.1 백엔드: 부분 업데이트 지원

**파일**: `app/v2/schemas/v2_admin_game.py`

```python
class LotteryPrizeUpdateRequest(BaseModel):
    """복권 당첨 항목 수정 요청 (부분 업데이트 지원)"""
    label: str | None = None
    weight: int | None = Field(None, ge=0)
    stock: int | None = None
    reward_type: RewardType | None = None
    reward_amount: int | None = None
    is_active: bool | None = None
```

**파일**: `app/v2/api/admin/game_config_routes.py`

```python
# 부분 업데이트 지원: None이 아닌 필드만 업데이트
if payload.label is not None:
    prize.label = payload.label
if payload.weight is not None:
    prize.weight = payload.weight
# ... 나머지 필드도 동일하게 처리
```

### 3.2 프론트엔드: 명시적 필드 처리

**파일**: `src/v2/api/adminApi.ts`

```typescript
export const updateLotteryPrize = async (
  configId: number,
  prizeId: number,
  data: Partial<AdminLotteryPrizeDto>,
): Promise<void> => {
  const payload: Record<string, any> = {};

  // 필수 필드들 - undefined가 아니면 항상 포함
  if (data.label !== undefined) payload.label = data.label;
  if (data.weight !== undefined) payload.weight = data.weight;
  if (data.rewardType !== undefined) payload.reward_type = data.rewardType;
  if (data.rewardAmount !== undefined) payload.reward_amount = data.rewardAmount;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  
  // Optional 필드 - stock은 undefined일 때 null로 전송 (무제한)
  if (data.stock !== undefined) {
    payload.stock = data.stock ?? null;
  } else if ("stock" in data) {
    payload.stock = null;
  }

  await v2Client.put(
    `/api/v2/admin/game/lottery/config/${configId}/prize/${prizeId}`,
    payload,
  );
};
```

---

## 4. 테스트 결과

### 4.1 부분 업데이트 (label만)
```json
// Request
{"label": "Partial Test"}

// Response: 200 OK
{"id":1,"label":"Partial Test","weight":2,"stock":null,"rewardType":"POINT","rewardAmount":4000,"isActive":true}
```

### 4.2 전체 필드 업데이트
```json
// Request
{
  "label": "1등 상품",
  "weight": 2,
  "stock": null,
  "reward_type": "VAULT",
  "reward_amount": 5000,
  "is_active": true
}

// Response: 200 OK
{"id":1,"label":"1등 상품","weight":2,"stock":null,"rewardType":"POINT","rewardAmount":5000,"isActive":true}
```

---

## 5. 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/schemas/v2_admin_game.py` | `LotteryPrizeUpdateRequest` 모든 필드 Optional로 변경 |
| `app/v2/api/admin/game_config_routes.py` | `update_lottery_prize()` 부분 업데이트 로직 추가 |
| `src/v2/api/adminApi.ts` | `updateLotteryPrize()` stock 필드 처리 개선 |

---

## 6. 검증 체크리스트

- [x] 백엔드 재시작 후 validation 테스트 통과
- [x] 부분 업데이트 (label만) 정상 동작
- [x] 전체 필드 업데이트 정상 동작
- [x] 프론트엔드 빌드 성공 (`npm run build`)

---

## 7. 교훈 및 권장 사항

### 7.1 API 계약 원칙
- **PUT** 요청은 전체 리소스 교체가 원칙이지만, 실무에서는 **부분 업데이트**가 더 편리함
- Pydantic 스키마에서 **Optional 필드**를 명시적으로 지원하여 유연성 확보
- 프론트엔드-백엔드 간 **필드 필수/선택 여부** 명확하게 문서화

### 7.2 디버깅 팁
```python
# Pydantic validation 에러 확인
from app.v2.schemas.v2_admin_game import LotteryPrizeUpdateRequest
try:
    req = LotteryPrizeUpdateRequest.model_validate({'weight': 10})
except Exception as e:
    print(e)  # Field required [type=missing, ...]
```

---

## 8. 관련 문서

- 원본 이슈: 복권 경품 수정 시 400 Bad Request
- V2 게임 설정 API 스키마: `docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md`
- 이전 유사 이슈: `docs/v2_specs/00_sot_meta/03_논리추론샘플_20260125_v2_games_500_errors_fix.md`

---

**문서 끝**
