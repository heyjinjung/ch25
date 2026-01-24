문서 타입: 가이드
버전: v1.0
작성일: 2026-01-09
작성자: BE팀 (Antigravity)
대상: BE 개발자, SRE
상태: SoT

# ⚡ 고속 빌드 및 무중단 배포 가이드 (v1.0)

> [!TIP]
> **운영 비용 안내**: GitHub Actions 및 GHCR은 소규모 프로젝트 규모에서 **사실상 무료($0)**로 운영 가능합니다. (상세 내용은 7번 섹션 참조)

## 1. 목적 (Purpose)
기존 서버에서 직접 수행하던 빌드 프로세스(10~20분 소요)를 개선하여, 빌드 시간을 1분 이내로 단축하고 유저 가용성을 극대화하기 위함입니다.

## 2. 병목 원인 진단
- **CPU/RAM 한계**: 2vCPU / 8GB 서버에서 Vite 프론트엔드 빌드 시 자원 고갈로 인한 지연 발생.
- **이미지 생성 부하**: 매 배포마다 서버에서 무거운 Docker 이미지를 생성함.

## 3. 고속 배포 솔루션 (CI/CD 기반)

### ## 1) 외부 빌드 시스템 (GitHub Actions)
서버 대신 강력한 성능의 GitHub 클라우드 리소스를 활용합니다.
1.  **빌드**: `npm run build` 및 `docker build`를 GitHub Actions 서버에서 수행.
2.  **푸시**: 생성된 이미지를 **GitHub Container Registry (GHCR)**에 저장.

### ## 2) 서버의 역할 변경 (Build ➔ Pull)
서버는 더 이상 빌드하지 않고, 이미 완성된 이미지를 '내려받기'만 합니다.
- **기존**: `docker-compose build` (15분) + `up -d` (1분)
- **개선**: `docker compose pull` (30초) + `up -d` (30초)
- **최종 효과**: 전체 배포 시간 **1분 이내** 단축.





## 4. 실행 런북 (Step-by-Step)

### 단계 1: GitHub 리포지토리 환경 설정 (Secrets)
GitHub 리포지토리의 **[Settings] -> [Secrets and variables] -> [Actions]**에서 다음 항목을 추가합니다.
1.  **`GH_TOKEN`**: GitHub Personal Access Token (Classic 권한: `write:packages`).
2.  **`SERVER_IP`**: Vultr 서버의 공인 IP 주소.
3.  **`SSH_PRIVATE_KEY`**: 사용자의 컴퓨터에 생성한 SSH 키 중 **비공개키(`id_ed25519`)**의 전체 내용.




GitHub Actions 빌드 상태 확인 및 서버 초기화 안내 중

🎊 나이스 샷! 이제 피날레를 완성할 시간입니다.
비밀값 등록과 Push까지 완벽하게 마치셨습니다. 이제 마지막으로 서버를 '준비 상태'로 만들기 위해 딱 한 단계만 남았습니다.

🚀 마지막 단계: 서버 초기화 명령어 실행
서버에 접속(SSH)하신 상태에서 아래 명령어를 복사해서 붙여넣으세요. 이 명령어가 서버의 보안을 높이고 Docker 배포 통로를 뚫어줍니다.

bash
curl -sSL https://raw.githubusercontent.com/heyjinjung/ch25/main/scripts/server_init.sh | sudo bash



### 단계 2: CI/CD 워크플로우 파일 작성
`.github/workflows/deploy.yml` 파일을 생성합니다. (아래 5번 섹션 참고)

### 단계 3: 서버 측 수동 설정 (최초 1회)
서버에 접속하여 GitHub 패키지에 접근할 수 있도록 인증합니다.
```bash
echo "GH_TOKEN" | docker login ghcr.io -u github_username --password-stdin
```

### 단계 4: 자동 배포 트리거
이제 코드를 `main` 브랜치에 `git push` 하기만 하면 다음 과정이 자동으로 진행됩니다.
1.  GitHub 클라우드에서 **Docker 이미지 빌드**.
2.  빌드된 이미지를 **GHCR**에 업로드(Push).
3.  Vultr 서버에 SSH로 접속하여 **`docker compose pull && up -d`** 실행.

## 5. CI/CD 워크플로우 샘플 (`deploy.yml`)
```yaml
name: CI/CD Deployment

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GH_TOKEN }}

      - name: Build and Push Backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest

      - name: Deploy to Vultr
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/xmas-event
            docker compose pull
            docker compose up -d --remove-orphans
```

## 6. 운영/검증 (QA)
- [ ] GitHub Actions 탭에서 모든 단계가 초록색(Success)인지 확인.
- [ ] 서버에서 `docker ps` 실행 시 이미지 이름이 `ghcr.io/...`로 되어 있는지 확인.
- [ ] 배포 전후로 사이트 접속이 중단됨 없이 7초 내외로 완료되는지 검증.

## 7. 운영 비용 분석 (Cost)

결론부터 말씀드리면, 현재 프로젝트 규모에서는 **추가 비용 없이 무료**로 사용 가능합니다.

| 서비스 | 무료 제공량 (Free Tier) | 예상 사용량 | 판정 |
| :--- | :--- | :--- | :--- |
| **GitHub Actions** | 매월 **2,000분** (Private 기준) | 빌드당 3분 x 월 30회 = **90분** | **안전 (넉넉함)** |
| **GHCR (저장소)** | 현재 무료 (또는 500MB) | 이미지 약 300MB | **안전** |
| **GHCR (대역폭)** | 매월 **1GB** (외부 Pull 기준) | 변경된 레이어만 전송 (수십 MB) | **안전** |

> [!NOTE]
> - **Public 레포지토리**라면 모든 기능이 무제한 무료입니다.
> - **Private 레포지토리**라도 매일 수십 번 배포하는 것이 아니라면 무료 범위(2,000분)를 넘기기 매우 어렵습니다.


---

## 📊 배포 진행 상황 (2026-01-10 기준)

### ✅ 운영 서버 정보

| 항목 | 값 |
|------|-----|
| **Location** | Singapore |
| **IP Address** | `149.28.135.147` |
| **Domain** | `cc-jm.com` |
| **vCPU** | 2 vCPUs |
| **RAM** | 4096 MB (4GB) |
| **Storage** | 50 GB NVMe |
| **OS** | Ubuntu 22.04 x64 |
| **Label** | ccjm |

> [!NOTE]
> 2026-01-10: 서버 Reinstall 후 스펙 업그레이드 완료. 신규 서버(158.247.222.179)는 폐기 예정.

### ✅ 완료된 작업

#### 1. 인프라 준비
- [x] Vultr 서버 (Singapore, IP: 149.28.135.147)
- [x] SSH 키 설정 및 서버 초기화 완료
- [x] Docker 28.2.2, Docker Compose 2.37.1 설치 완료

#### 2. CI/CD 파이프라인
- [x] GitHub Actions 워크플로우 구축
- [x] GHCR 이미지 자동 빌드
- [x] GitHub Secrets 기반 환경 변수 자동 주입
- [ ] SSH 자동 배포 (Secrets 업데이트 후 재배포 필요)

#### 3. GitHub Secrets 설정 (필수)
https://github.com/heyjinjung/ch25/settings/secrets/actions

| Secret | 값 |
|--------|-----|
| `SERVER_IP` | `149.28.135.147` |
| `SSH_PRIVATE_KEY` | 로컬 `~/.ssh/id_ed25519_vultr` 내용 |

### ⏳ 남은 작업 (2026-01-10)

#### 즉시 수행 순서
1) **GitHub Secrets 업데이트** (SERVER_IP, SSH_PRIVATE_KEY)

2) **Push하여 자동 배포 트리거**
```bash
git commit --allow-empty -m "deploy: trigger CI/CD to restored server"
git push origin temp-merge2
```

3) **인증서 발급 & nginx 재시작**
```bash
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email your-email@example.com --agree-tos \
  -d cc-jm.com -d www.cc-jm.com
docker restart xmas-nginx
```

4) **DB 백업 복원** (로컬에서 서버로)
```bash
# 로컬에서 백업 파일 전송
scp backups/server_dump.sql root@149.28.135.147:/tmp/

# 서버에서 복원
docker exec -i xmas-db mysql -u root -p2026 xmas_event < /tmp/server_dump.sql
```

5) **헬스/봇 점검**
- 백엔드 헬스: `curl -f http://localhost:8000/health`
- 프론트 로드: `https://cc-jm.com` 열고 콘솔 에러 없는지 확인
- 봇 로그: `docker logs xmas-telegram-bot --tail 50` 에러 없음 확인

### ⚠️ 체크리스트
- [x] DNS: `cc-jm.com` → `149.28.135.147` (이미 연결됨)
- [ ] HTTPS: 자물쇠 표시, certbot 발급 성공
- [ ] DB: 백업 복원 완료
- [ ] 텔레그램: 웹훅 정상, 로그 에러 없음
- [ ] 기능: 로그인/미션/게임 등 핵심 플로우 스팟 테스트
```

3) **DB 마이그레이션** (적용 전 backup 권장)
```bash
docker exec xmas-backend alembic upgrade head
docker exec xmas-backend alembic current   # head 확인
```

4) **헬스/봇 점검 (신규 서버)**
- 백엔드 헬스: `curl -f http://localhost:8000/health`
- 프론트 로드: 브라우저로 `http://158.247.222.179` 열고 콘솔 에러 없는지 확인
- 텔레그램 웹훅: `curl https://api.telegram.org/bot$TOKEN/getWebhookInfo` → `ip_address`가 `158.247.222.179`, `last_error_*` 없음
- 봇 로그: `docker logs xmas-telegram-bot --tail 50` 에러 없음 확인

5) **DNS 전환**
- A 레코드 `cc-jm.com`, `www.cc-jm.com` → `158.247.222.179`
- 전파 확인: `nslookup cc-jm.com` 결과가 신규 IP로 나올 때까지 대기

6) **최종 검증 후 공지 및 구서버 종료**
- 10~15분 모니터링(프론트/백엔드/봇 응답, 핵심 플로우 스팟 테스트) 후 이상 없을 때 “무중단 전환 및 HTTPS 복원 완료” 공지
- 구서버 종료: `ssh root@149.28.135.147 && cd /root/ch25 && docker compose down`

### ⚠️ 체크리스트
- DNS: `cc-jm.com` → `158.247.222.179`
- HTTPS: 자물쇠 표시, certbot 발급 성공
- DB: `alembic current` == head
- 텔레그램: 웹훅 `ip_address=158.247.222.179`, `last_error` 없음, 로그 에러 없음
- 기능: 로그인/미션/게임 등 경제 변동 없는 경로 최소 스팟 테스트

---

## 8. 변경 이력
- v1.0 (2026-01-09, Antigravity): 고속 배포 전략 수립 및 비용 분석 추가
