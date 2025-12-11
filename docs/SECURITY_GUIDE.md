# 보안 설정 가이드 (Security Guide)

이 문서는 서비스의 보안을 강화하기 위한 HTTPS 설정과 데이터베이스 포트 접근 제어 방법을 설명합니다.

## 1. HTTPS 설정 (SSL 인증서 적용)

도메인을 연결한다고 해서 자동으로 자물쇠(🔒)가 생기는 것은 아닙니다. **SSL 인증서**를 발급받고 웹 서버(Nginx)에 적용해야 합니다.

### 사전 준비
1. 도메인 구입 및 DNS 설정 (A 레코드에 서버 IP 연결)
2. 서버에 SSH 접속 가능 상태

### 설정 방법 (Certbot 사용)
가장 간편한 방법은 무료 인증서 발급 도구인 `certbot`을 사용하는 것입니다.

1. **서버 접속**
   ```bash
   ssh root@<서버IP>
   ```

2. **Certbot 설치 및 인증서 발급**
   (현재 Docker 환경이므로, 호스트 머신에서 직접 certbot을 돌리거나 docker-compose에 certbot 컨테이너를 추가하는 방법이 있습니다. 여기서는 호스트 머신 방식을 예시로 듭니다.)

   ```bash
   # Ubuntu/Debian 예시
   apt-get update
   apt-get install certbot python3-certbot-nginx
   
   # 인증서 발급 (Nginx가 80포트를 쓰고 있다면 잠시 중지해야 할 수도 있습니다)
   certbot certonly --standalone -d yourdomain.com
   ```

3. **Nginx 설정 변경 (`nginx/frontend.conf`)**
   인증서 파일(`fullchain.pem`, `privkey.pem`) 경로를 Nginx 설정에 추가해야 합니다.

   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       
       # ... 나머지 설정 ...
   }
   
   # HTTP -> HTTPS 리다이렉트
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$host$request_uri;
   }
   ```

4. **Docker 볼륨 연결**
   `docker-compose.yml`에서 Nginx 컨테이너에 인증서 폴더를 마운트해야 합니다.
   ```yaml
   services:
     nginx:
       volumes:
         - /etc/letsencrypt:/etc/letsencrypt
   ```

---

## 2. 데이터베이스 포트 접근 제어 (DB Port Security)

데이터베이스(3307)와 Redis(6379) 포트가 전 세계에 열려 있으면 해킹 위험이 매우 높습니다. 특정 IP에서만 접속하도록 제한해야 합니다.

### 방법 A: Docker Compose에서 외부 접속 차단 (권장)
외부에서 DB 툴(DBeaver 등)로 직접 접속할 일이 없다면, 아예 외부 포트를 닫는 것이 가장 안전합니다.

**`docker-compose.yml` 수정:**
```yaml
services:
  db:
    # ports:
    #   - "3307:3306"  <-- 이 부분을 주석 처리하거나 삭제
    # 만약 로컬(서버 내부)에서만 테스트하려면:
    ports:
      - "127.0.0.1:3307:3306"
```
이렇게 하면 서버 내부(또는 SSH 터널링)에서만 접속 가능하고, 인터넷을 통한 직접 접속은 불가능해집니다.

### 방법 B: Vultr 방화벽(Firewall) 설정
특정 IP(예: 개발자 사무실 IP)에서만 DB에 접속해야 한다면, 클라우드 방화벽을 사용합니다.

1. **Vultr 관리자 페이지 접속**
2. **Firewall** 메뉴 이동 -> **Add Firewall Group** 생성
3. **Inbound Rules** 추가:
   - **Protocol**: TCP
   - **Port**: 3307 (MySQL), 6379 (Redis)
   - **Source**: `Specific IP` 선택 후 허용할 IP 주소 입력 (예: 211.xxx.xxx.xxx)
4. **서버에 방화벽 그룹 적용**:
   - Server Details -> Settings -> Firewall -> 생성한 그룹 선택 -> Update

### 방법 C: SSH 터널링 사용 (가장 안전한 원격 접속)
포트를 아예 닫아두고(방법 A), DB 접속이 필요할 때만 SSH를 통해 안전하게 접속하는 방법입니다.

**DBeaver 등 DB 툴 설정:**
1. **Connection Settings**: `localhost`, Port `3306` (컨테이너 내부 포트)
2. **SSH 탭**:
   - Use SSH Tunnel 체크
   - Host/IP: 서버 IP (149.28.135.147)
   - User Name: root
   - Authentication Method: Public Key (또는 Password)

이 방식을 쓰면 방화벽 구멍을 뚫을 필요 없이 안전하게 DB 관리가 가능합니다.
