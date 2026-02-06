# 🏆 V2 Golden 프로젝트 종합 학습 요약 (Comprehensive Summary)

## 📋 1. 시스템 개요 (System Definition)
Golden V2는 단순 마케팅이 아닌 **"데이터 기반 유기적 리텐션 운영 시스템" (Data-Driven Organic Retention Operations System)**입니다.

### 핵심 컴포넌트
| 구분 | 설명 |
| :--- | :--- |
| **Golden Core** | 적응형 리텐션 엔진 (Adaptive Retention Engine) |
| **Golden Ops** | 관제 및 개입 시스템 (Operations & Intervention) |
| **Golden Data** | 증거 기반 의사결정 데이터 파이프라인 (Evidence-based Decision Pipeline) |
| **Loop Architecture** | 분석(Analyze) → 개입(Intervene) → 평가(Measure)의 순환 구조 |

---

## 📋 2. SoT 값 및 정책 정리

### 2.1 Redis Pub/Sub 채널 SoT
| 채널 | 목적 | Producer → Consumer |
| :--- | :--- | :--- |
| `ch25_events` | 원본 게임 이벤트 스트림 | Game → GoldenEventWorker |
| `golden:v2:events:game` | V2 게임 이벤트 스트림 | Game/Gateway → Analysis |
| `golden:v2:events:intervention` | 개입 이벤트 스트림 | Worker → API (User Push) |

### 2.2 Redis 키 SoT
| 키 패턴 | 타입 | 의미 |
| :--- | :--- | :--- |
| `golden:v2:user:{user_id}:loss_streak` | Int | 연속 패배 횟수 |
| `golden:v2:user:{user_id}:session_start_balance` | Int | 세션 시작 잔액 |
| `golden:v2:user:{user_id}:psych_state` | String | 심리 상태 (예: FRUSTRATED) |
| `golden:v2:cooldown:{trigger_id}:{user_id}` | TTL | 트리거별 쿨다운 |

### 2.3 개입(Intervention) 트리거 SoT
| Trigger ID | 조건 | 액션 | 쿨다운 |
| :--- | :--- | :--- | :--- |
| `TRG_LOSE_5` | 연속 5패 | Trigger_Pity_Win | 1h |
| `TRG_BAL_DROP_50` | 잔액 50% 급감 | Crisis_Intervention | 1h |
| `TRG_ZERO_BAL` | 잔액 0 | Offer_Zero_Ticket | 24h |

### 2.4 개입 상태(Status) SoT
| 상태 | 의미 |
| :--- | :--- |
| `PENDING_APPROVAL` | 승인 대기 (발송/지급 금지) |
| `APPROVED` | 운영자 승인 완료 |
| `REJECTED` | 운영자 거절 |
| `SENT` | 발송/지급 완료 |

### 2.5 골든아워(Golden Hour) SoT
| 구분 | SoT 위치 | 기본값 |
| :--- | :--- | :--- |
| 전역 활성화 | `golden_hour_config.enabled` | `false` |
| 수동제어 | `golden_hour_config.manual_override` | `AUTO` |
| 전역 배율 | `golden_hour_config.multiplier` | `2.0` |
| 시작 시각 | `start_time_kst` | `21:30:00` |
| 종료 시각 | `end_time_kst` | `22:30:00` |
| 주사위 적용 게이트 | `V2DiceConfig.enable_golden_hour` | `true` |
| 주사위 배율 | `V2DiceConfig.golden_hour_multiplier` | `2.0` |

---

## 📋 3. 백엔드 구현

### 3.1 핵심 모델
| 모델 | 테이블 | 용도 |
| :--- | :--- | :--- |
| `V2GoldenInterventionLog` | `v2_golden_intervention_log` | 개입 로그 기록 |
| `V2UserRetentionState` | `v2_user_retention_state` | 유저 리텐션 상태 |
| `V2RetentionRoiLog` | `v2_retention_roi_log` | ROI 분석 로그 |

### 3.2 핵심 서비스
| 서비스 | 파일 | 기능 |
| :--- | :--- | :--- |
| **GoldenV2EventService** | `golden_event_service.py` | Redis Pub/Sub 이벤트 발행 |
| **GoldenInterventionService** | `golden_intervention_service.py` | 개입 트리거 감지/실행 |
| **GoldenSchedulerService** | `golden_scheduler_service.py` | HQ 세그먼트 기반 스케줄러 |

### 3.3 워커
| 워커 | 파일 | 역할 |
| :--- | :--- | :--- |
| `golden_event_worker` | `golden_event_worker.py` | `ch25_events` → `golden:v2` 채널 브릿지 |
| `golden_intervention_worker` | `golden_intervention_worker.py` | 게임 이벤트 소비 → 개입 이벤트 발행 |

### 3.4 API 엔드포인트
| Method | Endpoint | 기능 |
| :--- | :--- | :--- |
| `POST` | `/api/v2/golden/intervention/resolve` | 개입 해결 처리 |
| `POST` | `/api/v2/golden/reengagement/queue` | 리인게이지먼트 큐 등록 |
| `GET` | `/api/v2/golden/status` | 골든 상태 조회 |
| `GET` | `/api/v2/golden/history` | 골든 이력 조회 |
| `WS` | `/api/v2/admin/ws/golden/events` | 실시간 이벤트 스트림 (Admin) |
| `POST` | `/api/v2/admin/crm/approve` | 복수 건 승인/거절 |

---

## 📋 4. 프론트엔드 구현

### 4.1 핵심 컴포넌트
| 컴포넌트 | 파일 | 기능 |
| :--- | :--- | :--- |
| **GoldenEventStream** | `GoldenEventStream.tsx` | 실시간 게임 이벤트 스트리밍 |
| **InterventionLogTable** | `InterventionLogTable.tsx` | 개입 로그 테이블 |
| **GoldenRealTimePage** | `GoldenRealTimePage.tsx` | 관리자 실시간 관제 페이지 |

### 4.2 API 클라이언트
| 함수 | 파일 | 기능 |
| :--- | :--- | :--- |
| `resolveV2Intervention` | `goldenApi.ts` | 개입 해결 요청 |
| `queueV2Reengagement` | `goldenApi.ts` | 리인게이지먼트 큐 등록 |

### 4.3 아키텍처 원칙
- **Feature-Based Structure**: `src/features/golden/`
- **Suspense-First**: `useSuspenseQuery` 기본 사용
- **TMA SDK 연동**: Haptic Feedback, Main/Back Button

---

## 📋 5. Ops Plan 액션 종류 (Kind)
| Kind | 설명 | 처리 방식 |
| :--- | :--- | :--- |
| `INVENTORY_GRANT_ALL` | 전체 유저 일괄 지급 | Async Worker |
| `TARGETED_ITEM_GRANT` | 타겟 리스트 지급 | Async Worker |
| `GOLDEN_HOUR` | 골든아워 제어 | DB Config 업데이트 |
| `TARGETLIST_BROADCAST` | 타겟 리스트 마킹 | Sync/Async |
| `MESSAGE_TEMPLATE` | 메시지 템플릿 발송 | Async Worker |

---

## 📋 6. 문서 SoT 위치
| 문서 | 경로 |
| :--- | :--- |
| 시스템 정의서 | `golden_v2_system_definition_ko.md` |
| 개입 로직 | `golden_v2_intervention_logic_ko.md` |
| 운영 로직 | `golden_v2_operational_logic_ko.md` |
| 골든아워 정책 | `v2_golden_hour_policy_sot_ko.md` |
| 실시간 아키텍처 | `02_golden_v2_realtime_architecture.md` |
| 프론트엔드 스펙 | `2026_01_28_golden_frontend_spec.md` |
| 경제체계 용어집 | `golden_v2_core_economy_glossary_ko.md` |



CSV 컬럼 구조
컬럼	설명	예시
번호	본사 내부 ID	37
소속 (추천인)	추천인 정보	지민전용01 (미추천)
이름 (아이디)	V2User 매칭 키	강동훈 (doh**)
닉네임	보조 매칭 키	영하19도
누적 충전 횟수	충전 횟수	2
누적 충전 금액	총 충전액 (원)	800,000
입금자명	입금자 이름	강동훈
신청 날짜	신청일시	25/11/13 06:49
누적 환전 횟수	환전 횟수	0
누적 환전 금액	총 환전액 (원)	0
총 운영 마진	충전 - 환전 (핵심!)	800,000
최근 충전일	마지막 충전	2025-11-13
최근 환전일	마지막 환전	-
미접속 경과일	이탈 위험 판단 기준	81
상태	현재 상태	충전완료
🎯 3가지 핵심 기능
기능 1: 자동 세그먼트 분류 (Auto Segment Classification)
CSV 업로드 시 총 운영 마진, 미접속 경과일, 누적 충전 금액을 기반으로 유저를 자동 분류합니다.

분류 로직 (SoT)
def _classify_segment(row: Dict) -> str:
    margin = parse_int(row.get('총 운영 마진', 0))        # 마진 금액
    inactive_days = parse_int(row.get('미접속 경과일', 0))  # 미접속 일수
    charge_amount = parse_int(row.get('누적 충전 금액', 0)) # 충전 금액

    if margin > 1_000_000:                    # 마진 100만원 초과
        return 'VIP'
    elif inactive_days > 7 and margin > 0:   # 7일 이상 미접속 + 마진 양수
        return 'AT_RISK'
    elif charge_amount > 5_000_000:          # 충전 500만원 초과
        return 'WHALE'
    else:
        return 'COMMON'

세그먼트별 골든 전략
세그먼트	조건	골든 전략
VIP	마진 100만원+	고배율 골든아워, 우선 지원, VIP 전용 케어
WHALE	충전 500만원+	VIP 전환 유도, 프리미엄 혜택
AT_RISK	7일+ 미접속 + 마진 양수	자동 리워드, 복귀 캠페인, 긴급 개입
COMMON	기본	일반 운영
적용 예시 (CSV 데이터 기준)
유저	마진	미접속일	충전액	자동분류
김민석 (ppoodd)	5,440,000	50	8,830,000	VIP (마진 100만+)
송윤서 (아사카)	3,000,000	2	21,540,000	VIP (마진 100만+)
김윤성 (허거덩)	-4,340,000	61	3,500,000	COMMON (마진 음수)
강원훈 (내가왔다)	60,000	4	180,000	COMMON (일반)
박관종 (정우성)	1,180,000	1	27,920,000	VIP (마진 100만+)

기능 2: V2User 매칭 및 잠재고객 관리 (Prospective User)
매칭 프로세스

CSV 데이터
    ↓
1. V2User 매칭 시도 (cc_id 또는 nickname)
    ↓
├── 매칭 성공 → V2UserSegment 업데이트/생성
│
└── 매칭 실패 → HQProspectiveUser 테이블에 저장 (잠재 고객)

매칭 우선순위
1순위: V2User.cc_id == CSV['이름 (아이디)']
2순위: V2User.nickname == CSV['닉네임'] (대소문자 무시)
매칭 실패: hq_prospective_user 테이블에 저장
잠재고객 테이블 (hq_prospective_user)

CREATE TABLE hq_prospective_user (
    id SERIAL PRIMARY KEY,
    cc_id VARCHAR(100) UNIQUE,        -- 본사 식별자
    nickname VARCHAR(100) INDEX,      -- 가입 시 매칭 키
    total_margin BIGINT,              -- 총 마진
    total_charge BIGINT,              -- 총 충전액
    inactive_days INT,                -- 미접속 일수
    segment VARCHAR(50),              -- 분류된 등급 (VIP/WHALE/AT_RISK/COMMON)
    is_joined BOOLEAN DEFAULT FALSE,  -- V2 가입 여부
    last_imported_at TIMESTAMP
);

가입 시 자동 혜택 부여
# AuthService.register_user() 직후 실행
def match_prospect_on_joined(user_id: int, nickname: str):
    prospect = db.query(HQProspectiveUser).filter(
        HQProspectiveUser.nickname == nickname.lower(),
        HQProspectiveUser.is_joined == False
    ).first()
    
    if prospect:
        # 1. V2UserSegment 즉시 부여
        V2UserSegment(user_id=user_id, segment=prospect.segment)
        
        # 2. 잠재고객 상태 업데이트
        prospect.is_joined = True
        
        # 3. VIP라면 Golden Intervention 우선 케어 대상 등록
        if prospect.segment == "VIP":
            trigger_golden_welcome(user_id)


기능 3: Ops Dashboard 연동 (실시간 통계)
API 엔드포인트
GET /api/v2/admin/ops/hq-margin-stats
응답 스키마
interface OpsHQMarginStatsDto {
  vip_count: number;              // VIP 세그먼트 유저 수
  whale_count: number;            // WHALE 세그먼트 유저 수
  at_risk_count: number;          // AT_RISK 세그먼트 유저 수
  prospective_vip_count: number;  // 미가입 잠재 VIP 수
  last_sync_at: string | null;    // 마지막 동기화 시각
}

Dashboard UI
┌─────────────────────────────────────────┐
│ 💰 본사 마진 현황                        │
├─────────────────────────────────────────┤
│ 마지막 동기화: 2026-01-31 14:30:00     │
│                                         │
│ ┌─────┬─────┬─────┬───────────┐       │
│ │ VIP │WHALE│AT_R │Prospective│       │
│ │ 45  │ 23  │ 12  │    15     │       │
│ └─────┴─────┴─────┴───────────┘       │
│                                         │
│ ⚠️ 아직 가입하지 않은 잠재 VIP 15명     │
└─────────────────────────────────────────┘
🔄 전체 데이터 흐름 (End-to-End)

┌──────────────────┐
│ 본사 시스템       │
│ (excel-calc)     │
│ SQLite DB        │
└────────┬─────────┘
         │ CSV 추출
         ▼
┌──────────────────┐
│ v2_golden_       │
│ targets.csv      │
└────────┬─────────┘
         │ Admin 업로드
         ▼
┌──────────────────────────────────────────┐
│ V2 Admin: CSVImportPage                  │
│ - 타입 선택: HQ_MARGIN                    │
│ - 파일 업로드                             │
└────────┬─────────────────────────────────┘
         │ API 호출
         ▼
┌──────────────────────────────────────────┐
│ HQMarginImportService                    │
│ 1. 인코딩 감지 (cp949/utf-8)             │
│ 2. 필수 컬럼 검증                         │
│ 3. V2User 매칭                           │
│ 4. 세그먼트 자동 분류                     │
│ 5. DB 업데이트 (V2UserSegment)           │
│ 6. 미매칭 → HQProspectiveUser 저장       │
│ 7. 감사 로그 기록                         │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────┐
│ V2UserSegment    │    │ HQProspective    │
│ (가입 유저)       │    │ User (잠재고객)  │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────────┐
│ Golden Project 연동                       │
│ - 골든아워 타겟팅                         │
│ - VIP 우선 개입 (Intervention)           │
│ - 가입 시 자동 세그먼트 부여              │
│ - 리텐션 캠페인 타겟                      │
└──────────────────────────────────────────┘


 구현 파일 위치
백엔드
파일	역할
hq_margin_import_service.py	CSV 파싱 및 세그먼트 업데이트
hq_margin_stats_service.py	Dashboard 통계 집계
csv_import_routes.py	API 라우팅
hq_prospective_user.py	잠재고객 모델
프론트엔드
파일	역할
CSVImportPage.tsx	CSV 업로드 UI
OpsDashboard.tsx	HQ Margin 현황 카드
문서 (Learned SoT)
파일	내용
20260131_hq_margin_csv_import_design.md	설계 문서
20260131_hq_margin_csv_import_implementation.md	구현 완료 문서
20260131_hq_margin_csv_import_phase3_prospective_users.md	잠재고객 관리
20260131_hq_margin_csv_import_phase4_golden_alignment.md	골든 프로젝트 연동