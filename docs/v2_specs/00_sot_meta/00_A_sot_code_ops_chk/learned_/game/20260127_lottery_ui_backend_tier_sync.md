# Learned: 로터리 결과 UI-백엔드 티어 정합성 동기화 (2026-02-05)

## 1. 개요
로터리 게임 결과 모달(`LotteryResultModal.tsx`)의 사용자 경험을 개선하기 위해, 백엔드 당첨 결과에 따른 동적 티어 분기(FAIL, NORMAL, BIG_WIN)를 도입하고 백엔드 서비스 로직과의 정합성을 검증함.

## 2. 변경 내역

### 2.1 프론트엔드 (UI/UX)
- **파일**: `src/v2/components/game/LotteryResultModal.tsx`
- **주요 변경**:
    - **엄격한 타입 기반 티어 분기**:
        - `BIG_WIN` (대박): 금고에 적립되는 **모든 포인트(POINT)** 및 희귀 티켓(GOLD_KEY, DIAMOND).
            - 연출: **'Celestial Reveal'** (화려한 콘페티 + 테두리 Shine + 상품명 EncryptedText 효과).
        - `NORMAL` (일반 당첨): 기프티콘, 바우처, **일반 게임 티켓(1~5매)**, 퍼즐 및 기타 아이템.
            - 연출: **'Stable Victory'** (부드러운 글로우 + 차분한 탄력 모션).
        - `FAIL` (꽝): 보상 없음(`NONE`).
    - **한글화 및 아이콘 매핑**: 모든 UI 텍스트 한글화 및 보상 타입에 따른 아이콘 매핑.
    - **기존 오판 수정**: 금액/수량 기준(포인트 2000점 이상 등)을 제거하고 사용자 지침에 따른 **타입 우선** 정책으로 정렬.

### 2.2 백엔드 (Business Logic & Verification)
- **파일**: `app/v2/services/v2_lottery_game_service.py`
- **검증**:
    - `LotteryResultModal`의 `BIG_WIN` 기준이 백엔드 상금 테이블(`v2_lottery_prize`)의 실제 ID 및 데이터와 일치하는지 확인.
    - (예: ID 1번 5000 Point는 `BIG_WIN`으로 분류됨 확인)
- **테스트**: `scripts/test_lottery_branching.py` 시뮬레이션 환경 구축.

## 3. 검증 결과 (RCA & Evidence)
- **통계 (20회 시행)**:
    - **BIG_WIN**: 1회 (ID 1: 5000 Point)
    - **NORMAL**: 17회 (티켓, 깁콘, 퍼즐 등)
    - **FAIL**: 2회 (NONE)
- **발견된 이슈**: V2 유저와 레거시 유저 간의 DB 제약조건(FK) 미동기화 유저로 테스트 시 `IntegrityError` 발생 가능성 확인.
- **해결**: 동기화된 유저 ID(예: ID 8)를 식별하여 테스트 성공 및 정합성 증명.

## 4. 향후 권고 사항
- 상금 테이블 수정 시 `LotteryResultModal.tsx`의 `BIG_WIN` 임계값(`2000` 포인트 등)도 상수로 관리하여 동기화할 것.
- 새로운 보상 타입 추가 시 `iconMap`에 해당 아이콘을 등록할 것.
