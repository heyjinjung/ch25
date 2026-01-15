# OPS Plan Execution Result Schema (백엔드 응답 구조)

**문서 타입**: 아키텍처 / API 스키마  
**버전**: v1.0  
**작성일**: 2026-01-15  
**작성자**: GitHub Copilot  
**대상**: 백엔드/프론트엔드 개발자, 테스트 엔지니어  
**상태**: SoT (Source of Truth)

---

## 📋 목적

운영 계획(OPS Plan) 액션 실행 시 `OpsPlanService.execute_task()` 메서드가 반환하는 `execution_result` 구조를 정의합니다. 이 문서는 **프론트엔드 파싱, 테스트 assertion, 운영 로그 분석**의 기준으로 사용됩니다.

---

## 🎯 적용 범위

### 대상 액션 타입 (kind)
1. **INVENTORY_GRANT_ALL** - 전체 유저 아이템 지급 (레거시)
2. **TARGETED_ITEM_GRANT** - 타깃 리스트 대상 다중 아이템 지급
3. **TARGETLIST_BROADCAST** - 타깃 리스트 멤버 공지/메시지 상태 마킹
4. **GOLDEN_HOUR** - 골든아워 토글 설정 (FORCE_ON/OFF, MULTIPLIER_SET)
5. **MESSAGE_TEMPLATE** - 메시지 템플릿 발송 (향후 확장)
6. **SURVEY_DM** - 설문 DM 발송 (향후 확장)

### 저장 위치
- **DB 테이블**: `ops_plan_task.payload_json["execution_result"]`
- **백엔드 메서드**: `app/services/ops_plan_service.py:execute_task()`

---

## 🔧 공통 구조

### 기본 원칙
```json
{
  "kind": "<ACTION_TYPE>",  // 필수: 액션 타입 (대문자)
  // ... 액션별 추가 필드
}
```

### 에러 응답 (실행 실패 시)
```json
{
  "execution_error": "에러 메시지 (최대 500자)"
}
```
**주의**: 에러 발생 시 `task.status`가 `"BLOCKED"`로 변경됩니다.

---

## 📊 액션별 응답 스키마

### 1. INVENTORY_GRANT_ALL

**목적**: 전체 유저에게 다중 아이템 일괄 지급 (레거시)

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
| `kind` | string | ✅ | 고정값: `"INVENTORY_GRANT_ALL"` | `"INVENTORY_GRANT_ALL"` |
| `reason` | string | ✅ | 지급 사유 (레저/로그 용도) | `"OPS_PLAN_GRANT_ALL"` |
| `items` | array | ✅ | 지급된 아이템 목록 | `[{"item_type": "DIAMOND", "amount": 1000}]` |
| `target` | string | ✅ | 고정값: `"ALL_USERS"` | `"ALL_USERS"` |
| `granted_users` | integer | ✅ | 실제 지급된 유저 수 | `1523` |

#### 백엔드 로직 위치
- **메서드**: `OpsPlanService._execute_inventory_grant_all()`
- **파일**: [app/services/ops_plan_service.py](c:\Users\JAVIS\ch\ch25\app\services\ops_plan_service.py#L28-L81)

---

### 2. TARGETED_ITEM_GRANT

**목적**: 타깃 리스트 멤버에게 다중 아이템 지급 (운영 플레이북 핵심)

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
| `kind` | string | ✅ | 고정값: `"TARGETED_ITEM_GRANT"` | `"TARGETED_ITEM_GRANT"` |
| `granted_users` | integer | ✅ | 지급된 유저 수 (타깃 멤버 수) | `247` |
| `items` | array | ✅ | 지급된 아이템 목록 | `[{"item_type": "DIAMOND", "amount": 500}]` |

#### 특수 동작: Fail-Safe (No-Op)
- **조건**: `target_list_id`가 없을 때
- **결과**: `granted_users = 0` (전체 지급 사고 방지)

```json
{
  "kind": "TARGETED_ITEM_GRANT",
  "granted_users": 0,
  "items": []
}
```

#### 백엔드 로직 위치
- **메서드**: `OpsPlanService.execute_task()` (kind 분기)
- **파일**: [app/services/ops_plan_service.py](c:\Users\JAVIS\ch\ch25\app\services\ops_plan_service.py#L397-L462)

---

### 3. TARGETLIST_BROADCAST

**목적**: 타깃 리스트 멤버 상태를 `"SENT"`로 마킹 (공지/메시지 발송 완료 표시)

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
| `kind` | string | ✅ | 고정값: `"TARGETLIST_BROADCAST"` | `"TARGETLIST_BROADCAST"` |
| `sent_count` | integer | ✅ | 상태가 `SENT`로 변경된 멤버 수 | `152` |

#### 백엔드 로직 위치
- **메서드**: `OpsPlanService.execute_task()` (kind 분기)
- **파일**: [app/services/ops_plan_service.py](c:\Users\JAVIS\ch\ch25\app\services\ops_plan_service.py#L375-L395)

#### DB 부수효과
- `ops_target_member.status` → `"SENT"` 업데이트
- `ops_target_member.updated_at` → 현재 시각

---

### 4. GOLDEN_HOUR

**목적**: 골든아워 토글 설정 (강제 ON/OFF, 배율 설정)

#### 응답 구조

##### 4-1. FORCE_ON (강제 활성화)
```json
{
  "kind": "GOLDEN_HOUR",
  "action": "FORCE_ON",
  "multiplier": 2.0,
  "enabled": true,
  "manual_override": "FORCE_ON"
}
```

##### 4-2. FORCE_OFF (강제 비활성화)
```json
{
  "kind": "GOLDEN_HOUR",
  "action": "FORCE_OFF",
  "multiplier": 2.0,
  "enabled": false,
  "manual_override": "FORCE_OFF"
}
```

##### 4-3. MULTIPLIER_SET (배율 설정)
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
| `kind` | string | ✅ | 고정값: `"GOLDEN_HOUR"` | `"GOLDEN_HOUR"` |
| `action` | string | ✅ | 실행된 액션 타입 | `"FORCE_ON"`, `"FORCE_OFF"`, `"MULTIPLIER_SET"` |
| `multiplier` | float | ✅ | 현재 골든아워 배율 | `2.0`, `3.5` |
| `enabled` | boolean | ✅ | 골든아워 활성화 상태 | `true`, `false` |
| `manual_override` | string | ✅ | 수동 재정의 상태 | `"FORCE_ON"`, `"FORCE_OFF"`, `"AUTO"` |

#### 백엔드 로직 위치
- **메서드**: `OpsPlanService._execute_golden_hour_toggle()`
- **파일**: [app/services/ops_plan_service.py](c:\Users\JAVIS\ch\ch25\app\services\ops_plan_service.py#L83-L160)

#### DB 부수효과
- `vault2_config_kv(key="golden_hour_config")` 업데이트
- `ops_log` 자동 기록 (`SYS_GOLDEN_HOUR_TOGGLE`, `SYS_GOLDEN_HOUR_MULTIPLIER_SET`)

---

## 🔍 테스트 Assertion 예시

### INVENTORY_GRANT_ALL
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "INVENTORY_GRANT_ALL"
assert result["target"] == "ALL_USERS"
assert result["granted_users"] >= 5  # test_users 수
```

### TARGETED_ITEM_GRANT (No-Op)
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "TARGETED_ITEM_GRANT"
assert result["granted_users"] == 0  # 타깃 없을 시
```

### TARGETLIST_BROADCAST
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "TARGETLIST_BROADCAST"
assert result["sent_count"] == 5  # test_users 수
```

### GOLDEN_HOUR (FORCE_ON)
```python
result = task.payload_json["execution_result"]
assert result["kind"] == "GOLDEN_HOUR"
assert result["action"] == "FORCE_ON"
assert result["enabled"] is True
assert result["manual_override"] == "FORCE_ON"
```

---

## 📂 관련 파일

### 백엔드
- [app/services/ops_plan_service.py](c:\Users\JAVIS\ch\ch25\app\services\ops_plan_service.py) - 실행 로직
- [app/models/ops_plan.py](c:\Users\JAVIS\ch\ch25\app\models\ops_plan.py) - 모델 정의

### 테스트
- [tests/test_ops_plan_actions.py](c:\Users\JAVIS\ch\ch25\tests\test_ops_plan_actions.py) - 통합 테스트

### 문서
- [docs/08_changelog/20260115_ops_plan_action_tests.md](c:\Users\JAVIS\ch\ch25\docs\08_changelog\20260115_ops_plan_action_tests.md) - 테스트 개발로그
- [docs/00_meta/20260114_core_economy_glossary_ko.md](c:\Users\JAVIS\ch\ch25\docs\00_meta\20260114_core_economy_glossary_ko.md) - 경제 용어집

---

## 💡 주의사항

### 1. 필드명 케이스
- **kind**: 대문자 스네이크 케이스 (`INVENTORY_GRANT_ALL`, `GOLDEN_HOUR`)
- **action**: 대문자 스네이크 케이스 (`FORCE_ON`, `MULTIPLIER_SET`)
- **기타**: 소문자 스네이크 케이스 (`granted_users`, `sent_count`)

### 2. 버전 호환성
- 과거 실행 결과는 스키마가 다를 수 있음 (마이그레이션 없음)
- 신규 필드 추가 시 **하위 호환성 유지** (옵셔널로 추가)

### 3. 에러 처리
- 실행 실패 시 `execution_error` 필드 사용
- `task.status`가 `"BLOCKED"`로 변경
- 프론트엔드는 `execution_error` 우선 체크 필요

### 4. 프론트엔드 파싱 권장 패턴
```typescript
interface ExecutionResult {
  kind: string;
  [key: string]: any;
}

const result = task.payload_json?.execution_result as ExecutionResult | undefined;

if (!result) {
  // 아직 실행 안됨
} else if (result.kind === "INVENTORY_GRANT_ALL") {
  console.log(`전체 유저 ${result.granted_users}명에게 지급됨`);
} else if (result.kind === "GOLDEN_HOUR") {
  console.log(`골든아워 ${result.enabled ? "ON" : "OFF"} (배율: ${result.multiplier})`);
}
```

---

## 🚀 향후 확장

### 예정된 액션 타입
1. **MESSAGE_TEMPLATE**: 메시지 템플릿 발송 (SMS/푸시/텔레그램)
2. **SURVEY_DM**: 설문 DM 발송
3. **LEVEL_UP_BOOST**: 레벨업 부스트 이벤트
4. **TEAM_BATTLE_REWARD**: 팀배틀 보상 일괄 지급

### 스키마 확장 원칙
- 기존 필드는 **삭제/변경 금지** (하위 호환성)
- 신규 필드는 **옵셔널**로 추가
- `kind` 값은 고유해야 하며 대문자 스네이크 케이스 사용

---

**작성자**: GitHub Copilot  
**마지막 업데이트**: 2026-01-15  
**버전**: v1.0  
**상태**: Active (SoT)
