# HQ Margin CSV Data Integration Master Spec

**문서 타입**: Master SOT (Integrated)
**도메인**: Golden / Ops / CRM
**상태**: ✅ Active

---

## 1. 개요 (Overview)

본사(HQ)의 충전/환전 마진 데이터를 Golden V2 시스템에 연동하여 데이터 기반의 정밀한 유저 케어를 실현합니다. 본 문서는 분산되어 있던 설계, 구현, 정책 문서를 하나로 통합한 최종 Source of Truth입니다.

## 2. 데이터 구조 (Data Structure)

### 2.1 CSV 컬럼 명세
| 컬럼 | 설명 | 필수 여부 |
|------|------|:---:|
| `이름 (아이디)` | **V2User 매칭 키** (cc_id) | 필수 |
| `닉네임` | **보조 매칭 키** (nickname) | 필수 |
| `누적 충전 금액` | 총 충전액 (원) | 필수 |
| `누적 환전 금액` | 총 환전액 (원) | 필수 |
| `총 운영 마진` | 충전 - 환전 (핵심 지표) | 필수 |
| `미접속 경과일` | 이탈 위험 판단 기준 | 필수 |
| `세그먼트` | 명시적 분류 (VIP/WHALE 등) | 선택 |

### 2.2 잠재 고객 테이블 (`hq_prospective_user`)
V2 가입 전 본사 데이터를 미리 확보하여 가입 즉시 혜택을 부여하기 위한 버퍼 테이블입니다.
- `cc_id`: 본사 식별자
- `nickname`: 가입 시 매칭 키
- `segment`: 자동 분류된 등급
- `is_joined`: 가입 여부 플래그

## 3. 핵심 자동화 로직 (Core Automation)

### 3.1 세그먼트 자동 분류 규칙 (Tier 1)
```python
def classify_segment(margin, inactive_days, charge_amount):
    if margin > 1_000_000: return 'VIP'
    if inactive_days > 7 and margin > 0: return 'AT_RISK'
    if charge_amount > 5_000_000: return 'WHALE'
    return 'COMMON'
```

### 3.2 가입 시 자동 매칭 (Auth Hook)
`AuthService.register_user` 성공 직후 `hq_prospective_user`와 대조하여 세그먼트를 즉시 부여합니다. 
- **VIP**: "Welcome Golden Hour" 즉시 발동 대상.

## 4. 운영 인터페이스 (Operation Interface)

### 4.1 데이터 임포트 방식
1. **CSV 업로드**: `/admin/ops/csv-import` (HQ_MARGIN 타입 선택)
2. **클립보드 붙여넣기**: `/admin/ops/paste-import` (대량 데이터 빠른 복사)

### 4.2 대시보드 연동 (`OpsDashboard`)
- 실시간 통계: VIP/WHALE/AT_RISK 유저 수 및 잠재 VIP 현황 노출.
- API: `GET /api/v2/admin/ops/hq-margin-stats`

## 5. 시스템 아키텍처 및 연동 파일

### 백엔드 (Python)
- `hq_margin_import_service.py`: CSV 파싱 및 분류 로직
- `hq_prospective_user.py`: 잠재 고객 모델
- `csv_import_routes.py`: API 엔드포인트

### 프론트엔드 (React)
- `CSVImportPage.tsx`: 파일 업로드 UI
- `PasteImportPage.tsx`: 클립보드 기반 UI
- `OpsDashboard.tsx`: 마진 현황 통계 카드

---
**관련 아카이브**: `docs/SOT/golden/Archive/` 내 12, 13, 20260131_* 문서 참조
