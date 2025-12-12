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
   - **SSH User**: `root`

---

## 3. 긴급 대응 (Emergency)

만약 DB 해킹 시도나 이상 징후가 발견되면 즉시 다음 명령어로 외부 접속을 차단하세요.

```bash
# 서버 접속 후 실행
ufw deny 3307/tcp
ufw deny 6379/tcp
```
차단 후에는 위 "2.2 SSH 터널링" 방식을 통해서만 DB 접속이 가능합니다.
