# 서버 업데이트 Runbook (git pull + docker compose)

이 문서는 Ubuntu 22.04 서버에서 이 프로젝트를 **DB 데이터 유지**한 채로 코드 업데이트( git pull )하고 컨테이너를 재빌드/재시작하는 절차입니다.

중요
- 이 문서/명령은 **볼륨을 삭제하지 않습니다**. `docker compose down -v`는 절대 실행하지 마세요.
- 서버 자격 증명(특히 root 비밀번호)을 채팅/로그에 남기지 마세요. 이미 노출됐다면 즉시 교체를 권장합니다.

## 0) 전제
- 배포는 `docker compose` 기반
- 서버에서 프로젝트 경로는 환경마다 다를 수 있습니다.
  - 예: 이 서버는 `/root/ch25`
  - 아래 명령에서 `APP_DIR`만 맞게 바꿔서 사용하세요.

권장: 먼저 프로젝트 경로를 찾습니다.

```bash
# docker-compose.yml이 있는 폴더를 찾기 (시간이 오래 걸릴 수 있어 /opt, /root 위주)
find /opt /root -maxdepth 3 -type f -name docker-compose.yml 2>/dev/null
```

## 1) 환경값(키만) 점검
값은 숨기고 키만 출력합니다.

```bash
APP_DIR="/opt/xmas-event"   # 필요 시 /root/ch25 등으로 수정
grep -vE '^\s*#|^\s*$' "$APP_DIR/.env" | sed -E 's/=.*$//' | sort -u
```

## 2) 권장 .env 값(서버용)
프런트는 nginx가 `/api`, `/admin/api`를 백엔드로 프록시하므로 **상대경로가 가장 안전**합니다.

- `VITE_API_URL=/api`
- `VITE_ADMIN_API_URL=/admin/api`
- `VITE_ENV=production`

`docker-compose.yml`이 변수 치환에 쓰는 값들은 `.env`에 있어야 합니다:
- `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS` (예: IP로 접속하면 `[
  "http://149.28.135.147"
]` 처럼)

## 3) 업데이트 전 Git 상태 백업(강력 권장)
서버가 원격(origin)보다 앞서 있거나(커밋 ahead), 작업 중 변경사항이 있을 수 있습니다.
업데이트 전에 서버 상태를 안전하게 백업해 두면 충돌/롤백이 쉬워집니다.

```bash
APP_DIR="/opt/xmas-event"   # 필요 시 /root/ch25 등으로 수정
cd "$APP_DIR" || exit 1

mkdir -p /root/backups/git

echo "== git status =="
git status

echo "== save last commit as patch (if any) =="
git format-patch -1 HEAD -o /root/backups/git >/dev/null 2>&1 || true

echo "== stash working tree (including untracked) =="
git stash push -u -m "pre-update $(date +%Y%m%d_%H%M%S)" || true

echo "== done =="
ls -lah /root/backups/git || true
```

## 4) 업데이트 전 DB 백업(필수)
```bash
APP_DIR="/opt/xmas-event"   # 필요 시 /root/ch25 등으로 수정
cd "$APP_DIR" || exit 1
sudo bash ./scripts/backup.sh
```

## 5) 업데이트(권장)
```bash
APP_DIR="/opt/xmas-event"   # 필요 시 /root/ch25 등으로 수정
cd "$APP_DIR" || exit 1
sudo bash ./scripts/update.sh
```

## 6) 헬스 체크
```bash
curl -f http://127.0.0.1/health
(docker compose ps || docker-compose ps)
```

## 7) DB 복구(필요할 때만)
**기존 데이터 유지가 목표라면 보통 복구는 하지 않습니다.**
백업 파일로 덮어써야 하는 경우에만 사용하세요.

```bash
# 예시: /root/backups/xmas-event/db_backup_YYYYmmdd_HHMMSS.sql.gz
BACKUP_FILE="/root/backups/xmas-event/db_backup_YYYYmmdd_HHMMSS.sql.gz"

APP_DIR="/opt/xmas-event"   # 필요 시 /root/ch25 등으로 수정
cd "$APP_DIR" || exit 1
zcat "$BACKUP_FILE" | (docker compose exec -T db sh -lc 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' || docker-compose exec -T db sh -lc 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"')
```
