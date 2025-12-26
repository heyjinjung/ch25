# Vultr 업로드 & 활성화 (아주 쉽게)

## 준비물
- Vultr 계정과 서버(Cloud Compute) 1대
- 도커/도커 컴포즈가 설치된 서버 이미지 (Ubuntu 22.04 추천)
- 이 저장소 압축본 또는 Git 클론 URL

## 1) 서버 생성
1. Vultr 콘솔에서 Cloud Compute 선택 → Region/Server Type(Ubuntu 22.04) → 생성.
2. Root 비밀번호 또는 SSH 키를 기록해 둡니다.

## 2) 서버 접속
```bash
ssh root@<서버공인IP>
```

## 3) 도커/도커 컴포즈 설치
```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

## 4) 코드 가져오기
- Git로 받기:
```bash
git clone <YOUR_REPO_URL> ch25
cd ch25
```
- 또는 ZIP 업로드 후 `/root/ch25` 등에 풀기.

## 5) 환경 변수 확인
`.env` 파일을 열어 DB/비밀키를 원하는 값으로 설정합니다. (기본: 로컬 개발용 값)

## 6) 컨테이너 빌드/실행
```bash
docker compose build --no-cache
docker compose up -d
```
- 백엔드: 포트 8000, 프론트: 포트 3000 (nginx SSL 템플릿은 무시하고 http://서버IP:3000 으로 접속)

## 7) DB 시드(선택)
필요하면 레벨/랭킹 시드를 넣습니다.
```bash
docker compose cp scripts/seed_ranking_seasonpass.sql db:/tmp/seed.sql
docker compose exec db sh -c "mysql -uroot -proot xmas_event_dev < /tmp/seed.sql"
```

## 8) 상태 확인
```bash
docker compose ps
curl http://localhost:8000/      # 백엔드 헬스
```
브라우저에서 `http://<서버IP>:3000` 접속.

## 9) 자주 묻는 것
- CORS 오류: 백엔드는 `ENV=local`이면 모든 오리진 허용. `.env`에서 ENV=local 유지.
- nginx 재시작 반복: SSL 인증서가 없어서임. 프런트 컨테이너 3000번 포트로 직접 접속하면 됩니다.
- 다시 빌드: `docker compose build --no-cache && docker compose up -d`

## 10) 중지/정리
```bash
docker compose down
```

끝! 이 순서대로 하면 초보도 Vultr에서 바로 띄울 수 있습니다.
