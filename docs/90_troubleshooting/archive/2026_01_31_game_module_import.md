# 🚨 게임 API ModuleNotFoundError 트러블슈팅 (2026-01-31)

## 에러 개요

| 항목 | 내용 |
|------|------|
| **발생 시각** | 2026-01-31 02:11:09 UTC |
| **영향 범위** | 전체 게임 API (룰렛/주사위/복권) |
| **긴급도** | 🔴 높음 |
| **상태** | ✅ 수정완료, 배포중 |

## 에러 상세

### Sentry 캡처
```
ModuleNotFoundError: No module named 'app.v2.models.v2_user'

POST /api/v2/roulette/play HTTP/1.1" 500 Internal Server Error
POST /api/v2/dice/play HTTP/1.1" 500 Internal Server Error
POST /api/v2/lottery/play HTTP/1.1" 500 Internal Server Error
```

### Stack Trace
```python
File "/app/app/v2/services/v2_roulette_game_service.py", line 218, in play
    is_suspended, _ = V2VaultService.is_benefits_suspended(db, user_id)
File "/app/app/v2/services/vault_service.py", line 186, in is_benefits_suspended
    from app.v2.models.v2_user import V2User
ModuleNotFoundError: No module named 'app.v2.models.v2_user'
```

## 원인 분석

### 근본 원인
`vault_service.py`의 `is_benefits_suspended()` 메서드에서 잘못된 import 경로 사용

| 구분 | 값 |
|------|-----|
| **잘못된 경로** | `from app.v2.models.v2_user import V2User` |
| **올바른 경로** | `from app.v2.models.user import V2User` |

### 파일 구조 확인
```
app/v2/models/
├── __init__.py          # V2User를 .user에서 re-export
├── user.py              # V2User 클래스 정의 ← 실제 파일
├── v2_user_*.py         # 다른 v2_user 관련 모델들
└── ...
```

### 왜 로컬에서는 동작했나?
- `__init__.py`에서 `from .user import V2User`로 re-export
- 따라서 `from app.v2.models import V2User`는 동작
- 하지만 `from app.v2.models.v2_user import V2User`는 파일이 없어 실패

## 해결 방법

### 수정 내용
```python
# vault_service.py:186
# Before
from app.v2.models.v2_user import V2User

# After  
from app.v2.models.user import V2User
```

### 커밋
```
62158bd2 fix: ModuleNotFoundError v2_user import path (vault_service.py)
```

## 검증

### 로컬 검증
```bash
python -c "from app.v2.services.vault_service import V2VaultService; print('Import OK')"
# 출력: Import OK
```

### 배포 후 검증
```bash
# 헬스 체크
curl https://cc-jm.com/health
curl https://cc-jm.com/api/v2/health/db

# 게임 API 테스트 (인증 필요)
# POST /api/v2/roulette/play
# POST /api/v2/dice/play
# POST /api/v2/lottery/play
```

## 재발 방지

### 권장 사항
1. **import 규칙 통일**: `from app.v2.models import V2User` 형태 권장
2. **CI 테스트 강화**: import 검증 테스트 추가
3. **코드 리뷰**: 모듈 경로 변경 시 전체 사용처 확인

### 관련 파일
- [vault_service.py](app/v2/services/vault_service.py#L186)
- [app/v2/models/__init__.py](app/v2/models/__init__.py)
- [app/v2/models/user.py](app/v2/models/user.py)

## 변경 이력
- 2026-01-31 11:XX KST: 에러 발생 확인 (Sentry)
- 2026-01-31 11:XX KST: 원인 분석 완료
- 2026-01-31 11:XX KST: 수정 커밋 (62158bd2)
- 2026-01-31 11:XX KST: CI/CD 배포 진행 중
