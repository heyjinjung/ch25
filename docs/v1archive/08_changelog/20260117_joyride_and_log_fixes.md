# 🧭 개발 로그: 앱 가이드(Joyride) 최신화 및 UI/Type 수정

**작성일**: 2026-01-17
**작성자**: GitHub Copilot

---

## 1. 개요
앱 구조 개편(보상함/하단 네비 변경)으로 인해 동작하지 않던 **앱 가이드(Joyride)** 흐름을 최신 UX에 맞춰 전면 수정했습니다. 또한 빌드 시 발생하던 일부 타입/린트 에러를 해결했습니다.

---

## 2. 주요 변경 사항

### 2.1 앱 가이드(Joyride) 흐름 재설계 (`AppGuide.tsx`)
기존의 유효하지 않은 타겟(금고 내 보상함 진입 버튼 등)을 제거하고, 최신 하단 네비게이션 흐름을 반영했습니다.

**변경 전 흐름**:
- 홈 → 게임 → 금고 → (구)보상함 버튼 → 보상함 → 상점 → 이벤트

**변경 후 흐름 (User Request 반영)**:
1. **홈**: 메인 화면 안내
2. **게임**: 게임 탭 안내
3. **금고**: 금고 탭 안내
4. **출금 조건**: 금고 페이지 내 '출금 조건' 버튼 타겟팅
5. **출금 안내**: 달성 팁 및 상점 유도
6. **상점**: 하단 네비 상점 탭 → `/shop` 이동
7. **보상함**: 상점 탭 안내 후 `/rewards` (보상함) 탭으로 자동 이동
8. **이벤트**: 하단 네비 이벤트 탭 → `/events` 이동
9. **미션**: 미션 수행 안내 (`/missions`)
10. **보상 수령**: 중요!) 미션 완료 후 보상 수령 버튼(`mission-claim-btn`) 꼭 누르도록 강력 안내

### 2.2 가이드 타겟 속성 추가 (`data-tour`)
Joyride가 요소를 정확히 찾을 수 있도록 주요 컴포넌트에 식별자를 추가했습니다.

- **`VaultPageCompact.tsx`**: 출금 조건 확인 버튼에 `data-tour="vault-condition-btn"` 추가
- **`TodayMissionCard.tsx`**, **`MissionCard.tsx`**: 보상 수령 버튼에 `data-tour="mission-claim-btn"` 추가

### 2.3 라우팅/UX 개선
- `AppGuide` 내 `useEffect`를 통해 가이드 단계별로 적절한 페이지(`/vault`, `/shop`, `/rewards`, `/events`, `/missions`)로 자동 이동하도록 구현했습니다.
- 타겟 요소가 렌더링될 때까지 기다리는 `waitForVisibleTarget` 로직을 강화하여 가이드 끊김 현상을 방지했습니다.

### 2.4 빌드 에러 및 린트 수정
- **`VaultPageCompact.tsx`**: 인라인 스타일(`style={{ cursor: 'pointer' }}`)을 Tailwind CSS 클래스(`cursor-pointer`)로 변경.
- **`MissionCard.tsx`**: Tailwind가 인식하지 못하는 동적 클래스 문자열(`w-[${percent}%]`) 사용을 제거하고, `style` 속성으로 너비를 직접 제어하도록 수정.

### 2.5 이벤트/모달모음 페이지 추가 (`EventModalsPage.tsx`)
- 이벤트 탭을 **이벤트모음** 화면으로 구성하고, 유저 모달을 카드 섹션으로 통합.
- 카드 클릭 시 모달이 **항상 오픈**되는 정책으로 동작하도록 구성.
- 골든아워 팝업까지 포함해 이벤트 성격의 모달을 한 화면에서 확인 가능하게 정리.

### 2.6 스트릭 룰 로딩 방어 및 API 경로 정리
- **`streakApi.ts`**에서 `/api/mission/streak/rules`로 호출 경로를 통일.
- 응답이 배열이 아닐 경우에도 배열로 정규화하여 `.find()` 호출 에러 방지.
- **`StreakOverviewPage.tsx`**에서 `rulesList`로 안전하게 접근하도록 수정.

### 2.7 이벤트 탭 정리
- **`EventDashboardPage.tsx`**에서 스트릭 카드 섹션 제거 (이벤트모음 화면으로 이동).

---

## 3. 검증 결과
- **빌드**: `npm run build` 성공 (Type Check 통과)
- **가이드 테스트**: 홈부터 미션 보상까지 끊김 없이 페이지 전환 및 툴팁 표시 확인 완료.
 - **이벤트모음 페이지**: 카드 클릭 시 각 모달 오픈 동작 확인 필요.
 - **테스트**: `pytest -q tests/test_event_modals_hub_ui_config.py` (1 passed, FastAPI on_event deprecation warnings 4건)

---

## 4. 향후 계획
- 가이드가 한 번 완료되면 `GuideContext`를 통해 재실행되지 않도록 유지(기존 로직).
- 신규 유저 진입 시 웰컴 모달 이후 가이드 연결 흐름 점검 필요.
