# 배포 순서 요약 (Quick Reference)

## Vultr 서버 배포 단계별 가이드

### 📌 1단계: 로컬 준비 (Windows PC)
```powershell
# Git 저장소 생성 및 푸시
cd c:\Users\task2\202512\ch25
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/yourusername/xmas-event.git
git push -u origin main
```

### 📌 2단계: Vultr 서버 생성
1. Vultr 대시보드 → "Deploy New Server"
2. Ubuntu 22.04 LTS 선택
3. 최소 4GB RAM 서버 선택
4. SSH 키 또는 Root 비밀번호 설정
5. 서버 IP 주소 확인

### 📌 3단계: DNS 설정
도메인 제공업체에서 A 레코드 추가:
```
@ → [서버 IP]
www → [서버 IP]
```

### 📌 4단계: 서버 접속
```bash
ssh root@[서버_IP]
```

### 📌 5단계: 자동 배포 (가장 쉬운 방법)
```bash
# 저장소에서 배포 스크립트 다운로드
curl -o deploy.sh https://raw.githubusercontent.com/yourusername/xmas-event/main/scripts/deploy.sh

# 실행 권한 부여
chmod +x deploy.sh

# 스크립트 실행
sudo ./deploy.sh
```

스크립트 실행 중 입력:
- Git 저장소 URL
- 도메인 이름 (예: example.com)
- 이메일 주소 (SSL용)
- .env 파일 편집 (DB 비밀번호, JWT Secret)

### 📌 6단계: 확인
```bash
# 서비스 상태
docker-compose ps

# 웹 접속
# Deployment Quickstart (Vultr)
문서 타입: 배포 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 인프라/백엔드/운영 담당자

## 1. 목적 (Purpose)
- Vultr 신규 서버에 서비스를 배포하는 빠른 경로와 기본 검증 절차를 제공한다.

## 2. 범위 (Scope)
- Windows 로컬 준비부터 Vultr 서버 생성, DNS, 자동/수동 배포, 기본 운영/문제 해결/체크리스트를 다룬다.

## 3. 사전 준비 (로컬)
```powershell
# Git 저장소 생성 및 푸시 예시
cd c:\Users\task2\202512\ch25
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/yourusername/xmas-event.git
git push -u origin main
```

## 4. Vultr 서버 생성
1) Vultr 대시보드 → "Deploy New Server".
2) OS: Ubuntu 22.04 LTS.
3) 스펙: 최소 4GB RAM.
4) SSH 키 또는 Root 비밀번호 설정.
5) 서버 IP 확인.

## 5. DNS 설정
도메인 A 레코드:
```
@   → [서버 IP]
www → [서버 IP]
```

## 6. 서버 접속
```bash
ssh root@[서버_IP]
```

## 7. 자동 배포 (추천)
```bash
curl -o deploy.sh https://raw.githubusercontent.com/yourusername/xmas-event/main/scripts/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```
스크립트 입력값: Git 저장소 URL, 도메인(example.com), 이메일(SSL), `.env` 편집(DB 비밀번호, JWT Secret).

## 8. 배포 결과 확인
```bash
docker-compose ps
curl https://yourdomain.com/health
# 브라우저 접속: https://yourdomain.com
```

## 9. 수동 배포 (상세 제어)
### 9.1 시스템 준비
```bash
apt-get update && apt-get upgrade -y
apt-get install -y curl git vim htop ufw certbot
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 9.2 방화벽
```bash
ufw enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
```

### 9.3 코드 배포
```bash
mkdir -p /opt/xmas-event
cd /opt/xmas-event
git clone https://github.com/yourusername/xmas-event.git .
```

### 9.4 환경 설정
```bash
cp .env.example .env
vim .env
```
필수 환경변수 예시:
```env
DATABASE_URL=mysql+pymysql://user:pass@db:3306/xmas_event
JWT_SECRET=$(openssl rand -hex 32)
ENV=production
CORS_ORIGINS=["https://yourdomain.com"]
```

### 9.5 SSL 인증서
```bash
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
ln -sf /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
ln -sf /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### 9.6 실행
```bash
docker-compose build
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

## 10. 운영 명령어
- 로그 확인: `docker-compose logs -f`
- 재시작: `docker-compose restart`
- 업데이트:
```bash
cd /opt/xmas-event
git pull
docker-compose build
docker-compose up -d
```
- 백업:
```bash
./scripts/backup.sh
# 크론 예시: 0 2 * * * /opt/xmas-event/scripts/backup.sh
```
- 긴급 중단:
```bash
docker-compose down
docker-compose exec db mysql -u root -p
UPDATE feature_config SET is_enabled=0 WHERE feature_type='ROULETTE';
```

## 11. 문제 해결
| 증상 | 해결 방법 |
|------|-----------|
| 컨테이너 시작 안 됨 | `docker-compose logs` 확인 |
| DB 연결 실패 | `.env`의 `DATABASE_URL` 확인 |
| 502 Bad Gateway | `docker-compose logs backend` 확인 |
| SSL 오류 | `certbot renew --force-renewal` |
| 디스크 부족 | `docker system prune -a` |

## 12. 체크리스트
- 배포 전: [ ] Git 저장소 준비, [ ] Vultr 계정, [ ] 도메인, [ ] 환경변수 값 준비.
- 배포 중: [ ] 서버 생성, [ ] DNS 설정, [ ] 스크립트 실행, [ ] SSL 발급.
- 배포 후: [ ] HTTPS 확인, [ ] API 응답 확인, [ ] 백업 설정, [ ] 모니터링 설정.

## 13. 참고
- 전체 상세 가이드: [DEPLOYMENT.md](./DEPLOYMENT.md).

## 14. 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, 목적/범위/체크리스트 정비.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성.
