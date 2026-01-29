# V2 서버 배포 가이드 (V2 Server Deployment Guide)

**문서 타입**: 서버 배포 가이드 (Server Setup)
**작성일**: 2026-01-29
**대상**: DevOps, 인프라 담당자
**스택**: Vultr, Docker, PostgreSQL, Redis, FastAPI

---

## 📋 1. 사전 준비 (Prerequisites)

### 1.1 서버 사양 (Instance Specs)
Golden V2의 실시간 개입(Intervention) 및 대량 로그 처리를 위해 다음 사양 이상을 권장합니다.
- **Provider**: Vultr (Cloud Compute)
- **Location**: Seoul (ICN)
- **OS**: Ubuntu 22.04 LTS
- **Size**: 2 vCPU / 4GB RAM / 80GB SSD 이상

### 1.2 유저 접점: 텔레그램 봇 설정 (User Portal)
- **BotFather**: `SetWebApp` 메뉴를 통해 `https://cc-jm.com` (유저 도메인) 연결.
- **Bot Token**: 프로덕션 전용 토큰 준비 (`ch25_prod_bot`).

### 1.3 어드민 접점: 보안 및 도메인 (Admin Portal)
- **도메인 분리**: `admin.cc-jm.com` (어드민) / `cc-jm.com` (유저).
- **SSL**: 어드민 도메인은 반드시 HSTS(Strong SSL) 및 고정 IP 접근 제한 권장.

---

## 🛠️ 2. 서버 환경 구축 (Standard Setup)

### 2.1 도구 설치
```bash
apt-get update && apt-get install -y git docker.io docker-compose-plugin
```

### 2.2 코드 체크아웃
```bash
git clone [Github_Url] /opt/ch25
cd /opt/ch25
```

---

## ⚙️ 3. 환경 변수 설정 (.env)

V2의 핵심 운영 정책인 **Circuit Breaker**와 **Auth** 설정을 반드시 포함해야 합니다.

```bash
cp .env.example .env
nano .env
```

### [필수] V2 운영 환경 변수
```ini
# Core
ENV=production
TEST_MODE=false
DEV_LOGIN_ENABLED=false  # 🚨 프로덕션 실무 차단 필수

# Timezone (Golden V2 핵심: 09:00 KST 리셋)
TIMEZONE=Asia/Seoul

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@db:5432/ch25_v2

# Security (JWT)
JWT_SECRET=your-strong-32-char-secret-key
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15

# Golden V2 Safety (Circuit Breaker)
# 아래 값은 SoT(변경 기준)입니다. 모든 환경/코드/테스트/운영 정책은 반드시 이 값을 따라야 합니다.
CIRCUIT_LIMIT_VAULT=100000  # 시간당 금고 지급 한도 (KRW, SoT)
CIRCUIT_LIMIT_TICKET=30     # 시간당 티켓 지급 한도 (장, SoT)

# External Integration
TELEGRAM_BOT_TOKEN=your-production-bot-token
```

---

## 🚀 4. 배포 실행 (Execution)

### 4.1 서비스 기동
```bash
# 최신 이미지 빌드 및 백그라운드 실행
docker compose up -d --build
```

### 4.2 어드민 계정 보호 로직 (Admin Security)
배포 직후 기본 어드민 계정의 비밀번호를 환경 변수로 강제 변경하거나, `scripts/reset_admin_password.py`를 통해 즉시 갱신해야 합니다.

### 4.3 유저 데이터 무결성 체크 (User Integrity)
V1 유저가 V2로 처음 진입할 때 `v2_user` 테이블에 정상적으로 복제(Lazy-migration)되도록 Redis 캐시가 비워져 있는지 확인합니다.

---

### 4.4 DB 마이그레이션 (Alembic)
V2의 신규 테이블(v2_user, v2_ops_plan 등) 생성을 위해 필수적으로 실행합니다.
```bash
docker compose exec backend alembic upgrade head
```

---

## 🔍 5. 초기 데이터 적재 (Optional)

시스템 가동을 위한 기초 데이터(레벨 보상, 상점 목록 등)가 필요한 경우 다음 명령을 사용합니다.
```bash
# 레벨 보상 및 미션 기초 데이터 적재
docker compose exec backend python scripts/seed_v2_essential_data.py
```

---

## 📡 6. 접속 확인 및 헬스 체크

| 컴포넌트 | 경로 | 확인 방법 |
| :--- | :--- | :--- |
| **Backend API** | `https://api.cc-jm.com/health` | `{"status": "ok"}` 확인 |
| **Admin Panel** | `https://admin.cc-jm.com` | 관리자 로그인 및 CSRF 토큰 확인 |
| **DB Sync** | `docker ps` | `ch25-v2-db` 컨테이너 상태 Healthy 확인 |

> [!WARNING]
> 대규모 배포 전 반드시 `scripts/validate_v2_readiness.py`를 실행하여 모든 V2 모듈이 정상 로딩되었는지 확인하십시오.
