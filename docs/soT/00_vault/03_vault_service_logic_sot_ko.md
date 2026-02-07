문서 타입: SoT (서비스 로직 통합)
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/기획/QA
상태: Stable
도메인: VAULT

## 1. 목적
- 금고 서비스 로직 SoT를 단일 문서로 통합한다.
- 잔액 변경, 출금 조건, 상점 소비, 게임 보상 처리 규칙을 고정한다.
- 정책 위반 경로를 제거하고 운영 안전성을 확보한다.

## 2. 범위
- V2VaultService, ShopService, RewardService, VaultLedger 연동
- 혜택 중단 차단 정책
- 출금 조건 계산 및 전달 정규화

## 3. 최신 정책 적용 근거
- 2026-02-06: v2_sot_vault_ko.md
- 2026-02-04: VaultLedger 우회 수정, 보상 적립 경로 정합
- 2026-01-28: 잔액 동기화, 소비 누적
- 2026-01-27: 출금 조건 전달 정규화, 플레이 카운트 보강

## 4. 서비스 레이어 공통 원칙
- 모든 잔액 변경은 서비스 레이어에서 수행한다.
- VaultLedger 기록 없이 잔액을 직접 수정하지 않는다.
- deposit, withdraw, consume_locked_for_spend를 구분 사용한다.

## 5. deposit 로직
- 목적: 금고 적립
- 입력: user_id, amount, reason, ref_type
- 수행 순서:
  - user.vault_locked_balance 증가
  - VaultLedger 기록
  - 필요 시 보상, 레벨, 이벤트 트리거
- 제약:
  - benefits_suspended 상태는 적립 제한 정책에 따른다.

## 6. withdraw 로직
- 목적: 금고 출금
- 입력: user_id, amount, reason, ref_type
- 수행 순서:
  - 잔액 검증
  - user.vault_locked_balance 감소
  - VaultLedger 기록
  - vault_withdrawal_request 연동

## 7. consume_locked_for_spend 로직
- 목적: 상점 소비
- 수행 순서:
  - vault_locked_balance 차감
  - vault_spent_today, vault_spent_total 누적
  - 운영일 09:00 리셋 적용
  - VaultLedger ref_type=SHOP 기록
  - V2User 잔액 동기화

## 8. 혜택 중단 차단
- ShopService, GameService 진입 시 차단한다.
- 차단은 403으로 반환한다.
- UI 차단만으로 정책 충족이 아니다.

## 9. 출금 조건 계산
- get_vault_info는 출금 조건을 계산해 반환한다.
- 최근 3일 플레이는 v2 및 legacy 로그를 합산한다.
- 오늘 사용 금액은 vault_spent_today를 사용한다.
- 당일 실질 입금은 cc_deposit 순증 기준을 사용한다.

## 10. 플레이 카운트 보강
- VaultEarnEvent만으로 계산하지 않는다.
- v2_dice_log, v2_roulette_log, v2_lottery_log 포함
- legacy 로그도 포함
- 0 포인트 게임도 카운트 대상이다.

## 11. ID 정합성
- V2 user_id와 legacy user.id는 매핑한다.
- 출금 요청 시 ensure_legacy_user_id로 정합성을 확보한다.

## 12. 게임 보상 처리
- POINT, CC_POINT는 금고 적립으로 처리한다.
- 음수 보상은 금고 차감으로 처리한다.
- 금고 한도는 양수 적립에만 적용한다.

## 13. 금고 한도 적용
- INACTIVE 한도 30,000
- limit 초과 시 양수 적립만 차단
- 음수 차감은 항상 허용

## 14. VaultLedger 우회 금지
- 관리자 수동 조정도 VaultLedger 기록 필수
- reset, set_balance, update_balance 모두 기록
- 보상 적립 경로는 반드시 deposit 경로로 통일

## 15. RewardService 연동
- _grant_vault_locked는 deposit 경로로 통일
- 직접 잔액 변경 금지

## 16. 상점 연동
- 구매 성공 시 금고 잔액 UI 갱신 트리거 필요
- react-query invalidate 키 정합성 유지
- 상점 구매는 소비 메서드만 사용

## 17. 출금 조건 전달 정규화
- API 응답 필드는 정규화 처리
- snake/camel 혼재 시 fallback 적용
- UI 문구는 정책과 동일한 시간 기준 사용

## 18. 시간대 정책
- KST 기준, 09:00 리셋
- 로그 반환은 KST ISO 형식 권장
- Naive datetime 사용 금지

## 19. 에러 처리 기준
- BENEFITS_SUSPENDED: 제재 차단
- VAULT_INSUFFICIENT_FUNDS: 잔액 부족
- DEPOSIT_REQUIRED: 입금 필요

## 20. 테스트 기준
- vault_service 단위 테스트
- shop_inventory 로직 테스트
- withdrawal_logic 테스트
- 시나리오 테스트에서 User/V2User 동기화 검증

## 21. 운영 체크리스트
- VaultLedger 누락 경로 탐지
- benefits_suspended 차단 통합 테스트
- 상점 소비 후 daily_vault_spent 증가 확인
- 출금 조건 모달 표시 정합성 확인

## 22. 서비스 플로우 요약
### 22.1 입금 순증 반영
1) 외부 스냅샷 수신
2) delta 계산
3) deposit 호출
4) VaultLedger 기록
5) V2User 잔액 동기화

### 22.2 상점 구매
1) benefits_suspended 체크
2) 금고 잔액 검증
3) consume_locked_for_spend 호출
4) 주문 로그 생성
5) 보상 지급

### 22.3 출금 신청
1) 조건 계산
2) 금액 검증
3) withdraw 호출
4) vault_withdrawal_request 생성

## 23. 상태 전이 규칙
- 잔액은 항상 locked 단일 기준으로 변한다.
- 소비와 출금은 별도 경로로 기록한다.
- 원장 기록 누락이 발견되면 운영 이슈로 분류한다.

## 24. 음수 보상 처리
- 음수 금액은 항상 차감된다.
- limit 체크는 양수 적립에만 적용한다.
- 게임 패배 기록은 로그와 함께 저장한다.

## 25. 혜택 중단 우선순위
- 수동 제재가 자동 제재보다 우선한다.
- 제재 상태가 true인 경우 상점/게임 진입을 차단한다.
- 제재 상태가 false로 복원될 때만 구매 가능하다.

## 26. 응답 필드 정규화 정책
- snake/camel 혼재를 제거한다.
- 응답 필드와 타입 정의를 함께 갱신한다.
- 프론트는 fallback 로직을 유지한다.

## 27. 실패 케이스 처리
- 잔액 부족: 즉시 실패, 원장 기록 없음
- 조건 미충족: 출금 요청 생성하지 않음
- 혜택 중단: 403 반환
- 예외 발생: 트랜잭션 롤백

## 28. 동시성 및 트랜잭션
- 구매는 차감, 로그, 보상을 단일 트랜잭션으로 묶는다.
- 출금은 잔액 변경과 요청 생성의 원자성을 보장한다.
- 적립은 원장 기록과 잔액 변경을 단일 트랜잭션으로 묶는다.

## 29. 운영 검증 포인트
- VaultLedger 기록 누락 경로 탐지
- v2_user 동기화 누락 탐지
- vault_spent_today 리셋 기준 검증
- 출금 조건 계산값 검증

## 30. 변경 이력
- v1.1 (2026-02-07, GitHub Copilot): 서비스 로직 상세 확장
- v1.0 (2026-02-07, GitHub Copilot): 서비스 로직 SoT 통합
