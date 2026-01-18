# OPS Plan Execution Result Schema (백엔드 응답 구조)

**문서 유형**: 아키텍처 / API 스키마  
**버전**: v1.2  
**작성일**: 2026-01-15  
**최종 업데이트**: 2026-01-16  
**상태**: Active (SoT)

---

## 문서 목적

OPS Plan 액션 실행 시 `OpsPlanService.execute_task()`가 `payload_json["execution_result"]`로 기록하는 결과 구조를 정리한다.  
프론트엔드 파싱, 테스트 assertion, 운영 로그 분석의 기준 문서로 사용한다.

---

## 적용 범위

### 실행 결과를 기록하는 액션(kind)
1. **INVENTORY_GRANT_ALL** - 전체 사용자 일괄 지급
2. **TARGETED_ITEM_GRANT** - 대상 리스트 사용자 지급
3. **TARGETLIST_BROADCAST** - 대상 리스트 멤버 `SENT` 마킹
4. **GOLDEN_HOUR** - 골든아워 설정 (FORCE_ON/OFF, MULTIPLIER_SET)
5. **MESSAGE_TEMPLATE** - 메시지/DM 템플릿 발송 처리(상태 마킹)
6. **SURVEY_DM** - 설문 DM 발송 처리(상태 마킹)

### 저장 위치
- **DB**: `ops_plan_task.payload_json["execution_result"]`
- **서비스**: `app/services/ops_plan_service.py:execute_task()`

### 실행 조건
- `execute_task(..., status_value="DONE")` 인 경우에만 실행 결과가 기록된다.
- `status_value != "DONE"` 이면 실행 로직 및 `execution_result` 기록이 수행되지 않는다.

---

## 공통 구조

### 기본 규칙
```json
{
  "kind": "<ACTION_KIND>",
  // 액션별 필드
}
```

### 에러 처리 규칙
```json
{
  "execution_error": "에러 메시지 (최대 500자)"
}
```
- **INVENTORY_GRANT_ALL**에서 예외 발생 시 `task.status`를 `"BLOCKED"`로 변경하고 `execution_error`를 기록한다.
- 그 외 액션은 내부에서 예외를 흡수하거나, 예외가 그대로 전파될 수 있다. 이 경우 `execution_error`가 기록되지 않을 수 있다.

---

## 액션별 응답 스키마

### 1. INVENTORY_GRANT_ALL

**목적**: 전체 사용자에게 다중 아이템을 일괄 지급한다.

#### 응답 구조
```json
{
  "kind": "INVENTORY_GRANT_ALL",
  "reason": "OPS_PLAN_GRANT_ALL",
  "items": [
    {
      "item_type": "DIAMOND",
      "amount": 1000
    },
    {
      "item_type": "ROULETTE_COIN",
      "amount": 5
    }
  ],
  "target": "ALL_USERS",
  "granted_users": 1523
}
```

#### 필드 정의
| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `kind` | string | O | 고정값 `"INVENTORY_GRANT_ALL"` | `"INVENTORY_GRANT_ALL"` |
| `reason` | string | O | 지급 사유 (로그/정산용) | `"OPS_PLAN_GRANT_ALL"` |
| `items` | array | O | 지급 아이템 목록 | `[{"item_type": "DIAMOND", "amount": 1000}]` |
| `target` | string | O | 고정값 `"ALL_USERS"` | `"ALL_USERS"` |
| `granted_users` | integer | O | 실제 지급된 사용자 수 | `1523` |

#### 검증/에러
- `items`가 비어있으면 `OPS_GRANT_ALL_ITEMS_REQUIRED` (HTTP 422)
- 유효한 아이템이 하나도 없으면 `OPS_GRANT_ALL_ITEMS_INVALID` (HTTP 422)
- 실행 중 예외 발생 시 `execution_error` 기록 + `task.status = "BLOCKED"`

---

### 2. TARGETED_ITEM_GRANT

**목적**: 대상 리스트 멤버에게 아이템을 지급한다.

#### 응답 구조
```json
{
  "kind": "TARGETED_ITEM_GRANT",
  "granted_users": 247,
  "items": [
    {
      "item_type": "VOUCHER_DICE_ROLL_1",
      "amount": 3
    },
    {
      "item_type": "GIFTICON_BAEMIN_5000",
      "amount": 1
    }
  ]
}
```

#### 필드 정의
| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `kind` | string | O | 고정값 `"TARGETED_ITEM_GRANT"` | `"TARGETED_ITEM_GRANT"` |
| `granted_users` | integer | O | 지급된 사용자 수 | `247` |
| `items` | array | O | 지급 아이템 목록 | `[{"item_type": "POINT", "amount": 1000}]` |

#### 입력 형식 (payload_json)
- `items` 배열 또는 `item_type` + `amount` 단건 입력을 허용한다.
- `reason`은 기본 `"OPS_PLAN_GRANT"`로 사용되며 결과에는 포함되지 않는다.

#### 안전 동작 (No-Op)
- `target_list_id`가 없거나 조회 실패 시 전역 지급을 막기 위해 지급하지 않음.
```json
{
  "kind": "TARGETED_ITEM_GRANT",
  "granted_users": 0,
  "items": []
}
```

#### 검증/에러
- 유효한 아이템이 없으면 `OPS_GRANT_ALL_ITEMS_INVALID` (HTTP 422)

---

### 3. TARGETLIST_BROADCAST

**목적**: 대상 리스트 멤버 상태를 `"SENT"`로 마킹한다.

#### 응답 구조
```json
{
  "kind": "TARGETLIST_BROADCAST",
  "sent_count": 152
}
```

#### 필드 정의
| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `kind` | string | O | 고정값 `"TARGETLIST_BROADCAST"` | `"TARGETLIST_BROADCAST"` |
| `sent_count` | integer | O | `SENT`로 변경된 멤버 수 | `152` |

#### 동작
- `target_list_id`가 있으면 대상 리스트 멤버를 조회하여 `status="SENT"`로 업데이트한다.
- 예외 발생 시 `sent_count=0`으로 반환될 수 있다.

---

### 4. GOLDEN_HOUR

**목적**: 골든아워 설정을 변경한다.

#### 응답 구조
##### 4-1. FORCE_ON
```json
{
  "kind": "GOLDEN_HOUR",
  "action": "FORCE_ON",
  "multiplier": 2.0,
  "enabled": true,
  "manual_override": "FORCE_ON"
}
```

##### 4-2. FORCE_OFF
```json
{
  "kind": "GOLDEN_HOUR",
  "action": "FORCE_OFF",
  "multiplier": 2.0,
  "enabled": false,
  "manual_override": "FORCE_OFF"
}
```

##### 4-3. MULTIPLIER_SET
```json
{
  "kind": "GOLDEN_HOUR",
  "action": "MULTIPLIER_SET",
  "multiplier": 3.5,
  "enabled": true,
  "manual_override": "AUTO"
}
```

#### 필드 정의
| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `kind` | string | O | 고정값 `"GOLDEN_HOUR"` | `"GOLDEN_HOUR"` |
| `action` | string | O | 실행 액션 (대문자) | `"FORCE_ON"`, `"FORCE_OFF"`, `"MULTIPLIER_SET"` |
| `multiplier` | float | O | 현재 골든아워 배율 | `2.0`, `3.5` |
| `enabled` | boolean | O | 골든아워 활성 여부 | `true`, `false` |
| `manual_override` | string | O | 수동 설정 상태 | `"FORCE_ON"`, `"FORCE_OFF"`, `"AUTO"` |

#### 동작
- `action`은 항상 대문자로 저장된다. (예: `"force_on"` → `"FORCE_ON"`)
- `MULTIPLIER_SET`에서 `multiplier` 미제공 시 기존 값을 유지한다.

---

### 5. MESSAGE_TEMPLATE / SURVEY_DM

**목적**: 대상 리스트 멤버 상태를 `"SENT"`로 마킹하고 발송 기록 로그를 남긴다.

#### 응답 구조
```json
{
  "kind": "MESSAGE_TEMPLATE",
  "target_list_id": 120,
  "channel": "TELEGRAM_DM",
  "audience": "TARGET_LIST",
  "sent_count": 42
}
```

```json
{
  "kind": "SURVEY_DM",
  "target_list_id": 120,
  "channel": "TELEGRAM_DM",
  "audience": "TARGET_LIST",
  "sent_count": 42
}
```

#### 필드 정의
| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `kind` | string | O | `"MESSAGE_TEMPLATE"` 또는 `"SURVEY_DM"` | `"MESSAGE_TEMPLATE"` |
| `target_list_id` | integer | O | 대상 리스트 ID | `120` |
| `channel` | string | O | 발송 채널 | `"TELEGRAM_DM"`, `"TELEGRAM_BROADCAST"` |
| `audience` | string | O | 수신자 범위 | `"ALL_USERS"`, `"TARGET_LIST"` |
| `sent_count` | integer | O | `SENT`로 변경된 멤버 수 | `42` |

#### 동작
- `target_list_id`가 있으면 대상 리스트 멤버를 조회하여 `status="SENT"`로 업데이트한다.
- 예외 발생 시 `sent_count=0`으로 반환될 수 있다.
- `channel`, `audience`는 결과 영수증 표시용 메타로 `execution_result`에 포함한다.

---

## 테스트/Assertion 예시

### INVENTORY_GRANT_ALL
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "INVENTORY_GRANT_ALL"
assert result["target"] == "ALL_USERS"
assert result["granted_users"] >= 5
```

### TARGETED_ITEM_GRANT (No-Op)
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "TARGETED_ITEM_GRANT"
assert result["granted_users"] == 0
```

### TARGETLIST_BROADCAST
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "TARGETLIST_BROADCAST"
assert result["sent_count"] == 5
```

### GOLDEN_HOUR (FORCE_ON)
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "GOLDEN_HOUR"
assert result["action"] == "FORCE_ON"
assert result["enabled"] is True
assert result["manual_override"] == "FORCE_ON"
```

### MESSAGE_TEMPLATE
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "MESSAGE_TEMPLATE"
assert result["sent_count"] >= 0
```

---

## 관련 파일

- `app/services/ops_plan_service.py` - 실행 로직
- `app/models/ops_plan.py` - 모델 정의
- `tests/test_ops_plan_actions.py` - 통합 테스트
- `tests/test_admin_ops_plan_execution.py` - API 레벨 검증

---

## 주의사항

1. **필드 케이스**
   - `kind`, `action`은 대문자 스네이크 케이스 사용
   - 결과 필드는 스네이크 케이스 사용 (`granted_users`, `sent_count`)

2. **버전 호환**
   - 기존 필드의 제거/변경은 금지
   - 신규 필드는 옵션으로 추가

3. **실행 결과 누락 가능성**
   - `status_value != "DONE"` 또는 예외 발생 시 `execution_result`가 없을 수 있다.
   - 에러 기록은 `INVENTORY_GRANT_ALL`에 한해 `execution_error`로 저장된다.

---

## 향후 확장 (미구현)

1. **LEVEL_UP_BOOST** - 레벨업 부스트 이벤트
2. **TEAM_BATTLE_REWARD** - 팀 배틀 보상 일괄 지급
