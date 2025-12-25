# 보안 및 배포 설정 현황 (Security & Deployment Status)

**작성일**: 2025-12-11
**프로젝트**: XMAS 1Week Event System
**도메인**: `cc-jm.com`

---

## 1. 현재 적용된 설정 (Applied Configurations)

### 1.1 도메인 및 CORS 설정
- **도메인 연결**: `cc-jm.com`이 서버 IP(`149.28.135.147`)로 연결됨.
- **CORS 허용**: 백엔드(`app/main.py`)에서 `cc-jm.com` 및 `www.cc-jm.com` (HTTP/HTTPS)에서의 API 요청을 허용하도록 설정함.
  - **참고**: `.env` 설정과 무관하게 코드 레벨에서 강제로 허용 목록에 추가됨.

### 1.2 방화벽 (Firewall)
- **웹 포트**: `80` (HTTP), `443` (HTTPS) 포트 개방 완료 (`ufw allow`).
- **DB 포트**: 현재 `3307` (MySQL), `6379` (Redis) 포트가 **전체 개방**되어 있음. (개발 편의를 위해 유지 중)

---

## 2. 추후 적용 권장 사항 (Recommended for Future)

**주의**: 본 프로젝트는 1주일 단기 이벤트이므로 편의성을 위해 일부 보안 설정을 유보했으나, 공격 위험이 감지되거나 운영 기간이 연장될 경우 아래 설정을 즉시 적용해야 합니다.

### 2.1 HTTPS (자물쇠) 적용
현재 `http://cc-jm.com`으로 접속되며 "주의 요함"이 표시됩니다.
- **적용 방법**: `certbot`을 이용해 무료 SSL 인증서 발급 필요.
- **참고 문서**: `docs/SECURITY_GUIDE.md`의 "1. HTTPS 설정" 섹션 참고.

### 2.2 데이터베이스 보안 강화 (SSH 터널링)
현재 VPN 사용으로 인해 접속 IP가 유동적이므로, 특정 IP 차단 방식보다는 **SSH 터널링** 방식이 적합합니다.

**적용 시나리오:**
1. **서버 설정**:
   - `docker-compose.yml`에서 `db` 서비스의 `ports` 섹션 제거 (외부 접속 차단).
   - 또는 `ufw` 방화벽에서 `3307`, `6379` 포트 차단 (`ufw deny 3307` 등).
2. **접속 방법 (관리자)**:
   - DBeaver 등 DB 툴에서 **SSH Tunnel** 기능 사용.
   - **Host/IP**: `localhost` (터널링을 통하므로)
   - **Port**: `3306` (컨테이너 내부 포트)
   - **SSH Host**: `149.28.135.147`
   # Security & Deployment Status
   문서 타입: 상태 보고서
   버전: v1.1
   작성일: 2025-12-25
   작성자: 시스템 설계팀
   대상 독자: 인프라/보안/운영 담당자
   프로젝트: XMAS 1Week Event System
   도메인: cc-jm.com

   ## 1. 목적 (Purpose)
   - 현재 적용된 배포/보안 설정과 향후 권장 조치를 명확히 공유한다.

   ## 2. 범위 (Scope)
   - 도메인/CORS, 방화벽 개방 현황, HTTPS/DB 보안 권장, 긴급 대응 절차를 포함한다.

   ## 3. 현재 적용된 설정
   ### 3.1 도메인 및 CORS
   - 도메인 `cc-jm.com`이 서버 IP(`149.28.135.147`)로 연결됨.
   - 백엔드(`app/main.py`)에서 `cc-jm.com`, `www.cc-jm.com` HTTP/HTTPS 요청을 CORS 허용(코드 레벨 강제, `.env` 무관).

   ### 3.2 방화벽
   - 웹 포트: 80(HTTP), 443(HTTPS) 개방 완료(`ufw allow`).
   - DB 포트: 3307(MySQL), 6379(Redis) 전체 개방 상태(개발 편의 목적).

   ## 4. 향후 적용 권장
   > 단기 이벤트라 일부 보안을 유보했으나, 공격 징후 또는 운영 연장 시 즉시 적용.

   ### 4.1 HTTPS 적용
   - 현 상태: `http://cc-jm.com` 접속 시 브라우저 경고.
   - 조치: `certbot`으로 무료 SSL 발급 후 적용.
   - 참고: [docs/SECURITY_GUIDE.md](./SECURITY_GUIDE.md) 1. HTTPS 설정.

   ### 4.2 DB 보안(SSH 터널링)
   - 이유: VPN으로 접속 IP 유동 → IP 화이트리스트보다 SSH 터널링 적합.
   - 서버 조치: `docker-compose.yml`의 `db` 포트 매핑 제거 또는 `ufw deny 3307`, `ufw deny 6379`.
   - 관리자 접속 예: DB 툴 SSH 터널링
      - Host/IP: `localhost`
      - Port: `3306`(컨테이너 내부)
      - SSH Host: `149.28.135.147`
      - SSH User: `root`

   ## 5. 긴급 대응
   DB 해킹 시도 등 이상 징후 발생 시 외부 접속 즉시 차단:
   ```bash
   ufw deny 3307/tcp
   ufw deny 6379/tcp
   ```
   차단 후에는 4.2의 SSH 터널링 방식만 허용.

   ## 6. 변경 이력
   - v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, 목적/범위 추가, 긴급 대응 강조.
   - v1.0 (2025-12-11, 시스템 설계팀): 최초 작성.
