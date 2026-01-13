---
description: Standard Deployment Workflow via SSH
---

# 서버 접속 정보 (Server Access Information)

## SSH 연결

- **서버 주소**: `root@149.28.135.147`
- **SSH 키 경로**: `C:\Users\JAVIS\.ssh\id_ed25519_vultr` (Windows)
  - Linux/Mac: `~/.ssh/id_ed25519_vultr`
- **연결 명령**:

  ```bash
  ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147
  ```

## 데이터베이스 정보

- **데이터베이스 이름**: `xmas_event`
- **MySQL Root 비밀번호**: `2026`
- **MySQL 사용자**: `xmasuser`
- **MySQL 사용자 비밀번호**: `2026`
- **컨테이너 이름**: `xmas-db`
- **포트**: `3307` (호스트) → `3306` (컨테이너)

## Docker 컨테이너 구성

- `xmas-backend`: FastAPI 백엔드 서버
- `xmas-frontend`: Nginx + React 프론트엔드
- `xmas-telegram-bot`: Telegram 봇 서비스
- `xmas-db`: MySQL 8.0 데이터베이스
- `xmas-redis`: Redis 캐시
- `xmas-nginx`: Nginx 리버스 프록시

---

# 배포 워크플로우 (Deployment Workflow)

## 1. 서버 로그인

```bash
ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147
```

## 2. 시스템 상태 확인

```bash
df -h
docker system df
docker ps
```

## 3. 코드 업데이트 (프로젝트 디렉토리 확인 필요)

```bash
# Docker 컨테이너로 관리되므로 이미지 재빌드로 코드 업데이트
docker ps  # 현재 실행 중인 컨테이너 확인
```

## 4. 컨테이너 재배포

```bash
# 최신 이미지 pull 및 재시작
docker compose pull
docker compose up -d
docker ps
```

## 5. 데이터베이스 마이그레이션

```bash
docker exec xmas-backend alembic upgrade head
```

## 6. Nginx 재시작

```bash
docker restart xmas-nginx
docker ps
```

---

# 데이터베이스 백업 및 복원 (Database Backup & Restore)

## 프로덕션 백업 생성

```bash
# 서버에 접속하여 백업 생성
ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147 \
  "docker exec xmas-db mysqldump -u root -p2026 xmas_event | gzip > /root/backup_$(date +%Y%m%d).sql.gz"

# 백업 파일 다운로드
scp -i ~/.ssh/id_ed25519_vultr \
  root@149.28.135.147:/root/backup_YYYYMMDD.sql.gz \
  ./backup_YYYYMMDD.sql.gz
```

## 로컬에 백업 적용

```bash
# 백업 파일을 컨테이너로 복사
docker cp backup_YYYYMMDD.sql.gz xmas-db:/tmp/backup.sql.gz

# 데이터베이스 복원
docker exec xmas-db sh -c "gunzip -c /tmp/backup.sql.gz | mysql -u root -p2026 xmas_event"

# 정리
docker exec xmas-db rm /tmp/backup.sql.gz
```

## 데이터 확인

```bash
docker exec xmas-db mysql -u root -p2026 -e "USE xmas_event; SHOW TABLES; SELECT COUNT(*) FROM user;"
```
