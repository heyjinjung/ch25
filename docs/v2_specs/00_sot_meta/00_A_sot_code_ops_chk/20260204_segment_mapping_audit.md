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
**버전**: v1.2 (2026-02-02)

```markdown
## 4. SoT: 세그먼트 분류 규칙
- 표준 세그먼트 키: `NEW`, `COMMON`, `VIP`, `WHALE`, `AT_RISK`
```

| 세그먼트 | SoT 정의 | 비고 |
|----------|----------|------|
| NEW | 가입 7일 이내 + 텔레그램 인증 + 입금 이력 없음 | ✅ |
| COMMON | 기본 세그먼트 | ✅ |
| VIP | 마진 100만원 이상 (7일 입금 300만+) | ✅ |
| WHALE | 누적 충전 500만원 이상 | ✅ |
| AT_RISK | 미접속 7일+ & 마진 양수 | ✅ |
| **WINNER** | ❌ **미정의** | 코드에만 존재 |
| **CHERRY_PICKER** | 📝 별도 설계문서만 | 미구현 |

### 2.2 DB 스키마 SoT 문서
**파일**: `docs/v2_specs/04_db/v2_db_user_segment_ko.md`  
**버전**: v1.2 (2026-02-02)

```markdown
| segment | VARCHAR(50) | NOT NULL | 세그먼트 키 |
> 기본값: `COMMON` (표준 세그먼트: NEW/COMMON/VIP/WHALE/AT_RISK)
```

### 2.3 CHERRY_PICKER 설계 문서 (초안) - 폐기 / 더이상 복잡해지는 거 싫음 
**파일**: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260204_cherry_picker_segment_design.md`  
**상태**: 초안 검토 중 - 폐기결정

---

## 4. 세그먼트 영향 도메인 매핑 (전수조사 완료)

### 4.1 서비스별 세그먼트 사용 현황 (전수조사 2026-02-04)

| 도메인 | 서비스 파일 | 세그먼트 시스템 | 사용 세그먼트 키 | 라인 |
|--------|-------------|----------------|-----------------|------|
| **금고(Vault)** | `vault_service.py` | V2SegmentService | NEW, AT_RISK | L559-576 |
| **금고(Vault)** | `vault2_service.py` | V2UserSegment | COMMON (기본값) | L246-254 |
| **입금매칭** | `unmatched_deposit_log_service.py` | V2UserSegment | 세그먼트 조회 | L303-305 |
| **입금HQ** | `hq_margin_import_service.py` | V2UserSegment | VIP,WHALE,WINNER,COMMON | L209-218, L521-528 |
| **룰렛게임** | `roulette_service.py` | UserSegment(V1) | VIP,WHALE,COMMON | L300-320 |
| **다이스게임** | `dice_service.py` | UserSegment(V1) | VIP,WHALE,COMMON | L255-290 |
| **이벤트** | `event_service.py` | EventConfig.target_segment | COMMON + CRM세그먼트 | L171-198 |
| **골든아워** | `golden_scheduler_service.py` | V2UserSegment | VIP,WHALE,AT_RISK | L50-52 |
| **리텐션** | `retention_intervention_service.py` | user_segment_tag | AT_RISK (✅ CRM 키 통합) | L124-125 |
| **게임분석** | `game_log_analytics_service.py` | V2UserSegment | VIP,WHALE,AT_RISK | L361-439 |
| **HQ통계** | `hq_margin_stats_service.py` | V2UserSegment | VIP,WHALE,AT_RISK | L31-48 |
| **메시지발송** | `admin_message_service.py` | V2UserSegment | 동적 타겟팅 | L47 |
| **잠재유저** | `prospect_linking_service.py` | V2UserSegment + hq_segment | VIP,WHALE,AT_RISK | L214-222, L336-343 |
| **세그먼트규칙** | `admin_segment_rule_service.py` | V2SegmentRule | NEW,VIP,AT_RISK | L12-121 |
| **미션** | `mission_service.py` | (category) | NEW_USER 카테고리 | L481-483 |
| **레벨/XP** | `level_xp_service.py` | ❌ 세그먼트 미사용 | - | - |
| **보상** | `reward_service.py` | ❌ 세그먼트 미사용 | - | - |

### 4.2 세그먼트별 비즈니스 로직 영향

| CRM 세그먼트 | 영향 받는 로직 | 세부 내용 |
|--------------|----------------|-----------|
| **VIP** | 프리미엄 룰렛 접근 | 골드/다이아몬드 룰렛 허용 (일 3회/1회 제한) |
| **VIP** | 골든아워 후보 선정 | `golden_scheduler_service.py:52` |
| **VIP** | 게임 배수 증가 | 골든아워 시 2.5배 (`dice_service.py:288-289`) |
| **VIP** | 금고 조건 완화 | `play_target=15, spend_target=5000` |
| **WHALE** | 프리미엄 룰렛 무제한 | 골드/다이아몬드 무제한 |
| **WHALE** | 골든아워 후보 선정 | `golden_scheduler_service.py:52` |
| **WHALE** | 게임 배수 증가 | 골든아워 시 2.5배 |
| **WHALE** | 금고 조건 면제 | `play_target=0, spend_target=0` (3백만+ 입금) |
| **AT_RISK** | 골든아워 후보 선정 | 이탈 위험자 재유입 타겟 |
| **AT_RISK** | 금고 조건 강화 | `play_target=100, spend_target=30000` |
| **AT_RISK** | 휴면 모니터링 | `game_log_analytics_service.py:439` |
| **NEW** | 신규 유저 미션 | `MissionCategory.NEW_USER` 전용 미션 |
| **NEW** | 금고 조건 강화 | `play_target=100, spend_target=30000` |
| **COMMON** | 기본 게임 배수 | 골든아워 시 2.0배 |
| **COMMON** | 프리미엄 룰렛 차단 | 접근 불가 |
| **WINNER** | ⚠️ **미적용** | 분류만 되고 비즈니스 로직 없음 |
| **CHERRY_PICKER** | ⚠️ **미구현** | 설계만 존재, 로직 없음 |

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
| **보상(Reward)** | | ❌ 세그먼트 무관 |
| **미션(Mission)** | ⚠️ NEW_USER 카테고리만 | 세그먼트 기반 미션 X |
| **레벨(Level)** | | ❌ 세그먼트 무관 |
| **게임(Game)** | ✅ 룰렛/다이스 배수/접근 | |
| **이벤트(Event)** | ✅ 타겟 세그먼트 필터 | |
| **리텐션** | ✅ 개입 후보 선정 | |
| **골든아워** | ✅ 후보 유저 선정 | |
| **어드민** | ✅ 통계/필터/편집 | |

---

## 5. DB 모델 현황

### 3.1 V2UserSegment 모델
**파일**: `app/v2/models/v2_user_segment.py`

```python
class V2UserSegment(Base):
    __tablename__ = "v2_user_segment"
    
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True)
    segment = Column(String(50), nullable=False, default="COMMON")  # ⚠️ Enum 미사용
    total_margin = Column(BigInteger, nullable=True, default=0)
    total_charge = Column(BigInteger, nullable=True, default=0)
    inactive_days = Column(Integer, nullable=True, default=0)
    is_synced_from_hq = Column(Boolean, nullable=False, default=False)
    last_synced_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
```

**문제점**:
- `segment` 컬럼에 CHECK 제약조건 없음
- Enum 타입 미사용 → 임의의 문자열 저장 가능
- DB 레벨 무결성 검증 불가

---

## 6. 백엔드 서비스 구현 현황

### 4.1 ALLOWED_SEGMENTS 정의 위치

| 파일 | ALLOWED_SEGMENTS 값 |
|------|---------------------|
| `app/v2/services/segment_service.py:86` | `{"NEW", "COMMON", "VIP", "WHALE", "AT_RISK", "WINNER"}` |
| `app/v2/api/admin/user_routes.py` | (PATCH API에서 segment_service 참조) |

### 4.2 세그먼트 분류 로직 (`_classify_segment`)
**파일**: `app/v2/services/hq_margin_import_service.py:406-458`

```python
@staticmethod
def _classify_segment(row: Dict) -> str:
    """
    우선순위:
    1. CSV에 명시적 세그먼트가 있으면 우선 사용
    2. 마진 음수 (회사 손해, 유저가 이김) → WINNER  # ⚠️ SoT 미정의
    3. 마진 100만원+ → VIP
    4. 미접속 7일+ & 마진 양수 → AT_RISK
    5. 충전 금액 500만원+ → WHALE
    6. 기본 → COMMON
    """
```

### 4.3 세그먼트 API 응답
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

### 5.1 UserListPage 세그먼트 옵션
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

### 6.1 WINNER 세그먼트 불일치

| 레이어 | 상태 | 증거 |
|--------|------|------|
| SoT 정책 문서 | ❌ 없음 | `v2_user_segment_policy_sot_ko.md`에 WINNER 언급 없음 |
| DB SoT 문서 | ❌ 없음 | `v2_db_user_segment_ko.md`에 WINNER 언급 없음 |
| DB 모델 | ⚠️ 허용 | `String(50)` 제약 없음 |
| 백엔드 서비스 | ✅ 구현 | `ALLOWED_SEGMENTS`, `_classify_segment` |
| 백엔드 API | ✅ 구현 | `segment_routes.py` 응답에 포함 |
| 프론트엔드 | ✅ 구현 | `UserListPage.tsx` 드롭다운에 포함 |

**결론**: 코드 선 구현, SoT 문서화 누락

### 6.2 CHERRY_PICKER 세그먼트 불일치

| 레이어 | 상태 | 증거 |
|--------|------|------|
| 설계 문서 | 📝 초안 | `20260204_cherry_picker_segment_design.md` |
| SoT 정책 문서 | ❌ 없음 | 미반영 |
| DB 모델 | ⚠️ 허용 | `String(50)` 제약 없음 |
| 백엔드 서비스 | ❌ 미구현 | `_classify_segment`에 로직 없음 |
| 프론트엔드 | ❌ 미구현 | 드롭다운에 없음 |

**결론**: 설계만 존재, 실제 구현 전무

---

## 9. 필수 조치 항목

### 9.1 SoT 문서 업데이트 필요
- [ ] `v2_user_segment_policy_sot_ko.md`에 WINNER 정의 추가
- [ ] WINNER 분류 기준 명시: `마진 < 0` (회사 손해, 유저가 이기는 상태)
- [ ] CHERRY_PICKER 구현 여부 결정 후 SoT 반영

### 9.2 DB 무결성 강화 필요
- [ ] `segment` 컬럼에 CHECK 제약조건 추가 (또는 Enum 타입 변환)
- [ ] Migration 파일 생성

### 9.3 코드 정합성
- [ ] `ALLOWED_SEGMENTS` 단일 정의 위치 확정
- [ ] 프론트/백엔드 Enum 동기화

### 9.4 아키텍처 정리 필요
- [ ] `V2User.hq_segment` vs `V2UserSegment.segment` 이중 저장 해소
- [ ] CRM 세그먼트 ↔ 리텐션 세그먼트 매핑 정책 수립

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

**🔴 문제**: 마진 음수 유저 61명이 WINNER가 아닌 COMMON으로 분류됨 (재분류 필요)

---

## 11. 변경 이력
- v1.0 (2026-02-04, GitHub Copilot): 현황 감사 문서 최초 작성
- v2.0 (2026-02-04, GitHub Copilot): 전체 세그먼트 시스템 13개 검증 완료, 영향 도메인 매핑 추가
- v3.0 (2026-02-04, GitHub Copilot): **전수조사 완료** - 모든 서비스 파일 grep 검증, 17개 서비스 세그먼트 사용 현황 확정

---

## 12. 전수조사 요약 (2026-02-04)

### 📊 도메인별 세그먼트 영향 현황

```
┌─────────────────────────────────────────────────────────────────────┐
│                    세그먼트 영향 도메인 맵                            │
├─────────────────────────────────────────────────────────────────────┤
│  금고(Vault)      ✅ NEW/AT_RISK/VIP/WHALE → 출금조건 차등           │
│  입금(Deposit)    ✅ HQ Import → 세그먼트 자동분류                   │
│  게임(Game)       ✅ VIP/WHALE → 프리미엄 룰렛 접근+배수             │
│  이벤트(Event)    ✅ target_segment → 이벤트 타겟팅                  │
│  골든아워         ✅ VIP/WHALE/AT_RISK → 후보선정                    │
│  리텐션           ✅ CHURN_RISK → 개입대상                          │
│  미션(Mission)    ⚠️ NEW_USER 카테고리만 (세그먼트 기반 X)            │
│  보상(Reward)     ❌ 세그먼트 미사용                                 │
│  레벨(Level)      ❌ 세그먼트 미사용                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 🔴 발견된 핵심 문제

1. **WINNER 세그먼트**: 코드에 분류 로직 있으나 **비즈니스 적용 로직 0개**
2. **CHERRY_PICKER**: 설계만 존재, 전체 미구현
3. **V1/V2 혼용**: 룰렛/다이스는 V1 `UserSegment`, 나머지는 V2 `V2UserSegment`
4. **리텐션 세그먼트 분리**: CRM(`VIP`) ↔ Retention(`HIGH_ROLLER`) 별도 체계
5. **보상/레벨 세그먼트 미적용**: 차등 보상 기회 미활용
