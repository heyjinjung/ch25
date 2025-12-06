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
curl https://yourdomain.com/health

# 브라우저로 접속
https://yourdomain.com
```

---

## ⚡ 수동 배포 (상세 제어가 필요한 경우)

### 1. 시스템 준비
```bash
apt-get update && apt-get upgrade -y
apt-get install -y curl git vim htop ufw certbot

# Docker 설치
curl -fsSL https://get.docker.com | sh

# Docker Compose 설치
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. 방화벽 설정
```bash
ufw enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
```

### 3. 코드 배포
```bash
mkdir -p /opt/xmas-event
cd /opt/xmas-event
git clone https://github.com/yourusername/xmas-event.git .
```

### 4. 환경 설정
```bash
cp .env.example .env
vim .env
```

필수 환경변수:
```env
DATABASE_URL=mysql+pymysql://user:pass@db:3306/xmas_event
JWT_SECRET=$(openssl rand -hex 32)
ENV=production
CORS_ORIGINS=["https://yourdomain.com"]
```

### 5. SSL 인증서
```bash
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
ln -sf /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
ln -sf /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### 6. 실행
```bash
docker-compose build
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

---

## 🔧 운영 명령어

### 일상 관리
```bash
# 로그 확인
docker-compose logs -f

# 재시작
docker-compose restart

# 업데이트
cd /opt/xmas-event
git pull
docker-compose build
docker-compose up -d
```

### 백업
```bash
# 수동 백업
./scripts/backup.sh

# 자동 백업 (Cron)
crontab -e
# 추가: 0 2 * * * /opt/xmas-event/scripts/backup.sh
```

### 긴급 중단
```bash
# 전체 중단
docker-compose down

# DB에서 Feature 비활성화
docker-compose exec db mysql -u root -p
UPDATE feature_config SET is_enabled=0 WHERE feature_type='ROULETTE';
```

---

## 🚨 문제 해결

| 증상 | 해결 방법 |
|------|----------|
| 컨테이너 시작 안됨 | `docker-compose logs` 확인 |
| DB 연결 실패 | `.env`의 DATABASE_URL 확인 |
| 502 Bad Gateway | `docker-compose logs backend` 확인 |
| SSL 오류 | `certbot renew --force-renewal` |
| 디스크 부족 | `docker system prune -a` |

---

## 📋 체크리스트

배포 전:
- [ ] Git 저장소 준비
- [ ] Vultr 계정 생성
- [ ] 도메인 준비
- [ ] 환경변수 값 준비

배포 중:
- [ ] 서버 생성 완료
- [ ] DNS 설정 완료
- [ ] 스크립트 실행 완료
- [ ] SSL 인증서 발급

배포 후:
- [ ] HTTPS 접속 확인
- [ ] API 응답 확인
- [ ] 백업 설정 확인
- [ ] 모니터링 설정

---

**전체 상세 가이드**: [DEPLOYMENT.md](./DEPLOYMENT.md) 참고
