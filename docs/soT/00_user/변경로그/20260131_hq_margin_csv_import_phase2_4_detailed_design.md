# HQ 마진 CSV 임포트 Phase 2-4 고도화 설계서

**문서 타입**: Learned SoT / Detailed Design (Expanded)
**도메인**: Golden / Ops / CRM
**작성일**: 2026-01-31
**상태**: 상세 설계 완료 (Phase 2-4)

---

## 1. 개요 (Overview)

본 설계는 Phase 1의 CSV 임포트 방식을 기반으로, **운영 대시보드(Ops) 통합**, **미가입 잠재 VIP 유저 추적**, 그리고 **본사 충전 패턴 기반 골든아워 자동 추천** 기능을 추가하여 Golden 프로젝트의 비즈니스 로직을 본사 데이터와 완벽히 동기화하는 것을 목적으로 함.

### 🌟 골든 프로젝트 연동의 핵심 (The "Golden" Connection)
본사 마진 데이터는 단순한 통계가 아니라 **골든 프로젝트의 '지능적 리텐션'을 구동하는 연료**입니다.
1.  **세그먼트 정교화**: `Vault2Service`의 가입 적격성(`get_eligibility`)과 보상Multiplier가 현재 `UserSegment`에 의존하고 있어, 본사 마진 데이터 수입 즉시 유저별 혜택이 자동 최적화됨.
2.  **데이터 기반 골든아워**: 충전 패턴 분석(SQLite)을 통해 골든아워를 설정함으로써, 실제 충전이 가장 활발한 시간에 리텐션 이벤트를 배치하여 '유기적 성장'을 유도함.
3.  **잠재 VIP 선제 대응**: 가입 전 유저를 VIP군으로 분류해두고, 가입 즉시 `GoldenIntervention`의 최우선 케어 대상으로 등록함.

3.  **잠재 VIP 선제 대응**: 가입 전 유저를 VIP군으로 분류해두고, 가입 즉시 `GoldenIntervention`의 최우선 케어 대상으로 등록함.

---

## 2. 통합 데이터 매핑표 (HQ Margin -> V2 Native)

| HQ Field (CSV) | V2 Native 필드 / 모델 | 도메인 | 적용 로직 / 정책 |
| :--- | :--- | :--- | :--- |
| **이름 (아이디)** | `v2_user.cc_id` | 식별 | 매칭 최우선 키 (cc_id) |
| **닉네임** | `v2_user.nickname` | 식별 | 보조 매칭 키 (Case-Insensitive) |
| **누적 충전 금액** | `v2_user.total_charge_amount` | 입금/XP | **10만 원당 20 XP** 환산 (가입 시 소급 적용) |
| **총 운영 마진** | (분석 필드) | 세그먼트 | `VIP` (1M+), `WHALE` (5M+ 충전) 분류 기준 |
| **미접속 경과일** | (분석 필드) | 활성도 | **7일+ 접속 무 = DORMANT** 세그먼트 부여 |

---

## 3. 데이터 매칭 및 정합성 전략 (SOT Integrity)

### 2.1 닉네임 기반 매칭 고도화
본사 데이터와 V2User 간의 텔레그램 ID 공유가 불가능한 점을 고려하여, 닉네임 매칭을 수행하되 다음과 같은 논리적 방어 기제를 구축함.

1.  **매칭 순위**:
    - **1순위**: `V2User.cc_id == CSV['이름 (아이디)']` (가장 확실한 식별자)
    - **2순위**: `V2User.nickname == CSV['닉네임']` (사용자가 제공한 핵심 연동 키)
2.  **닉네임 중복 처리 정책**:
    - 만약 동일 닉네임을 가진 `V2User`가 여러 명일 경우:
        - `cc_id`가 일치하는 유저가 있다면 해당 유저 우선.
        - `cc_id`가 모두 불일치할 경우, **수동 확인 필요(Skipped)**로 분류하고 에러 로그에 "Duplicate nickname found ({nickname})" 기록. (잘못된 VIP 권한 부여 방지)
3.  **대소문자 및 공백 처리**: `strip()` 및 `lower()` 처리 후 비교하여 휴먼 에러 최소화.

### 2.2 V2 Native FK 정합성 (SOT 준수)
- 모든 세그먼트 저장은 `v2_user_segment` 테이블을 사용하며, 반드시 `v2_user.id` (V2 전용 PK)를 참조함.
- Legacy `user` 테이블과의 혼용을 방지하기 위해 `HQMarginImportService` 내에서 명시적으로 `V2User` 모델만 쿼리함.

---

## 3. 잠재 고객 관리 (Prospective User Lifecycle)

### 3.1 `hq_prospective_user` 테이블 상세
V2(텔레그램)에 가입하지 않은 본사 유저들의 데이터를 관리함.

```sql
CREATE TABLE hq_prospective_user (
    id SERIAL PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL INDEX,  -- 가입 시 매칭 키
    cc_id VARCHAR(100) UNIQUE,             -- 본사 식별자
    total_margin BIGINT DEFAULT 0,
    total_charge BIGINT DEFAULT 0,
    inactive_days INT,
    segment VARCHAR(50),                   -- 분류된 등급
    is_joined BOOLEAN DEFAULT FALSE,       -- 가입 여부 (V2User 생성 시 TRUE)
    last_imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nickname, cc_id)
);
```

### 3.2 가입 시 자동 매칭 프로세스
1.  **Trigger**: `AuthService.register_user` 또는 가입 완료 훅.
2.  **Logic**:
    - 가입한 유저의 닉네임으로 `hq_prospective_user` 조회 (단, `is_joined`가 FALSE인 것만).
    - 매칭 성공 시:
        - `V2UserSegment`에 해당 등급 즉시 부여.
        - `hq_prospective_user.is_joined = TRUE` 업데이트.
        - 감사 로그: "Prosepctive VIP joined: {nickname}" 기록.
    - **Exception**: 가입 닉네임이 `hq_prospective_user`와 중복될 경우, 최신 마진 데이터 소유자에게 혜택 부여.

---

## 4. Phase 2: 운영 대시보드 (Insights Dashboard)

### 4.1 카드 구성 (UI/UX)
- **HQ Margin 현황**:
    - `VIP Count (HQ)`: 본사 기준 VIP 인원
    - `Whale Count (HQ)`: 고액 충전 유저 수
    - `Churn Risk (HQ)`: 미접속 7일 이상 유저 수
- **잠재 고객 요약 (Prospective)**:
    - `"아직 가입하지 않은 잠재 VIP {count}명이 존재합니다."` 문구 노출 및 마케팅 유도 버튼.

### 4.2 Backend API (`/ops/hq-margin-stats`)
- `V2AdminAuditLog`를 조회하여 "가장 최근 임포트된 CSV 파일 정보"와 "성공/실패 건수"를 상시 제공.
- 세그먼트 분포를 JSON 형태로 반환하여 프론트엔드에서 그래프(Chart.js 등)로 시각화 가능하게 확장.

---

## 5. Phase 3: 골든아워 자동화 (SQLite Integration)

### 5.1 최적 시간대 추천 로직
본사 SQLite DB(`charging_data.db`)의 최근 30일 데이터를 분석함.

1.  **분석 쿼리**: 시간대별(`strftime('%H', date)`) 충전 빈도 및 합계 계산.
2.  **Impact Score**: (특정 시간대 충전액 / 최대 충전 시간대 충전액) * 100.
3.  **추천 전략**:
    - **가장 전성기(Prime Time)**: 충전액이 가장 높은 1시간 구간.
    - **유도 구간(Opportunity)**: 고마진 유저(`VIP`)들의 주 활동 시간대나, 충전은 활발하나 접속이 뜸한 시간대.

### 5.2 보안 및 성능
- SQLite 연결 시 `ReadOnly` 모드로 접근하여 본사 데이터 오염 방지.
- 분석 로직은 비용이 크므로 대시보드 접근 시마다 수행하지 않고, `Cache` 처리(예: 1시간)하거나 운영자 요청 시에만 수행.

---

## 6. Phase 4: 감사 및 안정성 (Audit & Reliability)

### 6.1 감사 로그 상세화
- CSV 임포트 시 `changes` 필드에 다음 정보를 상세히 기록함:
    - `matched_v2_users`: 기존 가입자 중 업데이트된 수
    - `new_prospective_users`: 미가입 유저로 새로 등록된 수
    - `duplicate_nicknames_skipped`: 닉네임 중복으로 무시된 데이터 리스트

### 6.2 에러 핸들링
- **CSV 포맷 오류**: 임포트 시작 전 `pandas`로 스키마를 검증하고, 필수 컬럼 없을 시 즉시 중단(`HTTP 400`).
- **DB 트랜잭션**: 대량 업데이트 시 `batch_size` 단위로 트랜잭션을 끊어 가용성 확보 (Default: 250건).

---

## 7. 운영 도메인 조회 매핑표 (Visibility Center)

운영자가 유저의 활동 및 보상을 추석(Tracking)할 수 있는 SOT 경로를 제공합니다.

| 도메인 | 확인 경로 (Admin UI) | 핵심 모델 (DB 원장) | 비고 |
| :--- | :--- | :--- | :--- |
| **인벤토리 로그** | 유저관리 > 인벤토리관리 > 내역로그 | `UserInventoryLedger` | 아이템 차감/지급 사유(`reason`) 추적 |
| **게임 참여/보상** | 게임관리 > 각 게임별 로그 | `V2DiceLog`, `V2RouletteLog` | 어떤 게임에서 어떤 보상을 얻었는지 확인 |
| **티켓/재화 변동** | 유저관리 > 자산관리 > 티켓로그 | `UserGameWalletLedger` | 게임 참여로 인한 소모 및 보상 연동 |
| **본사 마진 현황** | Ops Dashboard > HQ Margin 섹션 | `V2UserSegment` (VIP) | 임포트된 본사 데이터 기준 세그먼트 현황 |

---

## 8. 배포 및 운영 가이드

1.  **DB 마이그레이션**: `hq_prospective_user` 테이블 생성.
2.  **환경 변수**: `HQ_DB_PATH` (SQLite 절대 경로) 설정.
3.  **권한 설정**: `SUPER_ADMIN` 전용 HQ 데이터 열람 권한 확인.
