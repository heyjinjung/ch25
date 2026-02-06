문서 타입: Implementation Plan + Execution Log
버전: v2.0
작성일: 2026-02-02
작성자: GitHub Copilot
대상: V2 운영/개발
상태: SoT

---

# 📋 HQ Margin → Analytics Dashboard 실시간 연동

## 1. 목적
대시보드 수익이 ₩0으로 표시되는 문제를 해결하기 위해, **HQ Margin CSV 데이터**를 우선 활용하여 실제 마진/충전 데이터를 표시한다.

## 2. 배경 및 문제 정의

### 2.1 기존 상태
| 컴포넌트 | 파일 | 상태 | 문제점 |
|---------|------|------|--------|
| HQ Margin CSV Import | `hq_margin_import_service.py` | ✅ 완료 | V2UserSegment에 저장됨 |
| V2UserSegment 모델 | `v2_user_segment.py` | ✅ 완료 | `total_margin`, `total_charge` 컬럼 존재 |
| GameLogAnalyticsService | `game_log_analytics_service.py` | ✅ 완료 | **V2GameLog 기반 (빈 테이블)** |
| 분석 대시보드 | `AnalyticsDashboard.tsx` | ✅ 완료 | **오늘 수익 = ₩0 (데이터 미연동)** |
| Ops Dashboard | `OpsDashboard.tsx` | ✅ 완료 | 기회 그룹 상세 미표시 |

### 2.2 문제 원인
1. **데이터 소스 불일치**: Dashboard가 V2GameLog를 쿼리 → 테이블 비어있음 → ₩0
2. **HQ Margin 미활용**: V2UserSegment에 `total_margin`, `total_charge` 있음 → 집계 안됨
3. **Risk/Opportunity 미연동**: `inactive_days` 기반 위험 유저, VIP/WHALE 기회 유저 리스트 미노출

---

## 3. 핵심 데이터 SoT

### 3.1 HQ Margin CSV 컬럼 → V2UserSegment 매핑
| CSV 컬럼 | DB 컬럼 | 의미 |
|---------|---------|------|
| `총 운영 마진` | `total_margin` | 충전 - 환전 (핵심 수익!) |
| `누적 충전 금액` | `total_charge` | 총 충전액 |
| `미접속 경과일` | `inactive_days` | 이탈 위험 판단 기준 |

### 3.2 세그먼트 분류 SoT
| 세그먼트 | 조건 | 골든 전략 |
|---------|------|----------|
| **VIP** | 마진 100만원+ | 고배율 골든아워, 우선 지원 |
| **WHALE** | 충전 500만원+ | VIP 전환 유도 |
| **AT_RISK** | 7일+ 미접속 + 마진 양수 | 자동 리워드, 복귀 캠페인 |
| **COMMON** | 기본 | 일반 운영 |

---

## 4. 구현 계획 (Tasks)

| Task | 우선순위 | 예상 시간 | 상태 |
|------|---------|----------|------|
| Task 1: HQ Margin Summary API | P0 | 30분 | ✅ 완료 |
| Task 2: Revenue Stats 통합 | P0 | 30분 | ✅ 완료 |
| Task 3: 주간 성장률 계산 | P1 | 20분 | ✅ 완료 |
| Task 4: 리텐션 분석 연동 | P1 | 20분 | ✅ 완료 |
| Task 5: ROI 연동 | P2 | 20분 | ✅ 기존 구현 |
| 검증 및 배포 | - | 30분 | 🔄 진행중 |

---

## 5. 실제 변경 내역 (PATCH)

### 5.1 백엔드

#### 1) `app/v2/services/game_log_analytics_service.py`
- `get_hq_margin_summary()` 메서드 추가 - V2UserSegment에서 total_margin/total_charge 집계
- `get_revenue_summary()` 수정 - HQ Margin 데이터 우선, Game Log 폴백
- `get_hq_weekly_growth_rate()` 추가 - 활성 유저 비율 기반 성장률 추정

#### 2) `app/v2/schemas/v2_admin_ops.py`
- `RevenueStatsDto`에 필드 추가:
  - `total_charge`: 총 충전액
  - `data_source`: 데이터 출처 ("HQ_MARGIN" | "GAME_LOG")

#### 3) `app/v2/api/admin/ops_routes.py`
- `RevenueStatsDto` 생성 시 `total_charge`, `data_source` 매핑 추가

### 5.2 프론트엔드

#### 1) `src/v2/api/adminApi.ts`
- `RevenueStatsDto` 타입에 필드 추가:
  - `totalCharge: number`
  - `dataSource: "HQ_MARGIN" | "GAME_LOG"`

#### 2) `src/v2/admin/pages/ops/AnalyticsDashboard.tsx`
- 헤더에 데이터 소스 배지 표시 ("📊 HQ 마진 데이터" / "🎮 게임 로그")
- 오늘 수익 카드 하단에 `총 충전 ₩XXX,XXX` 표시

---

## 6. 데이터 흐름

```
┌──────────────────┐
│ HQ Margin CSV    │   Result (1).CSV (실제 마진 데이터)
│ 199 유저         │
└────────┬─────────┘
         │ Admin Upload / import
         ▼
┌──────────────────────────────────────────┐
│ V2UserSegment (DB)                       │
│ • total_margin    (총 마진)              │
│ • total_charge    (총 충전)              │
│ • inactive_days   (미접속일)             │
│ • segment         (VIP/WHALE/AT_RISK)    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ GameLogAnalyticsService                  │
│ • get_hq_margin_summary()    [신규]      │
│ • get_revenue_summary()      [수정]      │
│ • get_risk_users()           [기존]      │
│ • get_opportunity_users()    [기존]      │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ /api/v2/admin/ops/status                 │
│ • revenueStats: RevenueStatsDto          │
│ • riskUsers: List[DetailedRiskUserDto]   │
│ • opportunityUsers: List[...]            │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ AnalyticsDashboard.tsx                   │
│ • 오늘 수익: ₩XX,XXX,XXX (실데이터!)    │
│ • 오늘 지출: ₩XX,XXX,XXX               │
│ • 데이터 소스 배지 표시                  │
└──────────────────────────────────────────┘
```

---

## 7. 배포 명령

### 7.1 로컬 빌드 및 전송
```powershell
# 백엔드 이미지 빌드
docker compose build backend

# tar로 저장 (GitHub 100MB 제한 우회)
docker save ghcr.io/heyjinjung/xmas-backend:latest -o backend-latest.tar

# 프로덕션 서버로 전송
scp -i C:\Users\JAVIS\.ssh\id_ed25519_vultr backend-latest.tar root@149.28.135.147:/root/
```

### 7.2 프로덕션 서버 배포
```bash
# 이미지 로드 및 서비스 재시작
docker load -i /root/backend-latest.tar
cd /opt/ch25
docker compose up -d backend
```

---

## 8. 주의사항
- `backend-latest.tar`는 GitHub 100MB 제한으로 인해 Git에 포함 불가
- `.gitignore`에 `backend-latest.tar` 추가 필요
- 배포는 이미지 직접 전송 방식으로 수행

---

## 9. Out of Scope
- HQ Margin CSV Import 로직 수정 (이미 완료)
- V2UserSegment 모델 변경 (이미 완료)
- 신규 마이그레이션 (불필요)
- Game Log CSV 실시간 연동 (별도 태스크)

---

## 10. 변경 이력
- v1.0 (2026-02-02, GitHub Copilot): PATCH 단계 실행 내역 기록
- v2.0 (2026-02-02, GitHub Copilot): 계획서 + 실행 내역 통합 문서로 확장
