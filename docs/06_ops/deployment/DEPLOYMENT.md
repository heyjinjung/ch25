# XMAS Event System - Vultr 서버 배포 가이드
문서 타입: 배포 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 인프라/백엔드/운영 담당자
프로젝트: XMAS 1Week Event System

## 📋 목차
0. [목적·범위·정의](#0-목적·범위·정의)
1. [배포 전 준비사항](#1-배포-전-준비사항)
2. [Vultr 서버 설정](#2-vultr-서버-설정)
3. [자동 배포 (권장)](#3-자동-배포-권장)
4. [수동 배포](#4-수동-배포)
5. [배포 후 확인사항](#5-배포-후-확인사항)
6. [운영 및 유지보수](#6-운영-및-유지보수)
7. [트러블슈팅](#7-트러블슈팅)
8. [배포 완료 체크리스트](#배포-완료-체크리스트)
9. [변경 이력](#변경-이력)

---

## 0. 목적·범위·정의
- 목적: Vultr에 서비스를 안정적으로 배포하고 운영/장애 대응 절차를 표준화한다.
- 범위: 서버 생성, DNS, 자동/수동 배포, SSL, 마이그레이션, 운영 명령어, 트러블슈팅, 체크리스트.
- 용어: "자동 배포"는 `scripts/deploy.sh` 활용 경로, "수동 배포"는 섹션 4 명령어 기반 절차.

## 1. 배포 전 준비사항

### ✅ 체크리스트

- [ ] **Vultr 계정** 및 서버 생성
- [ ] **도메인** 준비 (예: yourdomain.com)
- [ ] **Git 저장소** 준비 (GitHub/GitLab)
- [ ] **환경변수** 값 준비 (DB 비밀번호, JWT Secret 등)
- [ ] **SSL 인증서용 이메일** 준비

### 📦 로컬에서 Git 저장소 준비

```powershell
# 프로젝트 루트에서
cd c:\Users\task2\202512\ch25

# Git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit for deployment"

# GitHub 저장소에 푸시
git remote add origin https://github.com/yourusername/xmas-event.git
git branch -M main
git push -u origin main
```

---

## 2. Vultr 서버 설정

### 2.1 Vultr에서 서버 생성

1. **Vultr 대시보드** 접속 → "Deploy New Server" 클릭
2. **서버 타입 선택:**
   - Server Type: Cloud Compute
   - Location: Seoul (한국) 또는 Tokyo (일본)
   - Server Image: **Ubuntu 22.04 LTS x64**
   - Server Size: 최소 **2 vCPU, 4GB RAM** (권장: 4 vCPU, 8GB RAM)
3. **추가 기능:**
   - ✅ Enable IPv6
   - ✅ Enable Auto Backups (권장)
4. **SSH 키 또는 Root 비밀번호** 설정
5. **Server Label**: `xmas-event-prod`
6. "Deploy Now" 클릭

### 2.2 도메인 DNS 설정

Vultr 서버의 IP 주소를 확인한 후, 도메인 DNS 설정:

```
A 레코드:
  @ → [서버 IP 주소]
  www → [서버 IP 주소]

또는 CNAME:
  www → yourdomain.com
```

DNS 전파까지 최대 24시간 소요 (보통 5-30분).

### 2.3 서버 접속

```powershell
# SSH로 서버 접속
ssh root@[서버_IP_주소]

# 또는 SSH 키 사용
ssh -i C:\path\to\your\key.pem root@[서버_IP_주소]
```

---

## 3. 자동 배포 (권장)

### 3.1 배포 스크립트 실행

서버에 접속한 후:

```bash
# 배포 스크립트 다운로드 및 실행
wget https://raw.githubusercontent.com/yourusername/xmas-event/main/scripts/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

스크립트가 자동으로:
- ✅ 시스템 업데이트
- ✅ Docker 및 Docker Compose 설치
- ✅ 방화벽 설정 (UFW)
- ✅ Git 저장소 클론
- ✅ 환경변수 설정 안내
- ✅ SSL 인증서 발급 (Let's Encrypt)
- ✅ 컨테이너 빌드 및 실행
- ✅ 데이터베이스 마이그레이션

### 3.2 대화형 입력 항목

스크립트 실행 중 입력해야 할 항목:

1. **Git 저장소 URL**: `https://github.com/yourusername/xmas-event.git`
2. **도메인 이름**: `yourdomain.com`
3. **이메일 주소**: `admin@yourdomain.com` (SSL 인증서용)
4. **.env 파일 편집**: 데이터베이스 비밀번호, JWT Secret 등

---

## 4. 수동 배포

자동 스크립트를 사용하지 않는 경우:

### 4.1 시스템 업데이트 및 패키지 설치

```bash
# 시스템 업데이트
sudo apt-get update && sudo apt-get upgrade -y

# 필수 패키지 설치
sudo apt-get install -y curl git vim htop ufw certbot python3-certbot-nginx

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker --version
docker-compose --version
```

### 4.2 방화벽 설정

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 4.3 애플리케이션 배포

```bash
# 애플리케이션 디렉토리 생성
sudo mkdir -p /opt/xmas-event
cd /opt/xmas-event

# Git 저장소 클론
sudo git clone https://github.com/yourusername/xmas-event.git .

# 환경변수 파일 생성
sudo cp .env.example .env
sudo vim .env
```

### 4.4 .env 파일 설정

```bash
# 필수 환경변수 설정
DATABASE_URL=mysql+pymysql://xmasuser:YOUR_STRONG_PASSWORD@db:3306/xmas_event
JWT_SECRET=YOUR_RANDOM_JWT_SECRET_MIN_32_CHARS
ENV=production
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# MySQL 설정
MYSQL_ROOT_PASSWORD=YOUR_ROOT_PASSWORD
MYSQL_DATABASE=xmas_event
MYSQL_USER=xmasuser
MYSQL_PASSWORD=YOUR_STRONG_PASSWORD

# 프론트엔드 API URL
VITE_API_URL=https://yourdomain.com/api
VITE_ADMIN_API_URL=https://yourdomain.com/admin/api
```

**JWT Secret 생성:**
```bash
openssl rand -hex 32
```

**데이터베이스 마이그레이션 적용 (초기 스키마 포함):**
```bash
alembic upgrade head
```

### 4.5 SSL 인증서 발급

```bash
# Nginx 설정에 도메인 적용
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN/g' nginx/nginx.conf

# Let's Encrypt 인증서 발급
sudo certbot certonly --standalone \
  --preferred-challenges http \
  --email your-email@example.com \
  --agree-tos \
  -d yourdomain.com \
  -d www.yourdomain.com

# 인증서 심볼릭 링크 생성
sudo mkdir -p nginx/ssl
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/privkey.pem

# 자동 갱신 설정 (cron)
echo "0 0,12 * * * root certbot renew -q" | sudo tee -a /etc/crontab
```

### 4.6 컨테이너 빌드 및 실행

```bash
cd /opt/xmas-event

# 컨테이너 빌드
sudo docker-compose build

# 백그라운드에서 실행
sudo docker-compose up -d

# 로그 확인
sudo docker-compose logs -f
```

### 4.7 데이터베이스 마이그레이션

```bash
# 데이터베이스가 준비될 때까지 대기 (10초)
sleep 10

# 마이그레이션 실행
sudo docker-compose exec backend alembic upgrade head

# 또는 수동으로 init.sql 실행
sudo docker-compose exec -T db mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < scripts/init.sql
```

---

## 5. 배포 후 확인사항

### 5.1 서비스 상태 확인

```bash
# 컨테이너 상태 확인
sudo docker-compose ps

# 모든 컨테이너가 "Up" 상태여야 함:
# - xmas-db
# - xmas-redis
# - xmas-backend
# - xmas-frontend
# - xmas-nginx
```

### 5.2 엔드포인트 테스트

```bash
# 로컬에서 테스트
curl -k https://yourdomain.com/health
# 응답: healthy

# API 테스트
curl -k https://yourdomain.com/api/
# 응답: {"message": "XMAS 1Week backend running"}

# Today Feature 테스트
curl -k https://yourdomain.com/api/today-feature
```

### 5.3 로그 확인

```bash
# 전체 로그
sudo docker-compose logs

# 특정 서비스 로그
sudo docker-compose logs backend
sudo docker-compose logs frontend
sudo docker-compose logs nginx

# 실시간 로그 추적
sudo docker-compose logs -f --tail=100
```

### 5.4 브라우저 테스트

1. https://yourdomain.com 접속
2. SSL 인증서 확인 (자물쇠 아이콘)
3. 메인 페이지 로딩 확인
4. 개발자 도구 → Network 탭에서 API 호출 확인

---

## 6. 운영 및 유지보수

### 6.1 일상적인 명령어

```bash
# 서비스 재시작
sudo docker-compose restart

# 특정 서비스만 재시작
sudo docker-compose restart backend

# 서비스 중지
sudo docker-compose down

# 서비스 시작
sudo docker-compose up -d

# 리소스 사용량 확인
sudo docker stats
```

### 6.2 코드 업데이트

```bash
cd /opt/xmas-event

# 업데이트 스크립트 실행 (권장)
sudo ./scripts/update.sh

# 또는 수동으로:
sudo git pull
sudo docker-compose build
sudo docker-compose up -d
sudo docker-compose exec backend alembic upgrade head
```

### 6.3 데이터베이스 백업

```bash
# 백업 스크립트 실행
sudo ./scripts/backup.sh

# Cron으로 자동 백업 설정 (매일 새벽 2시)
sudo crontab -e
# 추가: 0 2 * * * /opt/xmas-event/scripts/backup.sh >> /var/log/xmas-backup.log 2>&1
```

### 6.4 로그 모니터링

```bash
# 애플리케이션 로그
sudo tail -f /opt/xmas-event/logs/*.log

# Nginx 로그
sudo tail -f /opt/xmas-event/logs/nginx/access.log
sudo tail -f /opt/xmas-event/logs/nginx/error.log

# 시스템 리소스 모니터링
htop
```

### 6.5 긴급 중단 (장애 대응)

```bash
# 전체 서비스 중단
sudo docker-compose down

# 특정 Feature 비활성화 (DB 직접 수정)
sudo docker-compose exec db mysql -u root -p
USE xmas_event;
UPDATE feature_config SET is_enabled = 0 WHERE feature_type = 'ROULETTE';
```

---

## 7. 트러블슈팅

### ❌ 컨테이너가 시작되지 않음

```bash
# 로그 확인
sudo docker-compose logs

# 특정 컨테이너 로그
sudo docker-compose logs backend

# 컨테이너 재생성
sudo docker-compose down
sudo docker-compose up -d --force-recreate
```

### ❌ 데이터베이스 연결 실패

```bash
# DB 컨테이너 상태 확인
sudo docker-compose ps db

# DB 로그 확인
sudo docker-compose logs db

# DB 연결 테스트
sudo docker-compose exec backend python -c "from app.db.session import SessionLocal; SessionLocal()"
```

### ❌ SSL 인증서 오류

```bash
# 인증서 확인
sudo certbot certificates

# 수동 갱신
sudo certbot renew

# 인증서 재발급
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com --force-renewal
```

### ❌ Nginx 502 Bad Gateway

```bash
# Backend 컨테이너 상태 확인
sudo docker-compose ps backend

# Backend 로그 확인
sudo docker-compose logs backend

# Nginx 설정 테스트
sudo docker-compose exec nginx nginx -t

# Nginx 재시작
sudo docker-compose restart nginx
```

### ❌ 디스크 공간 부족

```bash
# 디스크 사용량 확인
df -h

# Docker 이미지 정리
sudo docker system prune -a

# 오래된 로그 삭제
sudo find /opt/xmas-event/logs -name "*.log" -mtime +7 -delete
```

### ❌ 메모리 부족

```bash
# 메모리 사용량 확인
free -h

# 컨테이너별 리소스 확인
sudo docker stats

# 서비스 재시작으로 메모리 해제
sudo docker-compose restart
```

---

## 📞 추가 지원

### 유용한 링크
- **Vultr 문서**: https://www.vultr.com/docs/
- **Docker 문서**: https://docs.docker.com/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **서버 배포 예상 오류 리스트(Preflight)**: [DEPLOYMENT_EXPECTED_ERRORS.md](./DEPLOYMENT_EXPECTED_ERRORS.md)

### 모니터링 도구 (선택사항)
- **Portainer**: Docker 관리 UI
  ```bash
  docker volume create portainer_data
  docker run -d -p 9000:9000 --name=portainer --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data portainer/portainer-ce
  ```
- **Grafana + Prometheus**: 성능 모니터링
- **Sentry**: 에러 추적

---

## ✅ 배포 완료 체크리스트

배포 완료 후 다음 사항을 확인하세요:

- [ ] 모든 Docker 컨테이너가 정상 실행 중
- [ ] HTTPS로 웹사이트 접속 가능
- [ ] API 엔드포인트 응답 정상
- [ ] 데이터베이스 마이그레이션 완료
- [ ] SSL 인증서 자동 갱신 설정
- [ ] 백업 스크립트 Cron 설정
- [ ] 방화벽 규칙 적용
- [ ] 로그 파일 접근 가능
- [ ] 도메인 DNS 전파 완료
- [ ] 관리자 계정 생성 (필요 시)

---

## 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 메타/목적·범위·정의 추가, TOC 및 번호 보강, 체크리스트 정비.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성.

---

**축하합니다! 🎉 XMAS Event System이 Vultr 서버에 성공적으로 배포되었습니다.**
