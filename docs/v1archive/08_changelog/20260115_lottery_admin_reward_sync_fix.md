# 개발 로그: 복권 어드민 보상 타입 전역 동기화 및 UI 개선

**날짜**: 2026-01-15
**담당**: Antigravity (AI Assistant)
**대상**: 복권 관리 페이지 및 보상 상수

## 📝 변경 배경
복권 페이지에서 상품 설정 시, 보상 타입(`reward_type`)이 백엔드 전역 동기화 시스템과 일치하지 않거나 수동 입력으로 인해 발생할 수 있는 휴먼 에러를 방지하고, 기존의 잘못된 설정을 관리자가 쉽게 식별하여 수정할 수 있도록 UI/UX를 개선함.

## 🛠️ 주요 변경 사항

### 1. 보상 타입 상수(REWARD_TYPES) 최신화
- **파일**: `src/admin/constants/rewardTypes.ts`
- **내용**:
  - 백엔드 `GameTokenType`과 1:1 매칭되는 표준 키 지원 (`ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`, `GOLD_KEY`, `DIAMOND_KEY`, `TRIAL_TOKEN`, `DIAMOND`)
  - 기프티콘 및 포인트/XP 타입 명시화.
  - 레거시 별칭(`TICKET_ROULETTE` 등)에 `[L]` 접두어를 추가하여 하위 호환성 유지 및 가독성 확보.

### 2. 복권 설정 페이지(LotteryConfigPage) UI 강화
- **파일**: `src/admin/pages/LotteryConfigPage.tsx`
- **기능**:
  - **오류 감지 로직**: DB에 저장된 보상 타입이 프론트엔드 정의(`REWARD_TYPES`)에 없을 경우, 드롭다운을 빨간색으로 점멸(pulse)시키며 "⚠️ 알 수 없음" 표시.
  - **수정 가이드**: "전역 동기화되지 않은 타입입니다. 수정이 필요합니다." 메시지를 노출하여 운영자의 즉각적인 조치 유도.
  - **UX 개선**: 드롭다운 아이콘 추가 및 `clsx`를 통한 상태별 스타일링 적용.

## ✅ 기대 효과
- **데이터 정합성**: 모든 복권 상품이 백엔드 보상 지급 로직(RewardService)과 완벽히 동기화된 키를 사용하도록 강제됨.
- **운영 편의성**: 복잡한 보상 체계 속에서 관리자가 실수로 잘못된 타입을 설정하는 것을 방지하고, 기존의 오류 설정을 한눈에 파악 가능.

---
> **참조 문서**:
> - `app/models/game_wallet.py` (GameTokenType 정의)
> - `app/services/reward_service.py` (보상 지급 로직)
