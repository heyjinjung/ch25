# V2 어드민 개발/테스트 가이드 (로컬)

대상: 운영/관리자가 로컬에서 V2 어드민 접속 확인을 빠르게 수행하기 위한 1페이지 런북

---

## 0) TL;DR (가장 쉬운 접속)

- 도커(추천): `http://localhost:3000/v2/admin/login`
- nginx 프록시(선택): `http://localhost:8080/v2/admin/login`
- Vite dev(개발용): `http://localhost:5173/v2/admin/login`

> `localhost:5173`이 안 열리면(Vite dev 서버 미실행) `ERR_CONNECTION_REFUSED`가 정상입니다.

---

## 1) 실행 모드 선택

### A. 도커 모드 (운영자/관리자 추천)

- 프론트: `localhost:3000` (컨테이너 nginx가 80을 3000으로 노출)
- 백엔드: `localhost:8000`
- nginx(리버스 프록시): `localhost:8080` (현재 compose 설정 기준)

**기동/재빌드**

- 전체 재빌드/기동:
  - `docker compose up -d --build`
- 프론트만 재빌드/기동:
  - `docker compose up -d --build frontend`
- 백엔드만 재빌드/기동:
  - `docker compose up -d --build backend`

**상태 확인**

- `docker compose ps`
  - 기대: `xmas-frontend`, `xmas-backend`가 `Up` 상태

**접속 링크**

- V2 어드민 로그인: `http://localhost:3000/v2/admin/login`
- V2 어드민 로그인(프록시): `http://localhost:8080/v2/admin/login`

---

### B. 로컬 Vite dev 모드 (프론트 개발용)

Vite dev 서버는 기본 포트가 5173입니다. 이 모드에서는 프론트가 로컬 Node 프로세스로 뜹니다.

**기동**

- `npm run dev -- --host --port 5173`

**포트 체크(선택)**

- `Test-NetConnection -ComputerName localhost -Port 5173 | Format-List`

**접속 링크**

- V2 어드민 로그인: `http://localhost:5173/v2/admin/login`

---

## 2) 로그인 정보 (개발)

- 로그인 폼은 `external_id` + `password`로 `/api/auth/token`을 호출합니다.
- 비밀번호는 DB에 `password_hash`로 저장되므로 “현재 비번을 출력”할 수 없습니다.

**admin 비밀번호 초기화(권장)**

- 아래 커맨드로 `admin` 계정의 비밀번호를 초기화합니다(비밀번호 미설정 상태로 만들기).
- 이후 로그인 화면에서 입력한 비밀번호가 “최초 비밀번호”로 저장됩니다.

```bash
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.models.user import User; db=SessionLocal(); u=db.query(User).filter(User.external_id=='admin').first(); print('found', bool(u)); u.password_hash=None if u else None; db.commit() if u else None; db.close(); print('reset done')"
```

---

## 3) 자주 겪는 문제

### ERR_CONNECTION_REFUSED (5173)

- 원인: Vite dev 서버가 떠있지 않음
- 해결: `npm run dev -- --host --port 5173` 실행 후 재접속

### 로그인 성공했는데 다시 로그인으로 튕김

- 원인: 토큰 없음/만료 또는 401 처리
- 해결: 브라우저 LocalStorage에서 `admin_token` 존재 여부 확인 후 재로그인

---

## 4) 검증 체크리스트 (운영자용)

- [ ] `docker compose ps`에서 backend/frontend가 `Up` 상태
- [ ] `http://localhost:3000/v2/admin/login` 접속됨
- [ ] 로그인 성공 후 `http://localhost:3000/v2/admin/dashboard`로 이동
- [ ] (SUPER_ADMIN) `http://localhost:3000/v2/admin/economy/vault` 접근 가능
