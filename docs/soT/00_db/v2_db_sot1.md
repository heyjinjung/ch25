문서 타입: DB Master SoT
버전: v2.0 (Integrated)
작성일: 2026-02-06
상태: Master SoT (Database)

# Golden V2 Database Master Source of Truth (SoT)

> [!IMPORTANT]
> 본 문서는 Golden V2 프로젝트의 데이터베이스 아키텍처, 프로덕션 시드 데이터, 도메인별 스키마 및 데이터 무결성 규칙을 통합 정의하는 마스터 SOT입니다. 

---

## 1. DB 배포 및 아키텍처 원칙

### 1.1 베이스라인 및 스냅샷
- **DB 이름**: `v2`
- **베이스라인**: `20260119_0904_3bc52f37e0c0_baseline_v2_snapshot`
- **무결성 규칙**: 유저 삭제 시에도 로그 보존을 위해 `v2_dice_log`, `v2_roulette_log`, `v2_lottery_log`, `v2_shop_order` 테이블의 `user_id` FK는 `ON DELETE SET NULL`을 표준으로 합니다.

### 1.2 프로덕션 시드 데이터 (Priority)
프로덕션 환경 구축 시 카테고리별 우선순위에 따라 시드 데이터를 배포합니다.
- **🔴 HIGH (즉시 필요)**: `v2_dice_config`, `v2_lottery_config`, `v2_lottery_prize`, `mission`, `admin_user_profile`.
- **🟡 MEDIUM (기능 완성)**: `v2_roulette_config`, `v2_roulette_segment`, `v2_segment_rule`.
- **🟢 LOW (선택적)**: `app_ui_config`, `v2_admin_message`.

---

## 2. 도메인별 데이터 모델 명세

### 2.1 게임 엔진 및 보상 (Game & Reward)
- **Dice Engine (`v2_dice_config`, `v2_dice_log`)**: 티켓 타입별 보상 설정 및 게임 결과 저장.
- **Level Rewards (`v2_level_reward_table`)**: 레벨 1~20의 필요 XP 및 보상 정의.
- **Exchange Log (`v2_exchange_log`)**: 재료(Fragment) → 결과(Ticket) 변환 및 교환 이력 추적.

### 2.2 운영 및 메시징 (Ops & Messaging)
- **Admin Message (`v2_admin_message`)**: 발신 관리자, 타겟팅 타입(ALL, USER, SEGMENT 등), 채널별 메시지 템플릿.
- **Inbox (`v2_admin_message_inbox`)**: 유저별 메시지 수신 및 읽음 상태 추적.

### 2.3 세그먼트 및 리텐션 (Segment & Retention)
- **CRM 세그먼트 키**: `NEW`, `COMMON`, `VIP`, `WHALE`, `AT_RISK`, `WINNER`.
- **무결성**: `v2_user_segment.segment` 컬럼은 DB 레벨의 CHECK 제약조건으로 관리됨.
- **신규 유저 보호**: 가입 후 7일간 `NEW` 세그먼트 고정 후 `pending_segment`로 전환.

---

## 3. 핵심 열거형 (Canonical Enums)

| Enum | 대표 값 |
| :--- | :--- |
| **RewardType** | `VAULT`, `POINT`, `TICKET`, `GIFTICON_*`, `GOLD_KEY_FRAGMENT` |
| **TicketType** | `ROULETTE_TICKET`, `DICE_TICKET`, `LOTTERY_TICKET`, `GOLD_KEY_TICKET` |
| **GameResult** | `WIN`, `LOSE`, `DRAW` |

---

## 4. 데이터 맵핑 및 이력 관리

- **Golden Data**: 현재 리텐션 개입 로그 및 ROI 기록은 V1 테이블(`UserRetentionState`, `RetentionRoiLog`)을 임시 사용하여 호환성을 유지합니다.
- **Migration Path**: Local 개발 DB의 시드 데이터(90건)는 `alembic`을 통해 Phase 1~3로 나누어 프로덕션에 동기화합니다.

---
*본 문서는 Golden V2 DB 구조의 최종 기준점이며, 스키마 변경 시 Alembic 마이그레이션과 반드시 동기화되어야 합니다.*
