# 2026-01-16 개발 로그 - 룰렛 보상 규칙 개선 및 OPS Admin UX 설계

##### 🚨 중요 알림 (Critical Update)
### **룰렛 금고 적립 규칙 변경 (Hardcoded Rule Removal)**
- **변경 내용**: 기존 `RouletteService` 및 `VaultService`에 하드코딩되어 있던 **"기본 승리 시 +200원 / 패배(5번 세그먼트) 시 -50원"** 적립 로직을 **삭제**했습니다.
- **현재 동작**: `POINT` 타입 보상이 아닌 경우(예: 티켓, XP)나 `꽝(LOSE)`인 경우, 금고 적립금은 **0원**이 됩니다.
- **후속 조치 (DB Cleanup Script)**:
  - 서버 배포 시, DB `VaultProgram` 설정에 남아있을 수 있는 구버전 규칙(+200/-50)을 제거하기 위해 아래 스크립트를 실행해야 합니다.
  - **실행 명령어**: `python scripts/remove_roulette_vault_config.py`
  - *이 스크립트는 `VaultProgram` 내 `ROULETTE` 관련 `game_earn_config`를 안전하게 제거하여 코드 기본값(0원)을 따르게 합니다.* #####

---

## 작업 개요 (Overview)
- **룰렛 경제 밸런스 조정**: 불필요한 기본 적립/차감 로직 제거로 유저 혼란 방지.
- **OPS Admin UX 설계**: '개발자 도구'스러운 현재 UI를 '게임 마스터 콘솔'로 업그레이드하기 위한 기획 수립.

## 상세 변경 사항 (Details)

### 1. 백엔드 (Backend)
- `app/services/vault_service.py`
  - `record_game_play_earn_event` 메서드 내 룰렛 하드코딩 Fallback 로직 수정.
  - `amount_before_multiplier` 기본값을 `200/-50`에서 `0`으로 변경.
- `scripts/remove_roulette_vault_config.py` (신규)
  - DB에 저장된 Legacy Config를 청소하는 유틸리티 스크립트 추가.

### 2. 기획 & 설계 (Planning)
- **Ops Admin UX 개선안 도출 (`도파민AA_Ops_Admin_UX_Plan.md`)**:
  - **Raw Input 제거**: 아이템 코드/타겟 ID 직접 입력 방식 → **검색 가능한 셀렉터(Selector)**로 변경.
  - **Action Module**: 단순 템플릿이 아닌, 상황별 조립식 모듈(Toggle, Message, Grant) 설계.
  - **Visual Feedback**: 실행 결과 영수증(Receipt) 및 라이브 현황판 도입.
- **디자인 업그레이드 계획 수립 (`도파민2차디자인개선.md`)**:
  - Main Layout(Live Background), Game Zone(Physical Effects), Economy(Visual Wealth) 등 시각적 만족도 강화 전략 수립.

## 다음 단계 (Next Steps)
- **Admin Ops Frontend 구현 (Phase 1)**:
  - `ItemSelector`, `TargetListSelector` 컴포넌트 개발.
  - `ExecutionResultView` (결과 영수증) 구현.
- **디자인 리소스 준비**:
### 3. 프런트엔드 (Frontend) - UX/UI 개선
- **금고 페이지 (`VaultPageCompact.tsx`)**:
  - `SparkleDust` 애니메이션 속도 조정: 기존 3~8초 → **12~22초**로 변경하여 부드럽고 고급스러운 연출 강화.
- **메인 로비 (`HomePage.tsx`)**:
  - **3D Tilt Card**: `framer-motion` 도입, 마우스 호버 시 카드가 기울어지는 입체 효과 구현.
  - **Dynamic Banner**: Hero 배너 및 버튼에 `shine`, `zoom` 애니메이션 추가 (Shimmer 효과는 과도하여 제외).
  - **Tailwind Config**: `shine`, `bounce-subtle` 등 신규 애니메이션 키프레임 정의.

### 4. 전략 문서 (Strategy)
- **체류시간 증대 전략 (`도파민2차_체류시간증대_전략_v1.0.md`)**:
  - 룰렛 피버 게이지, 주사위 더블업, 복권 컬렉션 등 "한 번 더"를 유도하는 게임별 장치 기획.
  - 시스템 단위의 잭팟 피드, 연쇄 보상 게이트 설계.

### 5. 룰렛 시각 효과 / 라이브 피드 (Roulette WIN & Live Feed)
- **Visual Effects (RoulettePage.tsx)**:
  - **Fireworks**: `canvas-confetti` 라이브러리를 활용, 승리 시 좌우/중앙에서 폭죽이 터지는 연출 구현.
  - **Screen Shake**: `framer-motion`으로 잭팟 등 대박 시 화면 흔들림(Impact) 효과 추가.
  - **Mobile Optimized Reward Toast**: Telegram 인앱 브라우저 등에서 잘리지 않도록 반응형(Width Clamp) 스타일 적용.
- **실시간 위너 피드 (LiveFeedTicker.tsx)**:
  - **구현**: 상단 롤링 텍스트 ("User123님이 50,000원 획득!") 컴포넌트 개발.
  - **데이터**: 실제 DB 유저 패턴(한글 닉네임, tg_ ID)을 반영한 **Realistic Mock Data** 적용 (Backend API 연동 전 단계).
  - **배치**: `GamePageShell`에 통합하여 모든 게임 상단에서 FOMO 자극.

### 6. 백엔드 검증 (Backend Verification)
- **Roulette Vault Logic Test**:
  - `tests/test_roulette_vault_fix.py` 작성 및 통과.
  - 룰렛의 하드코딩된 보상(+200/-50)이 제거되고, `POINT` 타입만 정상 적립되는지 검증 완료.
  - `Vault2Service`의 Config Fallback 로직에 대한 테스트 커버리지 확보.

### 7. 사운드 시스템 (BGM) - 전역 자동 시작 & 자동재생 제한 대응
- **BGM 시작 지점 승격**: 게임 진입 이후에만 BGM이 들리던 문제를 해결하기 위해, `src/App.tsx`에서 **유저 영역 라우트 진입 시 Main BGM 자동 시작**하도록 변경. (`/admin` 진입 시에는 stop 처리)
- **모바일/Telegram 자동재생 제한 대응**: `AudioContext`가 `suspended` 상태일 때 BGM 재생 요청을 pending으로 보류하고, 첫 클릭/터치 이후 `unlockAudio()`에서 재생을 재시도하도록 `src/contexts/SoundContext.tsx`에 보강.
- **중복 호출 정리**: `GamePageShell`의 기본 마운트 시 BGM start 호출을 제거하고, `disableMainBgm` 사용 시에만 stop/resume로 제어하도록 정리.

### 8. Phase 2-1: 룰렛 등급제 및 어드민 개선 (Roulette Segmentation & Admin UI)
#### 8-1. 백엔드 (Backend)
- **등급(Grade) 시스템 도입**:
  - `RouletteConfig` 모델에 `grade` 컬럼 추가 (`COMMON`, `WHALE`, `NEW`).
  - `RouletteService`에 유저 세그먼트 결정 로직(`_resolve_user_grade`) 추가 (가입일/입금액 기준).
  - `GameTokenType`에 `GOLD_KEY_FRAGMENT`, `DIAMOND_KEY_FRAGMENT` 추가.
  - Alembic 마이그레이션 (`20260116_1236_23cb59c1173f`) 적용 완료.
- **Admin API 업데이트**:
  - `AdminRouletteConfigBase` 스키마에 `grade` 필드 추가.
  - `AdminRouletteService` CRUD 로직에 등급 필드 처리 추가.
  - `scripts/test_admin_roulette.py`로 생성/수정/조회 검증 완료.

#### 8-2. 프런트엔드 (Frontend - Admin)
- **API 클라이언트**:
  - `src/admin/api/adminRouletteApi.ts` 타입 정의에 `grade` 필드 및 `RouletteGrade` 타입 추가.
- **UI/UX 개선 (`RouletteConfigPage.tsx`)**:
  - **등급 필터 탭**: `ALL`, `COMMON`, `WHALE`, `NEW` 탭으로 룰렛 설정 필터링 기능 구현.
  - **비주얼 업데이트**: 각 카드에 타겟 등급을 표시하는 **Badge UI** 추가 (New: Blue, Whale: Purple).
  - **설정 모달**: 룰렛 생성/수정 시 `Target Grade`를 선택할 수 있는 **Selector** 추가.
  - **검증**: `multi_replace`로 인한 JSX Syntax 오류(괄호 불일치) 수정 및 정상 렌더링 확인.
