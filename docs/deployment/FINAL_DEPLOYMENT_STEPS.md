# 🚀 최종 서버 배포 가이드 (Vultr + Docker)

이 가이드는 `cc-jm.com` 도메인을 사용하여 Vultr 서버에 프로젝트를 배포하는 최종 절차입니다.

## 1. 사전 준비

### 1.1 로컬 코드 준비
최신 변경사항(관리자 비밀번호 변경, CORS 설정 등)이 포함된 코드를 준비합니다.
- **Git 사용 시**: GitHub/GitLab에 푸시합니다.
- **파일 복사 시**: 프로젝트 폴더 전체를 압축(`xmas-event.zip`)합니다. (node_modules, .git 제외 권장)

### 1.2 Vultr 서버 생성
1. **Server Type**: Cloud Compute
2. **Location**: Seoul (ICN) 또는 Tokyo (NRT)
3. **Image**: Ubuntu 22.04 LTS
4. **Size**: 2 vCPU / 4GB RAM 이상 권장
5. **IP 확인**: 생성된 서버의 IP 주소를 메모합니다.

### 1.3 도메인 연결
도메인 관리 사이트(가비아, 후이즈 등)에서 DNS 레코드를 설정합니다.
- **A 레코드**: `@` -> `[Vultr 서버 IP]`
- **A 레코드**: `www` -> `[Vultr 서버 IP]`

---

## 2. 서버 접속 및 환경 설정

터미널(PowerShell 또는 CMD)을 열고 SSH로 접속합니다.
```powershell
ssh root@[Vultr_서버_IP]
# 예: ssh root@123.45.67.89
```

### 2.1 필수 도구 설치 및 코드 가져오기

**방법 A: Git Clone (권장)**
```bash
# 1. 기본 도구 설치
apt-get update && apt-get install -y git docker.io docker-compose-plugin

# 2. 코드 클론
git clone [GitHub_주소] /opt/xmas-event
cd /opt/xmas-event
```

**방법 B: 파일 직접 업로드 (Git 없는 경우)**
로컬 터미널에서 SCP로 파일 전송:
```powershell
# 로컬에서 실행
scp -r c:\Users\task2\1210\ch25 root@[Vultr_서버_IP]:/opt/xmas-event
```
서버에서 이동:
```bash
cd /opt/xmas-event
```

---

## 3. 배포 설정 (.env)

서버에서 `.env` 파일을 생성하고 운영 환경에 맞게 수정합니다.

```bash
cp .env.example .env  # 없으면 새로 생성
nano .env
```

**`.env` 필수 수정 항목:**
```ini
# 배포 환경 설정
ENV=production
TEST_MODE=false

# 도메인 설정 (프론트엔드 빌드용)
VITE_API_URL=http://cc-jm.com/api
VITE_ADMIN_API_URL=http://cc-jm.com/admin/api
VITE_ENV=production

# 데이터베이스 (변경 권장)
MYSQL_ROOT_PASSWORD=강력한_DB_비밀번호
MYSQL_PASSWORD=강력한_사용자_비밀번호
```
*(`Ctrl+O` 저장, `Enter`, `Ctrl+X` 종료)*

---

## 4. 서비스 실행 (Docker Compose)

```bash
# 1. 기존 컨테이너 정리 (재배포 시)
docker compose down

# 2. 최신 이미지 빌드 및 실행
docker compose up -d --build

# 3. 실행 상태 확인
docker compose ps
```
모든 상태가 `Up`이어야 합니다.

---

## 5. 데이터 초기화 (선택 사항)

초기 데이터(레벨, 랭킹 등)가 필요한 경우 실행합니다.

```bash
# 시드 스크립트 복사 및 실행
docker compose cp scripts/seed_ranking_seasonpass.sql db:/tmp/seed.sql
docker compose exec db sh -c "mysql -u root -p'$MYSQL_ROOT_PASSWORD' xmas_event < /tmp/seed.sql"
```
*(주의: `.env`에 설정한 `MYSQL_ROOT_PASSWORD`를 사용하세요)*

---

## 6. 접속 확인

브라우저를 열고 접속을 테스트합니다.

1. **사용자 페이지**: [http://cc-jm.com](http://cc-jm.com)
2. **관리자 페이지**: [http://cc-jm.com/admin](http://cc-jm.com/admin)
   - **ID**: `admin`
   - **PW**: `2wP?+!Etm8#Qv4Mn` (변경된 비밀번호)

---

## 7. (옵션) HTTPS/SSL 적용

현재 설정은 HTTP(80)만 지원합니다. HTTPS를 적용하려면 Nginx 설정을 수정하고 Certbot을 실행해야 합니다.
가장 간단한 방법은 `nginx-proxy`와 `acme-companion` 컨테이너를 사용하는 것이지만, 현재 구조에서는 **Cloudflare**를 도메인 네임서버로 사용하여 "Flexible SSL"을 켜는 것이 가장 빠르고 쉽습니다.

**Cloudflare 사용 시:**
1. Cloudflare에 도메인 등록 및 네임서버 변경
2. SSL/TLS 설정 -> **Flexible** 선택
3. 끝 (서버 설정 변경 불필요)
