# HQ Margin 데이터 연동 상세 설계 - Phase 3: Prospective User 관리

**문서 타입**: Detailed Design / Learned SoT
**도메인**: CRM / User Acquisition
**작성일**: 2026-01-31
**상태**: 설계 완료

---

## 1. 목적 (Objective)

본사 데이터에는 고가치(VIP) 고객으로 분류되어 있으나, 아직 텔레그램(V2) 시스템에 가입하지 않은 유저들을 추적하고 관리하여 이들의 가입 시 즉각적인 혜택(Golden Hour, VIP 혜택)을 제공하기 위한 시스템을 구축함.

## 2. 데이터 모델링 (Data Modeling)

### 2.1 [NEW] `hq_prospective_user` 테이블
미가입 잠재 고객 정보를 저장하는 전용 테이블.

- **Primary Key**: `id` (Auto-increment)
- **Matching Key**: `nickname` (가입 시 연동을 위한 유일한 고리)
- **Identity**: `cc_id` (본사 고유 아이디)
- **Metrics**: `total_margin`, `total_charge`, `segment` (VIP, AT_RISK 등)
- **Status**: `is_joined` (V2 가입 시 TRUE로 전환)

---

## 3. 잠재 유저 식별 매핑표 (Matching Matrix)

본사 데이터와 V2 유저 간의 정합성 유지를 위한 매핑 기준입니다.

| HQ Field (CSV) | V2 Native 필드 | 모델 | 비고 |
| :--- | :--- | :--- | :--- |
| **이름 (아이디)** | `cc_id` | `V2User`, `HQProspectiveUser` | 유일 식별자 (1순위) |
| **닉네임** | `nickname` | `V2User`, `HQProspectiveUser` | 보조 매칭 (2순위, Case-Insensitive) |
| **총 운영 마진** | `segment` | `HQProspectiveUser` | VIP 분류용 |
| **누적 충전 금액** | `total_charge` | `HQProspectiveUser` | 가입 시 XP 소급 정산용 |

---

## 3. 기술 설계 및 구현 가이드 (Technical Fail-Safe Guide)

### 3.1 `HQMarginImportService` 내 매칭 로직
- **대상 파일**: [hq_margin_import_service.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/services/hq_margin_import_service.py)
- **알고리즘**:
  1. `V2User` 검색 (cc_id 또는 nickname).
  2. 일치 유저 없음 → `HQProspectiveUser` UPSERT (nickname 기반).
  3. **중요**: 닉네임 매칭 시 `strip().lower()` 처리하여 휴먼 에러 방지.
- **Batch Processing**: 100~250개 단위로 `db.flush()`를 수행하여 대량 임포트 시 메모리 과부하 방지.

### 3.2 닉네임 중복 방어 시스템
- **동명이인 이슈**: `V2User`에 동일 닉네임이 2명 이상 존재할 경우.
- **Fail-Safe**: 자동 매칭을 포기하고 `errors` 리스트에 "Ambiguous nickname {name}" 추가. (권한 오지급 원천 차단)

### 3.3 데이터 모델 최적화
- **색인(Index)**: `hq_prospective_user.nickname`에 반드시 Index 설정. (가입 시 조회 속도 확보)
- **상태 관리**: `is_joined` 불리언 필드를 통해 중복 혜택 지급 방지.

---

## 4. 자가 진단 체크리스트 (Self-Correction Checklist)

1.  **[UPSERT]** 기존 잠재 유저의 마진이 업데이트되지 않고 계속 새로 생성되는가? → **No.** 반드시 기존 닉네임 존재 시 `Update` 수행.
2.  **[Matching]** 닉네임 매칭 시 대소문자를 구분하고 있는가? → **No.** 대소문자 무시 매칭 수행.
3.  **[Audit]** 미가입자로 분류된 내역이 감사 로그에 남는가? → **Yes.** `skipped` 또는 `prospective_created` 필드에 기록.

---

## 5. 단계별 검증 절차 (Verification)

1.  **Duplicate Import Test**: 동일한 CSV를 두 번 업로드했을 때, `hq_prospective_user` 테이블의 행(Row) 수가 변하지 않고 데이터만 갱신되는지 확인.
2.  **Case Insensitive Test**: CSV에 `jimin`, DB에 `JIMIN`일 때 매칭되는지 확인.
3.  **Ambiguous Match Test**: DB에 `Happy`라는 닉네임이 두 명일 때, CSV의 `Happy` 데이터를 누구에게도 매칭하지 않고 스킵하는지 확인.
