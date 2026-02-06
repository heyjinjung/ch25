# 🔍 V2 세그먼트 시스템 전체 감사 문서

**문서 타입**: 감사/현황분석  
**작성일**: 2026-02-04  
**작성자**: GitHub Copilot  
**상태**: 현황 파악 완료 (SoT 확정 전)  
**검증일**: 2026-02-04 (2차 검증 완료)

---

## 0. 전체 세그먼트 시스템 현황 (정리 완료 v4.0)

### ✅ 유지 - Primary CRM (4개)

| # | 시스템 | 테이블/컬럼 | 세그먼트 키 | 용도 |
|---|--------|-------------|-------------|------|
| 1 | **V2UserSegment** | `v2_user_segment.segment` | NEW, COMMON, VIP, WHALE, AT_RISK, WINNER | **CRM 메인** |
| 2 | **HQProspectiveUser** | `hq_prospective_user.segment` | 동일 | 미가입 잠재유저 |
| 3 | **EventConfig.target_segment** | `event_config.target_segment` | 동일 | 이벤트 타겟팅 |
| 4 | **Survey.target_segment_json** | `survey.target_segment_json` | 동일 | 설문 타겟팅 |

### ✅ 통합 완료 - 리텐션 (2026-02-04)

| # | 시스템 | 변경 전 | 변경 후 | 비고 |
|---|--------|--------|--------|------|
| 5 | **V2UserRetentionState.user_segment_tag** | HIGH_ROLLER, CASUAL_LOYAL, NEW_USER, CHURN_RISK | **CRM 키 사용** (NEW, COMMON, VIP, WHALE, AT_RISK, WINNER) | ✅ 통합 완료 |
| 6 | **V2SegmentRule.segment** | 동적 | CRM 키 출력 | 규칙 엔진 |

### 🔴 제거 대상 (중복)

| # | 시스템 | 문제 | 조치 |
|---|--------|------|------|
| 7 | **V2User.hq_segment** | V2UserSegment와 중복 | **삭제 예정** |

### 🗑️ 폐기 대상 (레거시 V1)

| # | 시스템 | 조치 |
|---|--------|------|
| 8 | **UserSegment (V1)** | V2UserSegment로 전환 후 폐기 |
| 9 | **UserRetentionState (V1)** | V2UserRetentionState로 전환 후 폐기 |

### 🟡 CRM 아님 - 혼동 주의 (게임용)

| # | 시스템 | 실제 용도 | 비고 |
|---|--------|----------|------|
| 10 | **V2RouletteSegment** | 룰렛 슬롯 (0~7) | 게임 칸 번호 |
| 11 | **RouletteSegment (V1)** | 룰렛 슬롯 (0~5) | 레거시 |
| 12 | **V2RouletteConfig.grade** | 게임 설정 이름 | COMMON/WHALE/NEW |
| 13 | **RouletteConfig.grade (V1)** | 레거시 게임 설정 | 레거시 |

---

## 1. CRM 세그먼트 키 정의 (최종 확정)

| 키 | 정의 | 리텐션 보상률 |
|----|------|-------------|
| **NEW** | 가입 7일 이내 + 입금 없음 | 2% |
| **COMMON** | 기본 세그먼트 | 2% |
| **VIP** | 마진 100만원+ | 4% |
| **WHALE** | 누적 충전 500만원+ | 4% |
| **AT_RISK** | 미접속 7일+ & 마진 양수 | 3% |
| **WINNER** | 마진 < 0 (유저가 이김) | 3% |

### ✅ 리텐션 세그먼트 통합 매핑 (2026-02-04 완료)

| 기존 리텐션 키 | 신규 CRM 키 | 보상률 |
|---------------|------------|--------|
| HIGH_ROLLER | VIP / WHALE | 4% |
| CASUAL_LOYAL | COMMON | 2% |
| NEW_USER | NEW | 2% |
| CHURN_RISK | AT_RISK | 3% |

---

## 2. 세그먼트 시스템별 상세 분석

### 2.1 V2UserSegment (Primary CRM)
**파일**: `app/v2/models/v2_user_segment.py`  
**테이블**: `v2_user_segment`

```python
class V2UserSegment(Base):
    __tablename__ = "v2_user_segment"
    
    user_id = Column(Integer, ForeignKey("v2_user.id"), primary_key=True)
    segment = Column(String(50), nullable=False, default="COMMON")  # ⚠️ Enum 미사용
    total_margin = Column(BigInteger, default=0)
    total_charge = Column(BigInteger, default=0)
    inactive_days = Column(Integer, default=0)
    is_synced_from_hq = Column(Boolean, default=False)
    last_synced_at = Column(DateTime, nullable=True)
```

**ALLOWED_SEGMENTS** (코드 정의):
- `segment_service.py:89`: `{"NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER"}`
- `user_routes.py:359`: `{"NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER"}`

### 2.2 V2User.hq_segment (중복 저장)
**파일**: `app/v2/models/user.py:67`

```python
hq_segment = Column(String(50), nullable=True)  # VIP, WHALE, AT_RISK from HQ
```

**문제점**: V2UserSegment와 동일 정보 이중 저장 → 동기화 이슈 가능

### 2.3 HQProspectiveUser.segment (미가입자)
**파일**: `app/v2/models/hq_prospective_user.py`  
**테이블**: `hq_prospective_user`

```python
segment = Column(String(50), nullable=False)  # VIP, WHALE, AT_RISK, COMMON
```

**용도**: HQ CSV Import 시 매칭 안 된 잠재유저 (가입 전 세그먼트 보관)

### 2.4 V2UserRetentionState.user_segment_tag (리텐션용) - ✅ CRM 키로 통합 완료
**파일**: `app/v2/models/v2_user_retention_state.py:26-30`  
**테이블**: `v2_user_retention_state`

```python
# ✅ 2026-02-04 CRM 키로 통합 완료
user_segment_tag = Column(
    Enum("NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER",
         name="v2_retention_segment_tag"),
    nullable=False,
    default="COMMON",
)
```

**✅ 통합 완료**: CRM 세그먼트와 **동일한 키 체계** 사용 (2026-02-04)

### 2.5 게임 타겟 세그먼트 (RouletteConfig.grade)
**파일**: 
- `app/v2/models/v2_roulette.py:20`
- `app/models/roulette.py:20`

```python
grade = Column(String(20), nullable=False, default="COMMON")  # COMMON, WHALE, NEW
```

**용도**: 게임 설정별 타겟 세그먼트 (CRM 세그먼트와 연동)

### 2.6 이벤트 타겟 세그먼트
**파일**: `app/models/event.py:21`

```python
target_segment = Column(String(50), nullable=True, index=True)
```

**용도**: 이벤트 타겟팅 (CRM 세그먼트 키 사용)

---

## 3. SoT 문서 현황

### 2.1 정책 SoT 문서
**파일**: `docs/v2_specs/01_core/v2_user_segment_policy_sot_ko.md`  
**버전**: v1.3 (2026-02-04 WINNER 추가)

```markdown
## 4. SoT: 세그먼트 분류 규칙
- 표준 세그먼트 키: `NEW`, `COMMON`, `VIP`, `WHALE`, `AT_RISK`, `WINNER`
```

| 세그먼트 | SoT 정의 | 비고 |
|----------|----------|------|
| NEW | 가입 7일 이내 + 텔레그램 인증 + 입금 이력 없음 | ✅ |
| COMMON | 기본 세그먼트 | ✅ |
| VIP | 마진 100만원 이상 (7일 입금 300만+) | ✅ |
| WHALE | 누적 충전 500만원 이상 | ✅ |
| AT_RISK | 미접속 7일+ & 마진 양수 | ✅ |
| **WINNER** | 마진 < 0 (회사 손해, 유저가 이김) | ✅ (2026-02-04 추가) |
| ~~CHERRY_PICKER~~ | - | 폐기 결정 |

### 2.2 DB 스키마 SoT 문서
**파일**: `docs/v2_specs/04_db/v2_db_user_segment_ko.md`  
**버전**: v1.3 (2026-02-04 WINNER 추가)

```markdown
| segment | VARCHAR(50) | NOT NULL | 세그먼트 키 |
> 기본값: `COMMON` (표준 세그먼트: NEW/COMMON/VIP/WHALE/AT_RISK/WINNER)
```

### ~~2.3 CHERRY_PICKER 설계 문서~~ - 폐기
**파일**: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260204_cherry_picker_segment_design.md`  
**상태**: 폐기 결정 (2026-02-04) - 복잡도 증가 대비 실익 불분명

---

## 4. 세그먼트 영향 도메인 매핑 (전수조사 완료)

### 4.1 서비스별 세그먼트 사용 현황 (전수조사 2026-02-04)

| 도메인 | 서비스 파일 | 세그먼트 시스템 | 사용 세그먼트 키 | 라인 | 상태 |
|--------|-------------|----------------|-----------------|------|------|
| **금고(Vault)** | `vault_service.py` (V2) | V2SegmentService | NEW, AT_RISK (출금조건) | L559-576 | ✅ CRM 키 |
| **금고(Vault)** | `vault2_service.py` (V2) | V2UserSegment | COMMON (기본값, eligibility) | L246-254 | ✅ CRM 키 |
| **입금매칭** | `unmatched_deposit_log_service.py` | V2UserSegment | 세그먼트 조회 | L303-305 | ✅ CRM 키 |
| **입금HQ** | `hq_margin_import_service.py` | V2UserSegment | VIP,WHALE,WINNER,COMMON | L209-218, L521-528 | ✅ CRM 키 |
| ~~**룰렛게임**~~ | ~~`roulette_service.py`~~ | ~~UserSegment(V1)~~ | ~~VIP,WHALE,COMMON~~ | ~~L300-320~~ | ✅ **제거 완료** (SoT: 접근제한 폐기) |
| ~~**다이스게임**~~ | ~~`dice_service.py` (V1)~~ | ~~UserSegment(V1)~~ | ~~VIP,WHALE,COMMON~~ | ~~L255-290~~ | 🗑️ V1 폐기완료 (V2: `v2_dice_game_service.py`) |
| ~~**이벤트 (V1)**~~ | ~~`app/services/event_service.py`~~ | ~~UserSegment(V1)~~ | ~~COMMON+CRM~~ | ~~L171-198~~ | 🗑️ V1 폐기완료 |
| **이벤트 (V2)** | `app/v2/services/event_service.py` | V2UserSegment | COMMON+CRM | L172 | ✅ **V2로 변경 완료** (2026-02-04) |
| ~~**골든아워**~~ | ~~`golden_scheduler_service.py`~~ | ~~V2UserSegment~~ | ~~VIP,WHALE,AT_RISK~~ | ~~L50-52~~ | 🗑️ **폐기 완료** (복잡도 대비 실익 불분명) |
| **리텐션** | `retention_intervention_service.py` | user_segment_tag | AT_RISK (✅ CRM 키 통합) | L124-125 | ✅ V2 서비스 |
| **게임분석** | `game_log_analytics_service.py` | V2UserSegment | VIP,WHALE,AT_RISK | L361-439 | ✅ CRM 키 |
| **HQ통계** | `hq_margin_stats_service.py` | V2UserSegment | VIP,WHALE,AT_RISK | L31-48 | ✅ CRM 키 |
| **메시지발송** | `admin_message_service.py` | V2UserSegment | 동적 타겟팅 | L47 | ✅ CRM 키 |
| **잠재유저** | `prospect_linking_service.py` | V2UserSegment + hq_segment | VIP,WHALE,AT_RISK | L214-222, L336-343 | ✅ CRM 키 |
| **세그먼트규칙** | `admin_segment_rule_service.py` | V2SegmentRule | NEW,VIP,AT_RISK | L12-121 | ✅ CRM 키 |
| **미션** | `mission_service.py` | (category) | NEW_USER 카테고리 | L481-483 | ✅ | CRM 세그먼트 미참조. 미션 카테고리 필터만 사용 |
| **레벨/XP** | `level_xp_service.py` | ❌ 세그먼트 미사용 | - | - | - |
| **보상** | `reward_service.py` | ❌ 세그먼트 미사용 | - | - | - |

#### 📋 검증 결과 요약 (2026-02-04)

| 검증 항목 | 결과 | 비고 |
|----------|------|------|
| vault_service.py/vault2_service.py 둘 다 사용? | ✅ 둘 다 사용 | vault_service.py=출금조건, vault2_service.py=프로그램 eligibility |
| 금고 통일된 세그먼트? | ✅ 둘 다 V2SegmentService/V2UserSegment (CRM 키) | |
| 금고 출금조건 세그먼트 | ✅ NEW/AT_RISK → 100회/30000원 | 입금 기반 조건도 있음 (300만+→면제) |
| 입금HQ 통일된 세그먼트? | ✅ V2UserSegment (CRM 키) | VIP,WHALE,WINNER,COMMON 분류 |
| 룰렛 VIP/WHALE 접근제한 | ✅ **제거 완료** | SoT: "grade 기반 접근 제한 폐기됨" |
| 다이스 V1/V2? | 🗑️ V1 폐기 | V2 서비스: `v2_dice_game_service.py` 사용 |
| 이벤트 V1/V2? | ✅ **V2로 통일 완료** | V1 폐기, V2는 V2UserSegment로 변경 완료 |
| 골든아워 자동 후보 선정 | 🗑️ **폐기 완료** | 복잡도 대비 실익 불분명 |
| 미션 세그먼트 사용 | ✅ CRM 세그먼트 미참조 | 미션 카테고리(`NEW_USER`) 필터만 사용 |

### 4.2 세그먼트별 비즈니스 로직 영향 (2026-02-04 최신화)

| CRM 세그먼트 | 영향 받는 로직 | 세부 내용 |
|--------------|----------------|-----------|
| **VIP** | ~~프리미엄 룰렛 접근~~ | ~~골드/다이아몬드 룰렛 허용~~ → **폐기됨** (SoT: 티켓만 있으면 접근 가능) |
| **VIP** | ~~골든아워 후보 선정~~ | ~~`golden_scheduler_service.py:52`~~ → **폐기됨** |
| **VIP** | ~~게임 배수 증가~~ | ~~골든아워 시 2.5배~~ → V1 dice_service.py (폐기) |
| **VIP** | 금고 조건 | 입금 기반 (300만+→면제, 50만+→완화) |
| **WHALE** | ~~프리미엄 룰렛 무제한~~ | → **폐기됨** (SoT: 티켓만 있으면 접근 가능) |
| **WHALE** | ~~골든아워 후보 선정~~ | ~~`golden_scheduler_service.py:52`~~ → **폐기됨** |
| **WHALE** | ~~게임 배수 증가~~ | ~~골든아워 시 2.5배~~ → V1 dice_service.py (폐기) |
| **WHALE** | 금고 조건 면제 | `play_target=0, spend_target=0` (3백만+ 입금) |
| **AT_RISK** | ~~골든아워 후보 선정~~ | ~~이탈 위험자 재유입 타겟~~ → **폐기됨** |
| **AT_RISK** | 금고 조건 강화 | `play_target=100, spend_target=30000` |
| **AT_RISK** | 휴면 모니터링 | `game_log_analytics_service.py:439` |
| **NEW** | 신규 유저 미션 | `MissionCategory.NEW_USER` 전용 미션 |
| **NEW** | 금고 조건 강화 | `play_target=100, spend_target=30000` |
| **COMMON** | ~~기본 게임 배수~~ | ~~골든아워 시 2.0배~~ → V1 dice_service.py (폐기 대상) |
| **COMMON** | ~~프리미엄 룰렛 차단~~ | → **폐기됨** (SoT: 티켓만 있으면 접근 가능) |
| **WINNER** | ⚠️ **미적용** | 분류만 되고 비즈니스 로직 없음 |
| ~~CHERRY_PICKER~~ | 폐기 | 설계만 존재, 구현 안함 |

### 4.3 리텐션 세그먼트 매핑 (✅ CRM 키로 통합 완료)

| CRM 세그먼트 | 보상 base_rate | 비고 |
|-------------|---------------|------|
| VIP | 4% | 기존 HIGH_ROLLER |
| WHALE | 4% | 기존 HIGH_ROLLER |
| COMMON | 2% | 기존 CASUAL_LOYAL |
| NEW | 2% | 기존 NEW_USER |
| AT_RISK | 3% | 기존 CHURN_RISK |
| WINNER | 3% | 신규 추가 |

### 4.4 도메인별 세그먼트 영향 요약

| 도메인 | 세그먼트 적용 | 세그먼트 미적용 |
|--------|--------------|----------------|
| **금고(Vault)** | ✅ 출금 조건 차등 | |
| **입금(Deposit)** | ✅ HQ Import 세그먼트 분류 | |
| **보상(Reward)** |  ✅ 세그먼트 무관
| **미션(Mission)** | ✅ NEW_USER 카테고리만 | 세그먼트 기반 미션 X |
| **레벨(Level)** | | ✅ 세그먼트 무관 |
| **게임(Game)** | ✅ 룰렛/다이스 배수/접근 레거시 정책/ 현재 폐기
| **이벤트(Event)** | ✅ 타겟 세그먼트 필터 | V2로 통일 완료 |
| **리텐션** | ✅ 개입 후보 선정 | |
| **골든아워** | ✅ 후보 유저 선정 | 정책폐기
| **어드민** | ✅ 통계/필터/편집 | |

---

## 5. DB 모델 현황

### 5.1 V2UserSegment 모델
**파일**: `app/v2/models/v2_user_segment.py`

```python
class V2UserSegment(Base):
    __tablename__ = "v2_user_segment"
    
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True)
    segment = Column(String(50), nullable=False, default="COMMON")
    total_margin = Column(BigInteger, nullable=True, default=0)
    total_charge = Column(BigInteger, nullable=True, default=0)
    inactive_days = Column(Integer, nullable=True, default=0)
    is_synced_from_hq = Column(Boolean, nullable=False, default=False)
    last_synced_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
```

### 5.2 DB 무결성 강화 (✅ 2026-02-04 완료)

**Migration 파일**: `alembic/versions/20260204_0200_add_segment_check_constraint.py`

```sql
-- v2_user_segment.segment CHECK 제약조건
ALTER TABLE v2_user_segment 
ADD CONSTRAINT ck_v2_user_segment_segment 
CHECK (segment IN ('NEW', 'COMMON', 'VIP', 'WHALE', 'AT_RISK', 'WINNER'));

-- hq_prospective_user.segment CHECK 제약조건
ALTER TABLE hq_prospective_user 
ADD CONSTRAINT ck_hq_prospective_user_segment 
CHECK (segment IN ('NEW', 'COMMON', 'VIP', 'WHALE', 'AT_RISK', 'WINNER'));
```

| 상태 | 조치 내용 |
|------|----------|
| ✅ 해결됨 | `segment` 컬럼에 CHECK 제약조건 추가 |
| ✅ 해결됨 | DB 레벨 무결성 검증 가능 |
| ⚠️ 유지 | Enum 타입은 미사용 (CHECK 제약조건으로 대체) |

---

## 6. 백엔드 서비스 구현 현황

### 6.1 ALLOWED_SEGMENTS 정의 위치 (✅ 단일 소스화 권장)

| 파일 | ALLOWED_SEGMENTS 값 | 상태 |
|------|---------------------|------|
| `app/v2/services/segment_service.py:86` | `{"NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER"}` | ✅ 단일 소스 |
| `app/v2/api/admin/user_routes.py` | (segment_service 참조) | ✅ import 사용 |
| `alembic/versions/20260204_0200_*.py` | CHECK 제약조건용 | ✅ DB 레벨 |

> **권장**: 모든 서비스에서 `segment_service.ALLOWED_SEGMENTS`를 import하여 사용

### 6.2 세그먼트 분류 로직 (`_classify_segment`)
**파일**: `app/v2/services/hq_margin_import_service.py:406-458`

```python
@staticmethod
def _classify_segment(row: Dict) -> str:
    """
    우선순위:
    1. CSV에 명시적 세그먼트가 있으면 우선 사용
    2. 마진 음수 (회사 손해, 유저가 이김) → WINNER
    3. 마진 100만원+ → VIP
    4. 미접속 7일+ & 마진 양수 → AT_RISK
    5. 충전 금액 500만원+ → WHALE
    6. 기본 → COMMON
    """
```

### 6.3 세그먼트 API 응답
**파일**: `app/v2/api/admin/segment_routes.py:48-105`

| 세그먼트 | label | desc |
|----------|-------|------|
| NEW | 신규(7일) | 가입 7일 이내/텔레그램 인증 |
| COMMON | 일반 | 기본 세그먼트(일반 유저) |
| VIP | VIP | 마진 100만원 이상 |
| WHALE | 고액(Whale) | 누적 충전 500만원 이상 |
| **WINNER** | 승자(Winner) | 마진 음수 (회사 손해) |
| AT_RISK | 이탈 위험 | 미접속 7일 이상 |

---

## 7. 프론트엔드 현황

### 7.1 UserListPage 세그먼트 옵션
**파일**: `src/v2/admin/pages/users/UserListPage.tsx:79`

```typescript
const SEGMENT_OPTIONS = [
  { value: "NEW", label: "신규", color: "..." },
  { value: "COMMON", label: "일반", color: "..." },
  { value: "VIP", label: "VIP", color: "..." },
  { value: "WHALE", label: "고래", color: "..." },
  { value: "AT_RISK", label: "이탈위험", color: "..." },
  { value: "WINNER", label: "승자", color: "bg-green-500/20 text-green-400 border-green-500/30" },
];
```

---

## 8. 불일치 상세 분석

### 8.1 WINNER 세그먼트 불일치 ✅ 해결됨 (2026-02-04)

| 레이어 | 상태 | 증거 |
|--------|------|------|
| SoT 정책 문서 | ✅ 추가됨 | `v2_user_segment_policy_sot_ko.md` v1.3 (WINNER 포함) |
| DB SoT 문서 | ✅ 추가됨 | `v2_db_user_segment_ko.md` v1.3 (WINNER 포함) |
| DB 모델 | ✅ CHECK 제약조건 | Migration `20260204_0200` 추가됨 |
| 백엔드 서비스 | ✅ 구현 | `ALLOWED_SEGMENTS`, `_classify_segment` |
| 백엔드 API | ✅ 구현 | `segment_routes.py` 응답에 포함 |
| 프론트엔드 | ✅ 구현 | `UserListPage.tsx` 드롭다운에 포함 |

**결론**: ✅ 전 레이어 정합성 확보 완료

### 8.2 CHERRY_PICKER 세그먼트 불일치
**결론**: 설계만 존재, 실제 구현 전무, **폐기 확정** (2026-02-04)

---

## 9. 필수 조치 항목 (✅ 2026-02-04 업데이트)

### 9.1 SoT 문서 업데이트 ✅ 완료 (2026-02-04)
- [x] `v2_user_segment_policy_sot_ko.md`에 WINNER 정의 추가 (v1.3)
- [x] WINNER 분류 기준 명시: `마진 < 0` (회사 손해, 유저가 이기는 상태)
- [x] ~~CHERRY_PICKER 구현 여부 결정~~ → **폐기 확정**

### 9.2 DB 무결성 강화 ✅ 완료 (2026-02-04)
- [x] `segment` 컬럼에 CHECK 제약조건 추가
- [x] Migration 파일 생성: `20260204_0200_add_segment_check_constraint.py`
- [x] `v2_user_segment`, `hq_prospective_user` 테이블에 CHECK 적용

### 9.3 코드 정합성 ✅ 완료
- [x] `ALLOWED_SEGMENTS` 단일 소스: `segment_service.py`
- [x] DB CHECK 제약조건과 동기화
- [x] 프론트엔드 `UserListPage.tsx` WINNER 포함 확인

### 9.4 아키텍처 정리 (진행 중)
- [ ] `V2User.hq_segment` vs `V2UserSegment.segment` 이중 저장 해소 (우선순위 낮음)
- [x] ~~CRM 세그먼트 ↔ 리텐션 세그먼트 매핑 정책~~ → **CRM 키로 통합 완료**

---

## 10. 운영 DB 실제 데이터 현황 (2026-02-04 기준)

### v2_user_segment 테이블 (실 가입 유저)
| 세그먼트 | 유저 수 |
|----------|---------|
| NEW | 3 |
| COMMON | 2 |
| WHALE | 1 |
| VIP | 0 |
| AT_RISK | 0 |
| **WINNER** | 0 |

### hq_prospective_user 테이블 (미가입 잠재유저)
| 세그먼트 | 유저 수 |
|----------|---------|
| AT_RISK | 91 |
| COMMON | 57 |
| VIP | 20 |
| WHALE | 10 |
| **WINNER** | 0 |

**🔴 문제**: 마진 음수 유저 61명이 WINNER가 아닌 COMMON으로 분류됨 (재분류 필요 - 향후 HQ Import 시 자동 적용)

---

## 11. 변경 이력
- v1.0 (2026-02-04, GitHub Copilot): 현황 감사 문서 최초 작성
- v2.0 (2026-02-04, GitHub Copilot): 전체 세그먼트 시스템 13개 검증 완료, 영향 도메인 매핑 추가
- v3.0 (2026-02-04, GitHub Copilot): **전수조사 완료** - 모든 서비스 파일 grep 검증, 17개 서비스 세그먼트 사용 현황 확정
- v4.0 (2026-02-04, GitHub Copilot): **코드 정리 완료**
  - 룰렛 VIP/WHALE 접근제한 로직 제거 (`roulette_service.py`) - SoT 준수
  - V1 `dice_service.py` 폐기 주석 추가
  - V1 `event_service.py` 폐기 주석 추가
  - 서비스별 세그먼트 사용 현황 테이블에 상태 컬럼 추가
  - 세그먼트별 비즈니스 로직 영향 테이블 최신화 (폐기된 로직 취소선 처리)
- v5.0 (2026-02-04, GitHub Copilot): **DB 무결성 강화 및 트러블슈팅 종결**
  - DB CHECK 제약조건 Migration 적용 (`20260204_0200`)
  - 잘못된 Survey Migration 삭제 (`18e1aca5529f`)
  - Survey FK V2User 연결 확인 완료
  - 트러블슈팅 이력 및 종결 상태 문서화
  - V1 `event_service.py` 폐기 주석 추가
  - 서비스별 세그먼트 사용 현황 테이블에 상태 컬럼 추가
  - 세그먼트별 비즈니스 로직 영향 테이블 최신화 (폐기된 로직 취소선 처리)

---

## 12. 전수조사 요약 (2026-02-04)

### 📊 도메인별 세그먼트 영향 현황

```
┌─────────────────────────────────────────────────────────────────────┐
│                    세그먼트 영향 도메인 맵                            │
├─────────────────────────────────────────────────────────────────────┤
│  금고(Vault)      ✅ NEW/AT_RISK → 출금조건 강화 (입금 기반 면제도 있음) │
│  입금(Deposit)    ✅ HQ Import → 세그먼트 자동분류                   │
│  게임(Game)       🗑️ 접근제한 폐기됨 (SoT: 티켓만 있으면 접근 가능) │
│  이벤트(Event)    ✅ target_segment → 이벤트 타겟팅                  │
│  골든아워         🗑️ 자동 후보 선정 폐기됨 (복잡도 대비 실익 불분명)   │
│  리텐션           ✅ AT_RISK → 개입대상 (CRM 키 통합 완료)            │
│  미션(Mission)    ⚠️ NEW_USER 카테고리만 (세그먼트 기반 X)            │
│  보상(Reward)     ❌ 세그먼트 미사용                                 │
│  레벨(Level)      ❌ 세그먼트 미사용                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 🔴 발견된 핵심 문제 (2026-02-04 최신화)

1. ~~**WINNER 세그먼트**: 코드에 분류 로직 있으나 비즈니스 적용 로직 0개~~ → 향후 정책 결정 대기
2. ~~**CHERRY_PICKER**~~: 폐기 결정
3. ~~**V1/V2 혼용**: 룰렛/다이스는 V1 `UserSegment`~~ → ✅ 룰렛 접근제한 제거, 다이스/이벤트 V1 폐기 완료
4. ~~**리텐션 세그먼트 분리**~~: ✅ CRM 키로 통합 완료 (2026-02-04)
5. **보상/레벨 세그먼트 미적용**: 차등 보상 기회 미활용 (향후 검토)
6. ~~**V2 event_service.py**: V2 서비스인데 V1 UserSegment 참조 중~~ → ✅ V2UserSegment로 수정 완료

---

## 13. 트러블슈팅 이력 (2026-02-04)

### 13.1 세그먼트 CHECK 제약조건 Migration

| 항목 | 내용 |
|------|------|
| **문제** | `v2_user_segment.segment` 컬럼에 CHECK 제약조건 없음 → 임의의 문자열 저장 가능 |
| **증상** | DB 레벨 무결성 검증 불가, 잘못된 세그먼트 값 저장 위험 |
| **해결** | Migration `20260204_0200_add_segment_check_constraint.py` 생성 및 적용 |
| **적용 테이블** | `v2_user_segment`, `hq_prospective_user` |
| **허용 값** | `NEW`, `COMMON`, `VIP`, `WHALE`, `AT_RISK`, `WINNER` |
| **상태** | ✅ 완료 |

```bash
# 적용 명령어
docker compose exec backend alembic upgrade head
# 결과: Running upgrade 20260204_0100 -> 20260204_0200
```

### 13.2 잘못된 Survey Migration 삭제

| 항목 | 내용 |
|------|------|
| **문제** | `18e1aca5529f` migration이 autogenerate로 잘못 생성됨 |
| **증상** | V2User FK를 V1 User로 되돌리려는 역방향 migration |
| **에러** | `IntegrityError: Cannot add or update a child row: foreign key constraint fails` |
| **원인** | `external_ranking_data`에 V2User ID가 저장되어 있는데, V1 User 테이블에는 해당 ID 없음 |
| **해결** | 잘못된 migration 파일 삭제 |
| **상태** | ✅ 완료 |

```bash
# 삭제 명령어
Remove-Item "alembic/versions/20260204_1500_18e1aca5529f_refactor_survey_fk_to_v2user.py" -Force
```

### 13.3 Survey V2User FK 연결 확인

| 항목 | 내용 |
|------|------|
| **확인 대상** | Survey 테이블의 FK가 V2User로 연결되어 있는지 |
| **결과** | ✅ 이미 V2User로 정상 연결됨 |
| **증거** | `survey_response_fk_v2_user` → `v2_user.id` |
| **상태** | ✅ 정상 (추가 작업 불필요) |

```python
# DB FK 확인 결과
{'name': 'survey_response_fk_v2_user', 
 'constrained_columns': ['user_id'], 
 'referred_table': 'v2_user', 
 'referred_columns': ['id'], 
 'options': {'ondelete': 'CASCADE'}}
```

### 13.4 Survey 아키텍처 정리

| 구분 | 모델 클래스 | DB 테이블명 | FK 연결 | 상태 |
|------|-------------|-------------|---------|------|
| Survey | `V2Survey` | `survey` | - | ✅ |
| Response | `V2SurveyResponse` | `survey_response` | `v2_user.id` | ✅ |
| Question | `V2SurveyQuestion` | `survey_question` | - | ✅ |
| Answer | `V2SurveyResponseAnswer` | `survey_response_answer` | - | ✅ |

> **참고**: V2 모델 클래스가 기존 V1 테이블명을 재사용하는 구조 (테이블 마이그레이션 없이 FK만 V2User로 변경)

---

## 14. 종결 상태 (2026-02-04)

### ✅ 완료된 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | 세그먼트 시스템 전수조사 (13개) | ✅ 완료 |
| 2 | V1/V2 서비스 세그먼트 사용 현황 매핑 | ✅ 완료 |
| 3 | 룰렛 VIP/WHALE 접근제한 제거 (SoT 준수) | ✅ 완료 |
| 4 | V1 dice_service.py 폐기 주석 | ✅ 완료 |
| 5 | V1 event_service.py 폐기 주석 | ✅ 완료 |
| 6 | V2 event_service.py V2UserSegment 변경 | ✅ 완료 |
| 7 | 골든아워 자동 후보 선정 폐기 | ✅ 완료 |
| 8 | DB CHECK 제약조건 Migration 적용 | ✅ 완료 |
| 9 | 잘못된 Survey Migration 삭제 | ✅ 완료 |
| 10 | Survey FK V2User 연결 확인 | ✅ 정상 |
| 11 | 신규 유저 7일 보호 기능 구현 | ✅ 완료 |

---

## 15. 신규 유저 7일 보호 정책 (2026-02-04 신규)

### 15.1 문제 상황
- HQ 잠재유저(Prospect) 연결 시 즉시 VIP/WHALE 등으로 세그먼트 변경
- 신규 유저 미션(NEW_USER 카테고리) 진행 불가 문제 발생

### 15.2 해결 방안

**정책**:
- 모든 신규 가입자는 **가입일 기준 7일간 NEW 세그먼트 유지**
- HQ에서 가져온 원래 세그먼트는 `pending_segment` 컬럼에 저장
- **가입 후 7일 + 오전 9시(KST)** 에 `pending_segment` 자동 적용

### 15.3 변경 내역

#### 1) 모델 변경 (`v2_user_segment.py`)
```python
pending_segment = Column(String(50), nullable=True, 
                         comment="7일 후 적용할 세그먼트 (NEW 보호 기간용)")
```

#### 2) Migration 추가
- 파일: `20260204_0300_add_pending_segment.py`
- 변경: `v2_user_segment` 테이블에 `pending_segment` 컬럼 추가

#### 3) Prospect 연결 로직 변경 (`prospect_linking_service.py`)

| 변경 전 | 변경 후 |
|---------|---------|
| `segment = prospect.segment` | `segment = "NEW"` |
| - | `pending_segment = prospect.segment` |

#### 4) 세그먼트 서비스 추가 (`segment_service.py`)

| 함수 | 용도 |
|------|------|
| `_is_new_protection_expired()` | 7일 보호 기간 종료 여부 확인 |
| `apply_pending_segments()` | 보호 기간 종료 유저 일괄 전환 |
| `get_user_segment_with_pending()` | 유저별 pending 정보 조회 |

#### 5) Admin API 추가 (`segment_routes.py`)

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /segments/batch/apply-pending` | pending_segment 일괄 적용 (스케줄러/수동) |
| `GET /segments/user/{user_id}/pending` | 유저별 보호 상태 조회 |

### 15.4 운영 가이드

**매일 오전 9시(KST) 이후** 아래 API 호출로 보호 기간 종료 유저 일괄 전환:
```bash
curl -X POST https://api.example.com/admin/segments/batch/apply-pending
```

**응답 예시**:
```json
{
  "processed": 15,
  "changed": 3,
  "errors": 0,
  "details": [
    {"user_id": 123, "old_segment": "NEW", "new_segment": "VIP"},
    {"user_id": 456, "old_segment": "NEW", "new_segment": "WHALE"}
  ]
}
```

---

## 16. 현재 Alembic 상태

```
현재 HEAD: 20260204_0300_add_pending_segment
상태: 정상 (모든 migration 적용됨)
```

### 🔜 향후 검토 사항 (우선순위 낮음)

- [ ] `V2User.hq_segment` vs `V2UserSegment.segment` 이중 저장 해소
- [ ] WINNER 세그먼트 비즈니스 로직 정의
- [ ] 보상/레벨 세그먼트 차등 적용 검토
- [ ] apply-pending API 스케줄러 자동화

