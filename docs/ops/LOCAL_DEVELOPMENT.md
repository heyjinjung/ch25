# Local Development Guide - XMAS Event System

## 🚀 빠른 시작 가이드

### 1️⃣ 사전 준비

```powershell
# 버전 확인
python --version  # Python 3.11+
node --version    # Node.js 18+
```

---

## 🗄️ 데이터베이스 설정 (2가지 방법)

### 방법 A: Docker로 MySQL 실행 (권장)

```powershell
# MySQL 컨테이너 실행
docker run --name xmas-mysql `
  -e MYSQL_ROOT_PASSWORD=root `
  -e MYSQL_DATABASE=xmas_event_dev `
  -e MYSQL_USER=xmasuser `
  -e MYSQL_PASSWORD=xmaspass `
  -p 3306:3306 `
  -d mysql:8.0

# 실행 확인
docker ps
```

### 방법 B: 로컬 MySQL 설치

1. MySQL 8.0+ 설치
2. 데이터베이스 생성:
```sql
CREATE DATABASE xmas_event_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 🐍 백엔드 설정 및 실행

### 1. Python 가상환경 생성

```powershell
# 프로젝트 루트로 이동
cd c:\Users\task2\202512\ch25

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# (가상환경 활성화 시 프롬프트 앞에 (venv) 표시됨)
```

### 2. 의존성 설치

```powershell
# Python 패키지 설치
pip install -r requirements.txt

# 설치 확인
pip list
```

### 3. 환경변수 설정

```powershell
# .env 파일 생성
copy .env.local .env

# 필요시 .env 파일 수정 (데이터베이스 연결 정보 등)
notepad .env
```

### 4. 데이터베이스 마이그레이션

```powershell
# 초기 마이그레이션은 이미 포함되어 있음 (alembic/versions/20241206_0001_initial_schema.py)

# 마이그레이션 적용
alembic upgrade head

# 현재 버전 확인
alembic current
```

### 5. 백엔드 서버 실행

```powershell
# 개발 모드로 실행 (자동 재시작 활성화)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 또는 루트에서 실행
# cd app
# uvicorn main:app --reload
```

**✅ 백엔드 실행 확인:**
- 브라우저: http://localhost:8000
- API 문서: http://localhost:8000/docs (Swagger UI)
- 응답 예시: `{"message": "XMAS 1Week backend running"}`

---

## ⚛️ 프론트엔드 설정 및 실행

### 1. 새 터미널 열기 (백엔드는 실행 상태 유지)

```powershell
# 새 PowerShell 터미널 열기
cd c:\Users\task2\202512\ch25
```

### 2. 의존성 설치

```powershell
# Node 패키지 설치
npm install

# 설치 확인
npm list --depth=0
```

### 3. 환경변수 설정

```powershell
# 프론트엔드 .env 파일 생성
copy .env.frontend.local .env

# 내용 확인 (API URL이 백엔드와 일치하는지)
type .env
```

### 4. 프론트엔드 서버 실행

```powershell
# 개발 서버 시작
npm run dev

# 빌드 테스트 (선택)
# npm run build
```

**✅ 프론트엔드 실행 확인:**
- 브라우저: http://localhost:5173
- 개발자 도구 → Network 탭에서 API 호출 확인

---

## 🧪 전체 동작 테스트

### 1. API 테스트 (PowerShell)

```powershell
# Root 엔드포인트
curl http://localhost:8000/

# Health Check
curl http://localhost:8000/health

# 시즌 패스 상태 예시
curl http://localhost:8000/api/season-pass/status
```

### 2. 브라우저 테스트

1. **백엔드 API 문서**: http://localhost:8000/docs
   - "Try it out" 버튼으로 API 직접 테스트
   
2. **프론트엔드 앱**: http://localhost:5173
   - 개발자 도구(F12) → Console 탭에서 에러 확인
   - Network 탭에서 API 호출 확인

### 3. 데이터베이스 확인

```powershell
# Docker 사용 시
docker exec -it xmas-mysql mysql -u root -proot xmas_event_dev

# 로컬 MySQL 사용 시
mysql -u root -p xmas_event_dev
```

MySQL 명령어:
```sql
-- 테이블 목록 확인
SHOW TABLES;

- 특정 테이블 확인
SELECT * FROM user_game_wallet LIMIT 10;
SELECT * FROM season_pass_level LIMIT 10;

-- 데이터베이스 종료
EXIT;
```

---

## 📁 로컬 개발 디렉토리 구조

```
ch25/
├── .env                    # 백엔드 환경변수 (생성 필요)
├── .env.local              # 백엔드 환경변수 템플릿
├── .env.frontend.local     # 프론트 환경변수 템플릿
├── requirements.txt        # Python 의존성
├── package.json           # Node.js 의존성
├── alembic.ini            # DB 마이그레이션 설정
│
├── app/                   # 백엔드 소스
│   ├── main.py           # FastAPI 엔트리포인트
│   ├── core/             # 설정, 인증, 유틸
│   ├── db/               # 데이터베이스 세션
│   ├── models/           # SQLAlchemy 모델
│   ├── schemas/          # Pydantic 스키마
│   ├── services/         # 비즈니스 로직
│   └── api/              # API 라우터
│
├── src/                  # 프론트엔드 소스
│   ├── main.tsx          # React 엔트리포인트
│   ├── App.tsx           # 메인 컴포넌트
│   ├── api/              # API 클라이언트
│   ├── components/       # UI 컴포넌트
│   ├── pages/            # 페이지 컴포넌트
│   ├── router/           # 라우팅 설정
│   └── providers/        # Context Providers
│
└── alembic/              # DB 마이그레이션
    └── versions/         # 마이그레이션 파일들
```

---

## 🧪 TEST_MODE 설정 (개발/QA 환경)

로컬 개발 시 모든 게임에 접근할 수 있도록 TEST_MODE를 활성화할 수 있습니다.

### 백엔드 (스케줄 검증 우회)
```env
# .env 파일에 추가
TEST_MODE=true
```

### 프론트엔드
today-feature 게이트는 폐기되어 사용하지 않습니다. 기본값(false) 유지.

> ⚠️ **주의**: TEST_MODE에서 플레이한 기록도 실제 DB에 저장됩니다. 운영 환경에서는 절대 활성화하지 마세요.

> 📖 **상세 명세**: [TEST_MODE 명세서](./06_ops/06_test_mode_spec_v1.0.md) 참조

---

## 🔧 개발 시 유용한 명령어

### 백엔드

```powershell
# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 서버 재시작 (자동 재시작 활성화)
uvicorn app.main:app --reload --port 8000

# 새 마이그레이션 생성
alembic revision --autogenerate -m "Add new table"

# 마이그레이션 적용
alembic upgrade head

# 마이그레이션 롤백
alembic downgrade -1

# 테스트 실행
pytest tests/ -v

# Python 코드 포맷팅 (선택)
# black app/
```

### 프론트엔드

```powershell
# 개발 서버
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview

# TypeScript 타입 체크
npx tsc --noEmit

# Lint 실행 (선택)
# npm run lint
```

---

## 🐛 문제 해결 (Troubleshooting)

### ❌ 백엔드: `ModuleNotFoundError`

```powershell
# 가상환경 활성화 확인
.\venv\Scripts\Activate.ps1

# 의존성 재설치
pip install -r requirements.txt
```

### ❌ 백엔드: 데이터베이스 연결 실패

```powershell
# MySQL 실행 확인 (Docker)
docker ps | Select-String mysql

# MySQL 재시작
docker restart xmas-mysql

# .env 파일의 DATABASE_URL 확인
type .env | Select-String DATABASE_URL
```

### ❌ 프론트엔드: CORS 에러

백엔드 `.env` 파일에서 CORS_ORIGINS 확인:
```env
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

백엔드 재시작 필요.

### ❌ 프론트엔드: 빌드 에러

```powershell
# node_modules 삭제 후 재설치
Remove-Item -Recurse -Force node_modules
npm install

# 캐시 정리
npm cache clean --force
```

### ❌ 포트 이미 사용 중

```powershell
# 포트 사용 프로세스 확인
netstat -ano | Select-String :8000
netstat -ano | Select-String :5173

# 프로세스 종료 (PID 확인 후)
taskkill /PID [프로세스ID] /F
```

---

## 📊 초기 데이터 설정 (선택)

테스트를 위한 샘플 데이터가 필요하면:

```powershell
# Python 스크립트로 초기 데이터 삽입
python scripts/seed_data.py

# 또는 SQL 파일 직접 실행
docker exec -i xmas-mysql mysql -u root -proot xmas_event_dev < scripts/init.sql
```

---

## ✅ 로컬 개발 체크리스트

- [ ] Python 3.11+ 설치 확인
- [ ] Node.js 18+ 설치 확인
- [ ] MySQL 실행 중 (Docker 또는 로컬)
- [ ] Python 가상환경 생성 및 활성화
- [ ] `pip install -r requirements.txt` 실행
- [ ] `.env` 파일 생성 (`.env.local` 복사)
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 백엔드 서버 실행: http://localhost:8000
- [ ] `npm install` 실행
- [ ] 프론트엔드 `.env` 파일 생성
- [ ] 프론트엔드 서버 실행: http://localhost:5173
- [ ] API 문서 접속: http://localhost:8000/docs
- [ ] 브라우저에서 프론트-백 연동 확인

---

## 🎯 다음 단계

로컬 환경이 정상 작동하면:

1. **초기 데이터 설정**: feature_config, feature_schedule, season_pass_config
2. **API 테스트**: Swagger UI에서 각 엔드포인트 테스트
3. **프론트엔드 개발**: 필요한 페이지 컴포넌트 작성
4. **통합 테스트**: 전체 플로우 테스트 (회원가입 → 게임 플레이 → 보상)

**상세 API 문서**: `docs/03_api/` 폴더 참고
