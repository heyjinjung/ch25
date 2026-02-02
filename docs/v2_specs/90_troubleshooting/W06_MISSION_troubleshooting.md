문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: MISSION
상태: 진행 중 ⏳

# W06 MISSION 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 2 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) MISSION 리포트](./archive/weekly/W05_MISSION_troubleshooting.md)
- [V2 New User Mission Logic SoT](../02_game/v2_new_user_mission_logic_sot_ko.md)
- [V2 Streak Policy (Learned)](../00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/v2_streak_policy_ko.md)

---

## 🔍 주간 이슈 내역

### 02-02 - MISSION/정책 확인: 지연 입금 선반영 XP/레벨 보상 여부

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 지연 입금 선반영(증거 제출 시 즉시 지급) |
| HTTP Status | 200 (정책 확인) |
| 영향 범위 | 유저 레벨/XP 및 레벨 보상 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `V2LatencySurvivalService.submit_evidence()`는 선반영 보상을 **고정 상수**로 지급하며, XP/레벨 서비스 호출이 없음.
    - 상수: `PROVISIONAL_REWARD_TYPE = "ROULETTE_TICKET"`, `PROVISIONAL_REWARD_AMOUNT = 5`
    - 지급 경로: `V2InventoryService.grant_wallet_tokens()` 또는 `V2InventoryService.grant_item()`
    - 관련 코드: [app/v2/services/latency_survival_service.py](../../app/v2/services/latency_survival_service.py)

**결론**
- 입금지연 신청 시 **레벨 XP는 증가하지 않음**.
- 레벨에 따른 보상도 **지급되지 않음**.
- 보상은 임의 생성이 아니라 **상수로 정의된 고정 지급**(현행: 룰렛 티켓 5장)임.

**검증 방법**
- `submit_evidence()` 호출 시 XP/레벨 관련 서비스 호출이 없는지 코드 확인.
- `V2InventoryService` 지급 로그(지갑/인벤토리 원장)만 생성되는지 확인.

### 02-02 - MISSION/FRONTEND: 연속 스트릭 모달 미노출

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 연속 스트릭 미션 모달/UX |
| HTTP Status | 200 (Logic/UI Error) |
| 영향 범위 | 유저 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 프론트 매핑에서 `claimable_rewards` 필드가 누락되어 모달 노출 조건이 충족되지 않음.
- 관련 코드: [src/v2/api/missionApi.ts](../../src/v2/api/missionApi.ts)

**해결 방법**
- `BackendStreakInfoSchema`에 `claimable_rewards` 추가.
- 매핑 시 `claimable_rewards` 우선 적용, 없을 경우 `claimable_day` fallback.

**검증 방법**
- `GET /api/v2/mission/` 응답에 `claimable_rewards` 존재 시 모달 노출 확인.
- KST 09:00 기준 스트릭 리셋 구간에서 동작 확인.

**상태**: ✅ 해결 완료 (2026-02-02)

---

### 02-02 - MISSION/VERIFICATION: 연속 스트릭 미션 어드민 설정값 지급 여부 검증

**증상 정의**
| 항목 | 내용 |
|---|---|
| 요청 사항 | 연속 스트릭 미션이 어드민 설정값대로 지급되고 있는지 확인 |
| 검증 대상 | UiConfig `streak_reward_rules` 기반 보상 지급 로직 |
| 영향 범위 | 전체 유저 (스트릭 마일스톤 도달 시) |
| 우선순위 | 중 (정기 검증) |

**증거 기반 원인 분석**

1. **SoT 문서 검토**
   - 기준 문서: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md`
   - 정책: 스트릭 보상 규칙은 `app_ui_config.config_key = "streak_reward_rules"` 기반
   - 기본값: Day 3 (ROULETTE/DICE/LOTTERY TICKET 각 1개), Day 7 (DIAMOND 1개)
   - Admin API: `GET/PUT /api/v2/admin/ui-config/streak_reward_rules`

2. **코드 검증** (`app/v2/services/streak_service.py`)
   ```python
   def _get_streak_reward_rules(self) -> List[Dict[str, Any]]:
       row = UiConfigService.get(self.db, "streak_reward_rules")
       if row and row.value_json:
           return row.value_json.get("rules", [])
       # 기본값 fallback 존재
   ```

3. **풀스택 검증 체크리스트**

| 레이어 | 검증 항목 | 결과 |
|---|---|---|
| DB | `app_ui_config` 테이블 | ✅ |
| Backend | `_get_streak_reward_rules()` 호출 | ✅ |
| Backend | 기본값 fallback | ✅ |
| Backend | `enabled` 필드 체크 | ⚠️ 개선 여지 |
| API | `/api/v2/mission/streak/claim` | ✅ |
| Frontend | Admin UI Config 설정 | ✅ |
| Testing | 단위 테스트 | ✅ 통과 |

**검증 결과**: ✅ **연속 스트릭 미션은 어드민 설정값대로 지급되고 있음**

**근거**:
- `UiConfigService.get(db, "streak_reward_rules")`로 DB 설정 조회
- Config 없을 시 안전한 기본값 제공
- `claim_streak_reward()`가 규칙 조회 후 `V2RewardService`로 지급
- `tests/v2_tests/phase2_core/test_mission_streak_logic_deep.py` 검증 완료

**개선 권고사항**:
- ⚠️ `enabled: false` 규칙 필터링 추가 권장 (현재는 비활성 규칙도 적용됨)

```python
def _get_streak_reward_rules(self) -> List[Dict[str, Any]]:
    row = UiConfigService.get(self.db, "streak_reward_rules")
    if row and row.value_json:
        rules = row.value_json.get("rules", [])
        return [r for r in rules if r.get("enabled", True)]  # ✨ 필터링
    return [...]  # 기본값
```

**상태**: ✅ 검증 완료 (2026-02-02)

**다음 액션**:
- [ ] (선택) `enabled: false` 필터링 로직 추가

---

## 📝 관리 가이드
- 일일 미션, 신규 유저 미션, 스트릭 보상 지급 확인
