# 2026-02-04 V1-V2 디커플링 및 레거시 정리 리포트

## 📌 개요
| 항목 | 내용 |
|---|---|
| 작업 일시 | 2026-02-04 17:36 KST |
| 작업 목적 | Pure V2 Native 전환을 위한 V1 의존성 제거 및 물리적 코드 이전 |
| 상태 | **Phase 1 & 2 완료** (진행 중) |

## 🛠️ 주요 리팩토링 내역

### 1. 데이터 모델 물리적 이전 (Phase 1)
V1 폴더(`app/models/`)에 의존하던 모델 정의를 V2 내부로 완전히 이전했습니다.
- **신규 경로**: `app/v2/models/core/`
- **조치 사항**:
    - `app/models/*.py` 파일 43개를 `app/v2/models/core/`로 이동.
    - `app/v2/models/__init__.py` 수정: `from app.models import ...`를 `from .core import ...`로 변경하여 외부 의존성 제거.
    - 모델 간 내부 참조(`from app.models.xxx`)를 `from app.v2.models.core.xxx`로 전수 수정.
    - `app/db/base.py` 수정: Alembic 및 DB 세션에서 V2 경로의 모델을 참조하도록 통합.

### 2. 스키마 기반 독립화 (Phase 2)
V2 API의 기초가 되는 Pydantic 베이스 모델 및 공유 스키마를 독립시켰습니다.
- **신규 베이스**: `app/v2/schemas/base.py` (`KstBaseModel` 및 타임존 직렬화 로직 내재화)
- **공유 스키마**: `app/v2/schemas/shared/`
    - `mission.py`, `dice.py`, `lottery.py`, `roulette.py`, `admin_user.py` 등 주요 DTO 이전.
- **참조 갱신**: `app/v2/` 내 모든 파일의 `from app.schemas` 임포트를 `from app.v2.schemas`로 자동 치환 (전수 검사 완료).

### 3. 한글 인코딩 무결성 확보 (Critical)
- **인코딩 이슈 해결**: PowerShell 복사/치환 과정에서 발생할 수 있는 ANSI 인코딩 깨짐 현상을 방지하기 위해 `UTF-8` 인코딩을 명시한 Python/PS 스크립트로 재작업.
- **결과**: `POINT=금고 적립` 등 한글 주석과 문자열이 100% 원본 그대로 유지됨을 확인.

## 📂 현재 디렉토리 구조 (주요 변경점)
```
app/
├── v2/
│   ├── models/
│   │   ├── core/           # (NEW) 이전된 V1 모델들
│   │   └── __init__.py     # (MOD) V2 네이티브 내보내기
│   ├── schemas/
│   │   ├── base.py         # (NEW) V2 전용 KST 베이스 모델
│   │   ├── shared/         # (NEW) 이전된 공유 스키마들
│   │   └── ...
│   └── ...
└── models/                 # (PENDING) 삭제 예정 (Legacy)
```

## 🚀 향후 계획 (Next Steps)
1. **Phase 3 (Utils & Services)**: `app.utils.timezone` 등 공통 유틸리티의 V2 이전 및 레거시 서비스 브릿지 제거.
2. **Phase 4 (Final Verification)**: 전역 검색을 통해 `app/v2` 내에 `from app.(models|services|schemas)` 흔적이 없는지 최종 확인.
3. **Phase 5 (The Big Purge)**: 레거시 폴더(`app/api`, `app/models`, `app/services`, `app/schemas`) 최종 삭제.

---
**💡 요약**: 이제 V2 시스템은 코어 데이터 모델과 스키마 명세를 스스로 소유하게 되었으며, 레거시 폴더가 삭제되어도 기능에 영향을 받지 않는 독립적인 구조를 갖추게 되었습니다.
