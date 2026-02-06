문서 타입: DB Master SoT (Expanded)
버전: v2.1
작성일: 2026-02-06
상태: Master SoT (Database)

# Golden V2 Database Master Source of Truth (SoT)

---

## ## 1. 목적 (Purpose)
본 문서는 Golden V2 프로젝트의 데이터베이스 관련 모든 정책, 스키마, 운영 가이드 및 정합성 기준을 통합 관리하는 최상위 마스터 SOT입니다. 파편화된 DB 관련 문서를 하나로 결합하여 개발, 배포 및 운영의 단일 기준점을 제공합니다.

## ## 2. 범위 (Scope)
- **핵심 아키텍처**: 스냅샷, 마이그레이션 정책, FK 표준.
- **도메인 데이터**: 게임 엔진(다이스/룰렛), 경제(금고/인벤토리/상점), 유무선(CRM/세그먼트).
- **운영 데이터**: 어드민 메시징, 미션/스트릭, 시스템 설정 및 시드 데이터.

## ## 3. SoT 우선순위 및 공통 규칙

### 3.1 진실의 계층 (Truth Hierarchy)
1. **Physical DB Schema**: 실제 가동 중인 데이터베이스 (Alembic Migration).
2. **Master DB SoT**: 본 문서 (`v2_db_sot_master_ko.md`).
3. **Domain Spec Documents**: 도메인별 상세 설계 문서.

### 3.2 공통 데이터 규칙
- **타임존**: 모든 `DateTime` 필드는 UTC 출력을 기본으로 하되, 비즈니스 로직(초기화 등)은 **09:00 KST**를 기준으로 함.
- **식별자 (ID)**: 내부 연동은 `INT` PK를 사용하나, 외부 및 API 노출 시 `UUID` 또는 `cc_id` 사용 권장.
- **삭제 정책 (Soft Delete)**: 로그 및 이력 데이터는 삭제하지 않으며, 필요 시 `is_deleted` 플래그 사용.

## ## 4. 도메인별 스키마 맵 (Top-level Map)

| 도메인 | 주요 테이블 그룹 | 설명 |
| :--- | :--- | :--- |
| **Game Engine** | `v2_dice_*`, `v2_roulette_*`, `v2_lottery_*` | 게임 설정, 확률, 플레이 로그 |
| **Economy** | `v2_exchange_log`, `v2_level_reward_table`, `vault_*` | 재화 변동, 레벨 보상, 금고 관리 |
| **User/CRM** | `v2_user_segment`, `hq_prospective_user` | 세그먼트 분류, 신규 유저 보호, 잠재유저 |
| **Messaging** | `v2_admin_message`, `v2_admin_message_inbox` | 운영 메시지 발송 및 유저 수신함 |
| **Retention** | `UserRetentionState`, `RetentionRoiLog` | 개입 상태 및 ROI 분석 (V1 테이블 공유) |

## ## 5. 테이블별 SoT 요약

### 5.1 게임 및 보상
- **v2_dice_config**: 다이스 티켓당 보상, 배수 설정.
- **v2_level_reward_table**: 레벨 1~20 필요 XP 및 보상 정의 (RewardType 표준 준수).
- **v2_exchange_log**: 조각(Fragment) -> 티켓(Ticket) 변환 이력.

### 5.2 운영 관리
- **v2_admin_message**: 관리자 발송 메시지 (ALL, USER, SEGMENT 타겟팅).
- **v2_admin_message_inbox**: 유저별 수신 메시지 읽음(is_read) 상태.

### 5.3 사용자 세그먼트
- **v2_user_segment**: `NEW`, `COMMON`, `VIP`, `WHALE`, `AT_RISK`, `WINNER` 분류 및 `pending_segment` 관리.

## ## 6. 무결성/성능 체크리스트 (DB)

### 6.1 무결성 제약조건 (Constraints)
- **Segment Check**: `v2_user_segment.segment` 필드는 DB 레벨에서 정해진 6개 키 값만 허용하도록 `CHECK` 제약조건 적용.
- **FK Deletion Standard**:
  - `v2_dice_log.user_id`, `v2_shop_order.user_id` 등 로그성 데이터는 유저 삭제 시 `ON DELETE SET NULL` 처리하여 통계 유지.

### 6.2 성능 최적화 (Indexing)
- **Composite Index**: `(user_id, created_at)` 등 유저별 최신 로그 조회 최적화.
- **Uniqueness**: `cc_id` 등 고유 식별자에는 반드시 `UNIQUE` 인덱스 부여.

## ## 7. 운영 정책: 스냅샷 재생성

### 7.1 베이스라인 마이그레이션
- **Snapshot ID**: `20260119_0904_3bc52f37e0c0_baseline_v2_snapshot`
- **관리**: 스냅샷 이전의 구형 히스토리는 `versions_archive/`에 보관.

### 7.2 프로덕션 시드 데이터 (Priority)
- **1순위 (Core)**: `v2_dice_config`, `v2_lottery_config`, `mission`, `admin_user_profile` (데이터 21건).
- **2순위 (Feature)**: `v2_roulette_config`, `v2_segment_rule` (데이터 54건).
- **3순위 (Optional)**: `app_ui_config`, `v2_admin_message` (데이터 15건).

## ## 8. 정합성 메모 (SoT 간 불일치 가능 지점)

- **V1/V2 혼용**: 리텐션(`UserRetentionState`) 및 미션(`mission`) 테이블은 현재 V1과 공유하고 있어, V2 이관 시 컬럼 변경 주의 필요.
- **Segment Naming**: `HIGH_ROLLER` (V1)와 `VIP/WHALE` (V2) 간의 매핑 로직(`20260204_segment_mapping_audit.md`) 확인 필수.
- **WINNER 세그먼트**: 현재 분류 로직은 존재하나, 구체적인 비즈니스 혜택 정책은 수립 전임.

## ## 9. 변경 이력
- v2.1 (2026-02-06): 사용자 요청에 따른 9개 섹션 구조화 및 상세 내용 확장 반영.
- v2.0 (2026-02-06): DB Master SoT 최초 통합본 생성.
- v1.0 (2026-01-19): 베이스라인 스냅샷 확정.

---
*본 문서는 Golden V2 DB 운영의 최종 진실 공급원입니다.*
