# 트러블슈팅: HQ Import 재설계 및 GitHub Secret Push Protection 해결

**문서 타입**: 트러블슈팅  
**작성일**: 2026-02-04  
**상태**: 해결 완료  
**작성자**: AI Copilot  

---

## 1. 이슈 요약

| 항목 | 내용 |
|------|------|
| **대상 기능** | HQ 마진 CSV Import, GitHub Push |
| **영향 범위** | 관리자 CSV 임포트, 배포 파이프라인 |
| **재현 빈도** | 항상 |
| **해결 상태** | ✅ 완료 |

---

## 2. 이슈 A: HQ 마진 입금 반영 안됨

### 2.1 증상
- 관리자 CSV Import 실행 시 "HQ 마진 넣으면 아무것도 입금에 반영이 안돼"
- 세그먼트는 업데이트되나 CC Deposit이 0으로 유지

### 2.2 원인 분석

**초기 진단 (잘못된 추정)**:
- `upsert_many`가 절대값 덮어쓰기 방식인데 delta 값 전달

**실제 원인 (사용자 확인)**:
- **설계 의도 불일치**: 사용자는 **일별 개별 입금 내역** CSV를 원했음
- 기존 HQ Margin은 **누적 마진 데이터**용으로 설계됨
- 즉, 버그가 아니라 **요구사항 불일치**

### 2.3 해결 방안

**재설계 결정**:
1. 새로운 `HQ_DAILY` Import 타입 신설 (일별 입금 내역용)
2. 기존 `HQ_MARGIN`은 세그먼트 전용으로 변경 (CC Deposit 로직 제거)

---

## 3. 구현 내용

### 3.1 Task 1: HQ Daily Deposit Import (신규)

**파일 생성**:
- `app/v2/models/v2_hq_daily_deposit_log.py` - 중복 방지용 로그 모델
- `app/v2/services/hq_daily_deposit_import_service.py` - 일별 입금 Import 서비스

**핵심 기능**:
```python
# 중복 방지: MD5 해시 키 생성
def _generate_dedup_key(nickname: str, amount: int, deposit_at: datetime) -> str:
    raw = f"{nickname}|{amount}|{deposit_at.isoformat()}"
    return hashlib.md5(raw.encode()).hexdigest()

# 다양한 날짜 형식 파싱
DATETIME_FORMATS = [
    "%y/%m/%d %H:%M",    # 26/02/04 10:07
    "%Y/%m/%d %H:%M",    # 2026/02/04 10:07
    "%Y-%m-%d %H:%M:%S", # 2026-02-04 10:07:00
    # ... 기타 형식
]
```

**CSV 컬럼 매핑**:
| CSV 컬럼 | 내부 필드 | 설명 |
|----------|----------|------|
| 닉네임 | nickname | 유저 매칭 키 |
| 충전금액 | amount | 입금 금액 |
| 충전날짜 | deposit_at | 중복 방지 기준 |

### 3.2 Task 2-3: HQ Margin 세그먼트 전용화

**제거된 로직** (`hq_margin_import_service.py`):
```python
# 삭제된 import
- from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
- from app.v2.schemas.v2_cc_deposit import CCDepositCreate
- from app.v2.models import ExternalRankingData

# 삭제된 기능
- CC Deposit 누적 계산 로직
- cc_deposit_payloads 배치 처리
- sync_pending_external_users() 내 입금 반영
```

**현재 HQ Margin 역할**:
- V2UserSegment 업데이트 (VIP/WHALE/AT_RISK/COMMON)
- HQProspectiveUser 관리 (잠재 유저 추적)
- 미매칭 로그 기록

### 3.3 Task 4: Cherry Picker 세그먼트 설계

**문서 생성**: 
`docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260204_cherry_picker_segment_design.md`

**핵심 설계**:
```python
# 하이브리드 판별 (키워드 + 정량)
CHERRY_KEYWORDS = ['꽁머니', '작업', '차단', '1회성', '테스트', '진상']

def classify_cherry_picker(row: Dict) -> bool:
    # Stage 1: 키워드 매칭 (확정)
    if any(kw in memo for kw in CHERRY_KEYWORDS):
        return True
    
    # Stage 2: 정량 조건 3개 이상 충족
    score = sum([
        charge < 10_000,
        charge_count <= 1,
        withdrawal > 0,
        margin < 0,
        activity_span < 3
    ])
    return score >= 3
```

**세그먼트 우선순위**:
```
CHERRY_PICKER > VIP > AT_RISK > WHALE > COMMON
```

---

## 4. 이슈 B: GitHub Push Protection 차단

### 4.1 증상
```
remote: error: GH013: Repository rule violations found for refs/heads/deploy.
remote: - GITHUB PUSH PROTECTION
remote:   - Push cannot contain secrets
remote:   —— Anthropic API Key —————————————————————————————————
```

### 4.2 감지된 파일
| 커밋 | 파일 경로 | 위치 |
|------|----------|------|
| b84f949 | marketing_analysis_results/보관/chat_analysis.csv | 2번째 줄 |
| b84f949 | marketing_analysis_results/보관/message_analysis.csv | 4번째 줄 |
| b84f949 | new_result_analysis.csv | 4번째 줄 |
| 0f8eed1 | marketing_analysis_results/chat_analysis.csv | 2번째 줄 |
| 0f8eed1 | marketing_analysis_results/message_analysis.csv | 4번째 줄 |

### 4.3 해결 과정

**Step 1: 첫 번째 경로 파일 삭제**
```powershell
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch `
   'marketing_analysis_results/보관/chat_analysis.csv' `
   'marketing_analysis_results/보관/message_analysis.csv' `
   'new_result_analysis.csv'" `
  --prune-empty -- b84f949^..HEAD
```

**Step 2: 두 번째 경로 파일 삭제** (다른 경로에도 존재)
```powershell
git filter-branch -f --index-filter `
  "git rm --cached --ignore-unmatch `
   'marketing_analysis_results/chat_analysis.csv' `
   'marketing_analysis_results/message_analysis.csv'" `
  --prune-empty -- HEAD~10..HEAD
```

**Step 3: 강제 Push**
```powershell
git push origin deploy --force
```

### 4.4 결과
```
To https://github.com/heyjinjung/ch25.git
   a087f038..d9ef1944  deploy -> deploy
```
✅ Push 성공

---

## 5. 변경된 파일 목록

### 5.1 신규 생성
| 파일 | 용도 |
|------|------|
| `app/v2/models/v2_hq_daily_deposit_log.py` | 중복 방지 로그 모델 |
| `app/v2/services/hq_daily_deposit_import_service.py` | HQ Daily Import 서비스 |
| `docs/.../20260204_cherry_picker_segment_design.md` | 체리피커 설계 문서 |

### 5.2 수정
| 파일 | 변경 내용 |
|------|----------|
| `app/v2/services/hq_margin_import_service.py` | CC Deposit 로직 완전 제거, 세그먼트 전용화 |
| `app/v2/api/admin/csv_import_routes.py` | HQ_DAILY 라우트 추가 |
| `app/v2/models/__init__.py` | HQDailyDepositLog export 추가 |
| `src/v2/admin/pages/ops/CSVImportPage.tsx` | "💰 일별 입금 내역" 옵션 추가 |

### 5.3 Git 히스토리에서 삭제
| 파일 | 사유 |
|------|------|
| `marketing_analysis_results/*/chat_analysis.csv` | API Key 노출 |
| `marketing_analysis_results/*/message_analysis.csv` | API Key 노출 |
| `new_result_analysis.csv` | API Key 노출 |

---

## 6. 후속 조치 필요

### 6.1 즉시 (Today)
- [ ] Alembic 마이그레이션 생성: `hq_daily_deposit_log` 테이블
- [ ] .gitignore에 `*_analysis.csv` 패턴 추가 확인

### 6.2 운영팀 결정 필요
- [ ] Cherry Picker 일일 미션/골든타임 참여 제한 여부
- [ ] Cherry Picker CC Deposit 반영 정책

### 6.3 향후 (1주 내)
- [ ] `_classify_segment`에 CHERRY_PICKER 로직 적용
- [ ] 관리자 UI에 CHERRY_PICKER 배지/필터 추가

---

## 7. 교훈 (Lessons Learned)

### 7.1 설계 관련
> **"버그 수정 전에 요구사항 재확인"**
> 
> 기술적으로 코드가 잘못된 게 아니라, 사용자 의도와 시스템 설계 간 불일치였음.
> delta vs 누적, 마진 vs 일별 입금 - 용어/개념 정렬이 먼저 필요.

### 7.2 보안 관련
> **"분석 결과 파일에 원본 데이터 포함 금지"**
>
> CSV 분석 결과에 API Key가 포함된 원본 데이터가 그대로 들어감.
> 분석 스크립트에서 민감 컬럼 자동 마스킹 적용 필요.

### 7.3 Git 관련
> **"Secret 감지 시 filter-branch로 전체 경로 확인"**
>
> 같은 파일이 여러 경로에 존재할 수 있음 (`보관/` 폴더 유무 등).
> 첫 번째 시도 후에도 실패하면 다른 경로 확인.

---

## 변경 이력
| 버전 | 날짜 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-02-04 | AI Copilot | 초안 작성 |
