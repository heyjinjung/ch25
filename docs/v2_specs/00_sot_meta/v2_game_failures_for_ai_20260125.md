문서 타입: 문제 보고 (AI 수정을 위한 정리)
버전: v1.0
작성일: 2026-01-25
작성자: GitHub Copilot

# 🎯 V2 게임/어드민 장애 누적 기록 (2026-01-25)

## 1) 요약
- 어드민 레벨관리: 글로벌 설정(최대 레벨/XP) 입력 불안정 및 SoT 밖 보상 타입 혼재 의심.
- 어드민 금고: 강제조정 UI 부재.
- 어드민 드롭다운: 선택된 텍스트 색상이 검정색으로 나와 어두운 테마에서 가독성 저하.
- 어드민/컴포넌트: 회원관리 페이지 및 출금 조건 모달 등 일부 UI에서 한글 텍스트 깨짐 현상.
- 유저 레벨 보상: 보상 타입 SoT 불일치 및 reward_amount 미반영으로 지급 누락 가능.

## 2) 원인 가설 (확인 기반)
- 레벨 보상 테이블이 `reward_amount`를 갖고 있으나, XP 서비스에서 payload 기반으로만 지급 → 0 지급.
- 레벨 보상 타입이 레거시 문자열/SoT 외 문자열 혼재 → 지급 로직 미매칭.
- 금고 강제조정은 API/훅은 있으나 UI 연결 누락.

## 3) 수정 내역 (PATCH)
- BE: 레벨 보상 타입 정규화 + reward_amount 기반 지급 처리 + bundle payload 지원.
  - 파일: app/services/level_xp_service.py
- BE: 레벨 보상 타입 SoT 범위 검증 추가.
  - 파일: app/v2/api/admin/level_routes.py
- FE: 레벨 글로벌 설정 입력 검증 + SoT 밖 보상 타입 경고 UI.
  - 파일: src/v2/admin/pages/game/LevelConfigPage.tsx
- FE: 금고 강제조정 UI 추가 및 force-edit API 연결.
  - 파일: src/v2/admin/pages/economy/VaultControlPage.tsx
- FE: 미션 생성/수정 저장 UX 보강(로직키 중복 검증, 에러 표시).
  - 파일: src/v2/admin/pages/game/MissionManagerPage.tsx
- BE: 룰렛 status/play 티켓 타입 정규화 및 INVALID_CONFIG 상세 반환.
  - 파일: app/v2/api/routes.py
- BE: 룰렛 티켓 타입 대소문자 정규화.
  - 파일: app/v2/services/v2_roulette_game_service.py
- FE/BE: 주사위 확률 값 단위 불일치(0~1 vs 0~100) 보정.
  - 파일: src/v2/api/adminApi.ts
- FE: 드롭다운(Select) 선택 텍스트 색상 수정 (text-foreground 추가).
  - 파일: src/v2/admin/components/ui/select.tsx
- FE: 어드민 및 공통 컴포넌트 한글 인코딩/깨짐 문제 수정.
  - 파일: src/v2/admin/pages/users/UserListPage.tsx, src/v2/admin/pages/game/ModalControlPage.tsx, src/v2/components/vault/V2WithdrawalGuideModal.tsx
- FE: 상점/인벤토리 400 실패 사유(detail) 기반 사용자 안내 추가 및 인벤토리 바우처 타입만 사용 허용.
  - 파일: src/v2/pages/shop/ExchangePage.tsx, src/v2/pages/inventory/InventoryPage.tsx

## 4) 영향 범위
- 레벨 보상 지급 (유저)
- 어드민 레벨 보상 설정
- 어드민 금고 강제조정
- 유저 상점 구매/인벤토리 사용 UX

## 5) 검증 체크리스트 (수동)
- 어드민 → 레벨 관리 → 전체 설정 저장/반영 확인
- 어드민 → 레벨 보상 타입 SoT 밖 경고 표시 확인
- 어드민 → 금고 보유 유저 → 강제조정 모달 적용 확인
- 유저 → 레벨업 보상 지급(POINT/티켓/DIAMOND) 확인
- 어드민 → 미션 생성/수정 시 로직키 중복 경고 및 저장 정상 동작 확인
- 어드민 → 드롭다운 선택 시 텍스트 가독성 확인 (다크 테마 대응)
- 어드민 → 회원관리 및 출금 조건 모달 한글 텍스트 정상 출력 확인
- 유저 → 룰렛 status/play 호출 시 INVALID_TICKET_TYPE/CONFIG 상세 메시지 확인
- 어드민 → 주사위 설정 저장 시 422 재발 없음(확률 입력 0~100)
- 유저 → 상점 구매 실패 시 detail에 맞는 에러 메시지 표시(잔액 부족 등)
- 유저 → 인벤토리 비바우처 사용 시 차단 메시지 표시

## 6) 증거/테스트
- 요청에 따라 **터미널/자동 테스트 미실행**.
- 필요한 증거:
  - `SELECT DISTINCT reward_type FROM v2_level_reward_table;`
  - 유저 레벨업 이벤트 후 vault/game_wallet 변화 스냅샷
  - 상점 구매 400 detail: `INSUFFICIENT_BALANCE`, payload sku=`SOT_GOLD_KEY_FRAGMENT`
  - 인벤토리 사용 400 detail: `INVALID_VOUCHER_TYPE`

---
끝
