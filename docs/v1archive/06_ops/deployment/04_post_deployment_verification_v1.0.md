# ✅ Post-Deployment Verification Checklist (V1.0)

서버 배포가 완료된 후, 시스템의 각 레이어가 정상적으로 연결되었는지 확인하기 위한 실전 검증 리포트입니다.

## 1. 인프라 및 컨테이너 (Infrastructure Layer)
서버에 SSH 접속 후 아래 명령어를 실행하여 컨테이너 상태를 확인합니다.

| 검증 항목 | 명령어 | 기대 결과 | 상태 |
| :--- | :--- | :--- | :--- |
| **컨테이너 생존** | `docker ps` | 6개 컨테이너(Nginx, BE, FE, DB, Redis, Bot) UP | [ ] |
| **자동 재시작** | `docker inspect -f "{{.State.RestartCount}}" xmas-backend` | 0 또는 낮은 숫자 (반복 재시작 여부 확인) | [ ] |
| **방화벽(UFW)** | `sudo ufw status` | 80, 443, 22번 포트 ALLOW | [ ] |

## 2. 데이터베이스 및 저장소 (Persistence Layer)
데이터가 정상적으로 저장되고 마이그레이션이 되었는지 확인합니다.

| 검증 항목 | 명령어 | 기대 결과 | 상태 |
| :--- | :--- | :--- | :--- |
| **DB 접속** | `docker exec xmas-db mysqladmin -u root -p$(grep MYSQL_ROOT_PASSWORD /opt/xmas-event/.env | cut -d= -f2) ping` | `mysqld is alive` 출력 | [ ] |
| **마이그레이션** | `docker exec xmas-backend alembic current` | 최신 버전 해시값이 표시됨 | [ ] |
| **Redis 연결** | `docker exec xmas-redis redis-cli ping` | `PONG` 출력 | [ ] |

## 3. 백엔드 API 서비스 (Backend Layer)
API가 비즈니스 로직을 정상적으로 처리하는지 확인합니다.

| 검증 항목 | 접근 주소 / 명령어 | 기대 결과 | 상태 |
| :--- | :--- | :--- | :--- |
| **API 헬스체크** | `curl http://localhost:8000/` | `{"message": "XMAS Event API"}` 또는 200 OK | [ ] |
| **DB 연동 테스트** | `curl http://localhost:8000/api/v1/health/db` (있을 경우) | `{"status": "connected"}` | [ ] |
| **로그 점검** | `docker logs --tail 50 xmas-backend` | 에러(Traceback) 없이 정상 로그 출력 | [ ] |

## 4. 프론트엔드 및 사용자 환경 (User Interface Layer)
실제 사용자가 보게 되는 화면과 통신 환경을 점검합니다.

| 검증 항목 | 확인 방법 | 기대 결과 | 상태 |
| :--- | :--- | :--- | :--- |
| **IP 접속** | 브라우저에서 `http://158.247.222.179` 접속 | 화면 로드 성공 | [ ] |
| **도메인 HTTPS 접속** | 브라우저에서 `https://cc-jm.com/` 접속 | TLS 경고/끊김 없이 페이지 로드 | [ ] |
| **HTTPS 헬스체크** | `curl -vk https://cc-jm.com/health` | 200 OK 또는 최소한 TLS handshake 성공(서버 응답 수신) | [ ] |
| **API 통신** | 개발자 도구(F12) -> Network 탭 | `/api/` 요청이 200 OK로 완료됨 | [ ] |
| **Admin API 라우팅(HTML 방지)** | `curl -i http://127.0.0.1/admin/api/ui-config/streak_reward_rules` | `Content-Type: application/json` + (200 또는 401 AUTH_REQUIRED) | [ ] |
| **환경변수 주입** | 브라우저 콘솔에서 `window.__ENV__` 확인 | 서버 IP나 도메인 주소가 주입됨 | [ ] |

---
**검증 일시**: 2026-01-09
**검증자**: Antigravity (AI)
