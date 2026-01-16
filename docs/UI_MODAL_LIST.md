# 프로젝트 UI 모달 리스트 (System Modals)

현재 프로젝트(`src/`)에 구현된 모든 모달 컴포넌트(`*Modal.tsx`)의 역할별 목록입니다.

## 1. 공통 및 시스템 (Common / System)
기본 UI 구성 요소 및 시스템 전반에서 사용되는 모달입니다.

| 파일 경로 | 컴포넌트명 | 설명 |
| :--- | :--- | :--- |
| `src/components/common/Modal.tsx` | `Modal` | 프로젝트 표준 기본 모달 (Base UI) |
| `src/components/common/InboxModal.tsx` | `InboxModal` | 우편함 / 알림 센터 |

## 2. 이벤트 및 인게이지먼트 (Event & Engagement)
유저의 참여를 유도하거나 리텐션을 관리하는 모달입니다.

| 파일 경로 | 컴포넌트명 | 설명 |
| :--- | :--- | :--- |
| `src/components/modal/AttendanceStreakModal.tsx` | `AttendanceStreakModal` | 매일 출석 체크 및 연속 출석(Streak) 보상 |
| `src/components/modal/NewUserWelcomeModal.tsx` | `NewUserWelcomeModal` | 신규 가입 유저 환영 메시지 및 초기 가이드 |
| `src/components/modal/StarterMissionsModal.tsx` | `StarterMissionsModal` | 초보자용 필수 미션 목록 안내 |
| `src/components/modal/TicketZeroRetentionModal.tsx` | `TicketZeroRetentionModal` | 티켓 소진 시 이탈 방지 / 충전 / 광고 유도 |
| `src/components/modal/LimitedOfferModal.tsx` | `LimitedOfferModal` | 한정판 상품 / 타임 세일 오퍼 |
| `src/components/modal/SeasonPassPromoModal.tsx` | `SeasonPassPromoModal` | 시즌 패스 구매 유도 및 혜택 안내 |
| `src/components/modal/BailoutModal.tsx` | `BailoutModal` | 파산/자산 부족 시 구제(Bailout) 지원 안내 |

## 3. 금고 및 재화 (Vault & Finance)
유저의 자산(포인트, 현금성 재화)을 관리하는 핵심 기능 모달입니다.

| 파일 경로 | 컴포넌트명 | 설명 |
| :--- | :--- | :--- |
| `src/components/vault/VaultModal.tsx` | `VaultModal` | 금고 메인 (입금, 출금 신청, 잠금 해제) |
| `src/components/vault/VaultAccrualModal.tsx` | `VaultAccrualModal` | 금고 이자 수익 / 적립 보상 알림 |
| `src/components/modal/WithdrawalConditionsModal.tsx` | `WithdrawalConditionsModal` | 출금 신청을 위한 조건 달성 현황 |
| `src/components/modal/WithdrawalProgressModal.tsx` | `WithdrawalProgressModal` | 출금 신청 후 처리 진행 상태 |

## 4. VIP 및 등급 (VIP & Level)
유저 등급 시스템 관련 모달입니다.

| 파일 경로 | 컴포넌트명 | 설명 |
| :--- | :--- | :--- |
| `src/components/modal/VipEligibilityModal.tsx` | `VipEligibilityModal` | VIP 승격 조건 및 자격 확인 |
| `src/components/modal/VipPromotionModal.tsx` | `VipPromotionModal` | 등급 상승(Promotion) 축하 및 혜택 안내 |

## 5. 게임 기능 (Game Generic)
특정 미니게임과 연동된 모달입니다.
*(참고: 룰렛/주사위 결과창 등 일부는 모달 파일이 아닌 페이지 내 팝업으로 구현됨)*

| 파일 경로 | 컴포넌트명 | 설명 |
| :--- | :--- | :--- |
| `src/components/lottery/LotteryCollectionModal.tsx` | `LotteryCollectionModal` | 복권 수집 현황 및 당첨 내역 |

## 6. 관리자 전용 (Admin Tools)
`src/admin/` 경로에 위치하하며, 운영자가 유저를 관리할 때 사용합니다.

| 파일 경로 | 컴포넌트명 | 설명 |
| :--- | :--- | :--- |
| `src/admin/components/common/ConfirmModal.tsx` | `ConfirmModal` | 관리자 작업(삭제/변경) 최종 확인 |
| `src/admin/components/UserGameTokenModal.tsx` | `UserGameTokenModal` | 유저 게임 토큰/열쇠 지급 및 회수 |
| `src/admin/components/UserInventoryModal.tsx` | `UserInventoryModal` | 유저 인벤토리 아이템 관리 |
| `src/admin/components/UserAssetDetailModal.tsx` | `UserAssetDetailModal` | 유저 상세 자산(재화) 조회 |
| `src/admin/components/UserMissionModal.tsx` | `UserMissionModal` | 유저 미션 상태 변경 및 강제 완료 |
| `src/admin/components/UserAuditLogModal.tsx` | `UserAuditLogModal` | 유저 활동 로그 및 변경 이력 조회 |
| `src/admin/components/UserIdentityHistoryModal.tsx` | `UserIdentityHistoryModal` | 닉네임/정보 변경 내역 확인 |
| `src/admin/components/UserImportModal.tsx` | `UserImportModal` | 엑셀/CSV를 통한 유저 대량 등록 |

---
*Last Updated: 2026-01-16*
