# 2026-01-16 개발 로그 - 룰렛 보상 규칙 개선 및 OPS Admin UX 설계

## 🚨 중요 알림 (Critical Update)
### **룰렛 금고 적립 규칙 변경 (Hardcoded Rule Removal)**
- **변경 내용**: 기존 `RouletteService` 및 `VaultService`에 하드코딩되어 있던 **"기본 승리 시 +200원 / 패배(5번 세그먼트) 시 -50원"** 적립 로직을 **삭제**했습니다.
- **현재 동작**: `POINT` 타입 보상이 아닌 경우(예: 티켓, XP)나 `꽝(LOSE)`인 경우, 금고 적립금은 **0원**이 됩니다.
- **후속 조치 (DB Cleanup Script)**:
  - 서버 배포 시, DB `VaultProgram` 설정에 남아있을 수 있는 구버전 규칙(+200/-50)을 제거하기 위해 아래 스크립트를 실행해야 합니다.
  - **실행 명령어**: `python scripts/remove_roulette_vault_config.py`
  - *이 스크립트는 `VaultProgram` 내 `ROULETTE` 관련 `game_earn_config`를 안전하게 제거하여 코드 기본값(0원)을 따르게 합니다.*

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
