# Development Log (2026-01-14)

## 1. VIP Entry Production Fix (VIP 인식 및 연출 미동작 해결)
*   **Goal**: 어드민에서 VIP로 지정된 유저(`jm956` 등)에게 골드 테마 및 승급 모달이 반영되지 않는 문제 해결.
*   **Cause**: 백엔드 API(`auth/token`, `vault/status`)에서 유저의 `segment` 정보를 누락하여 프론트엔드가 유저의 등급 변화를 인지하지 못함.
*   **Implementation**:
    *   **Backend**: 
        *   `AuthUser` 및 `VaultStatusResponse` 스키마에 `segment` 필드 추가.
        *   `auth/token` 및 `vault/status` 라우터에서 `UserSegment` 테이블을 조회하여 세그먼트 정보를 응답에 포함.

### 8. 도파민 04: 리텐션 메커니즘 고도화 (2026-01-14)
- **Ticket-Zero 구제 (Bailout Modal)**: 티켓이 0일 때 금고 채우기 혹은 구제 지원금 지급 모달을 자동 트리거하여 '부활' 유도.
- **원픽 미션 (Today Card)**: 미션 페이지 최상단에 핵심 미션을 카드 형태로 배치하여 집중도 향상.
- **스트릭 트랙 (Renewal)**: 기존 7일 그리드 디자인을 폐기하고 가로형 보물상자 길(Path) 디자인으로 전면 개편.
- **애니메이션 최적화**: Lottie를 제외하고 Framer Motion을 활용하여 성능 부담 없는 하이엔드 인터랙션 구현.
    *   **Frontend**:
        *   `authStore.ts`에 `updateUser` 함수를 추가하여 유저 객체의 부분 업데이트(세그먼트 등)가 반응형으로 동작하도록 구현.
        *   `AppHeader.tsx`에서 금고 상태 체크 시점에 세그먼트 정보를 동기화하는 `useEffect` 로직 추가.
*   **Result**: 로그인 시점뿐만 아니라 플레이 도중 VIP로 승격되어도 실시간으로 골드 테마와 승급 모달이 적용됨.

## 2. VIP Promotion Modal UI 리뉴얼
*   **Goal**: 기존 모달이 텔레그램 휴대폰 화면에서 너무 크고, 디자인이 저렴해 보인다는 피드백 반영.
*   **Implementation**:
    *   **Layout**: `max-w-[340px]` 및 컴팩트한 패딩 적용으로 텔레그램 인앱 브라우저 뷰포트 최적화.
    *   **Aesthetics**: 
        *   밝은 오렌지 그라데이션 대신 **Deep Black & Matte Gold** 테마 적용.
        *   은은한 노이즈 패턴(`pattern_noise.png`) 및 메탈릭한 테두리 레이어 추가.
        *   버튼 사이즈 및 텍스트 가독성 개선 (그라데이션 텍스트 및 입체감 있는 그림자).
    *   **Animations**: 불필요한 큰 흔들림을 줄이고, 골드 글로우와 은은한 스파클링 효과로 고급화.

## 3. 안정성 및 검증
*   **Tests**: `tests/test_auth_token.py`를 업데이트하여 세그먼트 정보 반환 여부 검증 완료.
*   **VIP Logic**: `tests/test_vip_whale_external.py`를 통해 VIP 승격 로직 정상 동작 확인.
*   **Verification**: 4개 테스트 패스 (warnings 제외 안정적).

## 4. Documentation
*   **Updated**: `walkthrough.md`에 VIP UI 연출 관련 내용 및 이미지 링크 업데이트.

*   **Updated**: `task.md` 모든 항목 완료 처리.

## 5. Exchange Page UI 리뉴얼 (티켓 지갑 스타일 반영)
*   **Goal**: 교환소의 카드 디자인을 인벤토리의 '티켓 지갑' 섹션과 통일하고, 텔레그램 뷰포트에서의 가독성과 시각적 완성도 향상.
*   **Implementation**:
    *   **Layout**: 기존 3열 그리드에서 **2열 그리드(`grid-cols-2`)**로 변경하여 모바일에서의 터치 영역과 가시성 확보.
    *   **Style**: 
        *   `WalletCard`의 프리미엄 그래디언트 배경과 둥근 모서리(`rounded-[22px]`) 스타일 적용.
        *   아이콘을 어두운 박스(`bg-black/40`) 안에 배치하여 대비감 강화.
        *   가격을 인벤토리 스타일의 **대형 숫자(`text-2xl font-black`)**로 강조.
## 6. New User Welcome Modal Redesign (로티 제거 및 리뉴얼)
*   **Goal**: 신규 유저 웰컴 모달에서 로티 애니메이션을 제거하고, 카지노 프리미엄 감성으로 리뉴얼하여 효율성과 디자인 완성도 동시 확보.
*   **Implementation**:
    *   **Logic**: `lottie-react` 의존성 제거 및 `welcome_claim_success.json` 호출 로직 삭제.
    *   **UI/UX**: 
        *   에메랄드 글로우와 미세 노이즈 텍스처를 활용한 **'Matte Black & Emerald'** 테마 적용.
        *   보상 수령 전/후 레이아웃을 재구성하여 애니메이션 빈 자리를 시각적 밸런스로 채움.
        *   `Lucide-react` 아이콘과 `Framer Motion` 베이스의 경량 애니메이션으로 세련된 연출.
    *   **Optimization**: 텔레그램 뷰포트에 맞춘 컴팩트 사이즈(`max-w-[350px]`) 및 터치 최적화.

## 7. Vault Page Button Refinement (버튼 최적화)
*   **Goal**: 금고 페이지 버튼의 가독성을 높이고 프리미엄 감성 강화.
*   **Implementation**:
    *   **Dimensions**: `max-w-[280px]` 적용으로 컴팩트한 레이아웃.
    *   **Aesthetics**: 엠버/에메랄드 3단계 그라데이션 및 입체적 섀도우 적용.
    *   **Readability**: 아이콘 크기 확대(`w-6`), 텍스트 드롭 섀도우 및 폰트 두께 최적화.

## 9. Admin Vault History 500 Error Fix (긴급)
*   **Issue**: 회원관리 페이지에서 금고 내역 진입 시 500 Internal Server Error 발생.
*   **Cause**: `VaultEarnEventSchema`가 Pydantic V2부터 필수인 `model_config = ConfigDict(from_attributes=True)` 설정을 누락하여 ORM 객체를 직렬화하지 못함.
*   **Fix**: `app/schemas/vault.py`에 `from_attributes = True` 설정 추가하여 해결.

## 10. Vault Page Overhaul & Withdrawal Conditions Modal
*   **Goal**: 금고 출금 신청 시, 사용자가 달성해야 할 출금 조건을 명확하고 시각적으로 안내 (전역 동기화 요구사항 반영).
*   **Implementation**:
    *   **Backend**: `vault_service.py`의 `request_withdrawal` 로직 분석 완료.
        *   최소 출금액: 10,000원
        *   당일 입금 기록: 필수
        *   최소 플레이: 30회 (Roulette, Dice 등)
        *   최소 금고 사용: 10,000원 (Buy-in)
    *   **API**: `VaultStatusResponse`에 위 조건들의 진행 상황(Count, Target 등) 필드 추가.
    *   **Frontend Check Modal (`WithdrawalConditionsModal`)**:
        *   **Glassmorphism Design**: 배경 블러(`backdrop-blur`) 및 반투명 패널로 고급스러운 인게임 UI 톤 앤 매너 유지.
        *   **Conditions List**: 각 조건 별 진행도(Progress Bar) 및 완료 여부(Checkmark)를 직관적으로 표시.
    *   **Integration**: 금고 페이지(`VaultPageCompact`)에 '출금 조건 확인하기' 버튼 추가 및 모달 연동.

## 11. Telegram In-App Viewport Optimization (텔레그램 뷰포트 최적화)
*   **Goal**: 텔레그램 인앱 브라우저 환경에서 모달이 뷰포트를 넘쳐서 깨지는 문제 해결 및 상용 게임 앱 수준의 UX 제공.
*   **Issues Identified**:
    *   교환소 페이지 교환 버튼에서 텍스트와 가격 pill이 겹쳐 보임
    *   VIP 홍보 모달이 텔레그램 뷰포트 높이를 초과하여 하단 버튼이 잘림
    *   연속 스트릭 모달이 가로 너비를 넘쳐서 7일 아이콘이 깨짐
*   **Implementation**:
    *   **Exchange Page (`ExchangePage.tsx`)**:
        *   **Layout Fix**: 교환 버튼 내부를 `flex-col`(세로 방향)으로 변경
        *   **Spacing**: "교환" 텍스트와 가격 pill을 독립적인 라인에 배치하고 `gap-2`로 명확한 간격 확보
        *   **Padding**: `py-2.5`로 상하 여백 증가하여 터치 영역 개선
        *   **Style**: 가격 pill을 `px-2.5`로 확대하고 가운데 정렬
    *   **VIP Eligibility Modal (`VipEligibilityModal.tsx`)**:
        *   **Overflow Control**: 외부 컨테이너에 `overflow-y-auto` 추가
        *   **Height Limit**: 모달에 `max-h-[90vh]` + `my-auto` + `overflow-y-auto` 적용
        *   **Result**: 뷰포트 높이 제한으로 스크롤 가능하게 개선
    *   **Attendance Streak Modal (`AttendanceStreakModal.tsx`)**:
        *   **Layout Redesign**: 7일 아이콘 가로 1줄 배치 → 2열 그리드(4개 + 3개) 레이아웃으로 전면 개편
        *   **Progress Bar**: 상단에 그라데이션 진행률 바 추가 (amber→orange→amber + 글로우 효과)
        *   **Visual Upgrade**:
            *   완료된 날: 골드 그라데이션 배경(`from-amber-500 to-orange-600`) + 에메랄드 체크마크
            *   오늘/클레임 가능: 흰색 배경 + 펄스 애니메이션 + 강한 그림자(`shadow-[0_0_24px]`)
            *   Day 7 잭팟: 20x20 사이즈로 확대 + 별 아이콘 + "🎁 JACKPOT" 뱃지
        *   **Animation**: 활성 아이템에 scale + rotate 애니메이션 적용
        *   **Assets**: 기존 다이아몬드/기프트 아이콘 적극 활용
*   **Result**: 모든 모달이 텔레그램 인앱 뷰포트에 완벽히 수용되며, 상용 게임 앱 수준의 화려한 비주얼과 반응형 레이아웃 제공.

## 12. Admin Dashboard Deposit Details Integration (관리자 대시보드 입금 내역 통합)
*   **Goal**: 메인 대시보드 "금일 입금" 상세 내역에서 외부 랭킹 입금액이 누락되어 0건으로 표시되는 문제 해결 (전역 동기화).
*   **Issue**: 
    *   기존 `today_deposit` 메트릭은 `UserCashLedger`의 CHARGE/DEPOSIT만 조회
    *   `ExternalRankingData`의 입금액은 별도 메트릭(`external_ranking_deposit`)으로만 조회 가능
    *   관리자가 "금일 입금" 클릭 시 외부 랭킹 유저의 입금 내역이 표시되지 않음
*   **Implementation (`app/services/admin_dashboard_service.py`)**:
    *   **Unified Query**: `today_deposit` 메트릭에서 두 가지 소스 통합 조회
        1. `UserCashLedger`: 일반 입금 트랜잭션 (CHARGE/DEPOSIT)
        2. `ExternalRankingData`: 외부 랭킹 입금액 (오늘 업데이트된 레코드만)
    *   **Data Merge & Sort**:
        *   두 소스를 `created_at`/`updated_at` 기준으로 최신순 정렬
        *   상위 50개 레코드 반환
    *   **Tag Differentiation**:
        *   일반 입금: `CHARGE`, `DEPOSIT` 태그
        *   외부 랭킹: `EXTERNAL_RANKING` 태그로 명확히 구분
    *   **No Hardcoding**: 모든 데이터는 DB 쿼리 기반 동적 조회, `today_start_utc` 기준 자동 필터링
*   **Result**: 관리자 대시보드에서 "금일 입금" 클릭 시 일반 입금 + 외부 랭킹 입금액이 통합되어 표시되며, 실시간 데이터 동기화 보장.
