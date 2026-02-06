# 오픈 준비 - 운영 데이터 초기화 보고서

## 작업 일시
- **실행일**: 2026-02-03
- **실행자**: AI Agent (관리자 승인)

## 작업 내용

### 1. 로그인 페이지 정상화
- **변경 파일**: `src/v2/router/V2UserRoutes.tsx`
- **변경 내용**:
  - `/login` → `TelegramLoginPage` (프로덕션)
  - `/login/test` → `TelegramTestLoginPage` (테스트용)
  - `/login/dev` → `DevLoginPage` (개발용 레거시)

### 2. 데이터 초기화 결과

#### 🗑️ 삭제된 데이터

| 테이블 | 삭제 전 | 삭제 후 | 설명 |
|--------|---------|---------|------|
| `v2_user` | 8 | 0 | V2 유저 |
| `user` | 2 | 0 | V1 유저 |
| `v2_dice_log` | 40 | 0 | 주사위 로그 |
| `v2_roulette_log` | 32 | 0 | 룰렛 로그 |
| `v2_lottery_log` | 34 | 0 | 복권 로그 |
| `user_mission_progress` | 42 | 0 | 미션 진행 |
| `vault_ledger` | 13 | 0 | 금고 원장 |
| `user_inventory_item` | 7 | 0 | 인벤토리 |
| `user_game_wallet` | 73 | 0 | 게임 지갑 |
| `user_game_wallet_ledger` | 150 | 0 | 지갑 원장 |
| `v2_user_auth_event` | 83 | 0 | 인증 이벤트 |
| `external_ranking_data` | 2 | 0 | CC 입금 데이터 |
| `admin_audit_log` | - | 0 | 감사 로그 |

#### ✅ 유지된 설정 데이터

| 테이블 | 레코드 수 | 설명 |
|--------|-----------|------|
| `hq_prospective_user` | 178 | 마케팅 잠재 유저 (연결만 해제) |
| `v2_dice_config` | 1 | 주사위 설정 |
| `v2_roulette_config` | 7 | 룰렛 설정 |
| `v2_lottery_config` | 1 | 복권 설정 |
| `v2_lottery_prize` | 10 | 복권 상품 |
| `mission` | 8 | 미션 정의 |
| `v2_level_reward_table` | 20 | 레벨 보상표 |

### 3. 초기화 스크립트
- **위치**: `scripts/production_data_reset.sql`
- 향후 재초기화 필요시 사용 가능

## 검증 결과
- ✅ 모든 유저 데이터 삭제 완료
- ✅ 모든 로그 데이터 삭제 완료
- ✅ 설정 데이터 정상 유지
- ✅ AUTO_INCREMENT 리셋 완료

## 다음 단계
1. 프론트엔드 빌드 및 배포
2. 텔레그램 봇 연동 테스트
3. 실제 유저 가입 테스트
