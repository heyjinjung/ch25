[작성일: 2026-01-28]
[작성자: GitHub Copilot]
[검증 상태: 🔴 구현 완료, DB Migration 필요]

---

# V2 Telegram Auth 순수 구현 (V1 의존성 제거)

## 1. 변경 개요

### 목적
- 텔레그램 Mini App 전용 인증 시스템 구축
- V1 (User 테이블) 의존성 완전 제거
- 순수 V2User 기반 인증 체계

### 배경
- 기존: V1 User 테이블 + V2User 동기화 방식
- 문제: V1/V2 이중 관리, 복잡도 증가
- 해결: V2User 단일 출처로 통일

---

## 2. 신규 생성 파일

### 2.1 V2 Telegram 검증 모듈
**파일**: `app/v2/core/telegram.py`

**핵심 변경**:
```python
# 🔴 기존 app/core/telegram.py의 hash 비교 누락 수정
if not hmac.compare_digest(calculated_hash, hash_val):
    raise ValueError("Invalid hash")
```

**추가 기능**:
- `extract_telegram_user()`: initData에서 유저 정보 추출
- `generate_nickname()`: 텔레그램 이름에서 닉네임 생성

---

### 2.2 V2 Auth Event 모델
**파일**: `app/v2/models/auth_event.py`

**DB 테이블**: `v2_user_auth_event`
```sql
CREATE TABLE v2_user_auth_event (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    event_type ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
                     'TOKEN_REFRESH', 'TELEGRAM_LINK', 'TELEGRAM_UNLINK', 'RBAC_DENIED'),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    telegram_id BIGINT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_user_created (user_id, created_at)
);
```

**용도**: 모든 인증 이벤트 감사 로그 (90일 보존)

---

### 2.3 V2 Refresh Token 모델
**파일**: `app/v2/models/refresh_token.py`

**DB 테이블**: `v2_user_refresh_token`
```sql
CREATE TABLE v2_user_refresh_token (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    jti VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_jti (jti),
    INDEX idx_expires_at (expires_at),
    INDEX idx_user_expires (user_id, expires_at)
);
```

**토큰 정책**:
- 만료: 30일
- Sliding Window: 만료 7일 미만 시 자동 갱신
- Revoke 지원: 로그아웃 시 `revoked_at` 업데이트

---

### 2.4 V2 Auth Service 확장
**파일**: `app/v2/services/auth_service.py`

**추가 함수**:
- `log_auth_event()`: 인증 이벤트 기록
- `create_refresh_token()`: Refresh Token 생성
- `decode_refresh_token()`: Refresh Token 검증

**추가 메서드**:
- `V2AuthService.issue_tokens()`: Access + Refresh Token 동시 발급
- `V2AuthService.refresh_access_token()`: Token 갱신 (7일 미만 시 새 Refresh Token)
- `V2AuthService.revoke_refresh_token()`: 로그아웃 (단일/전체 폐기)

---

### 2.5 V2 Telegram Routes (순수 V2)
**파일**: `app/v2/api/telegram_routes.py`

**엔드포인트**: `POST /api/v2/telegram/auth`

**V1 의존성 제거**:
```python
# ❌ 기존 (V1 의존)
from app.models.user import User
user = db.query(User).filter(User.telegram_id == tg_id).first()

# ✅ 신규 (순수 V2)
from app.v2.models.user import V2User
v2_user = db.query(V2User).filter(V2User.telegram_id == tg_id).first()
```

**플로우**:
1. initData 검증 (hash 비교 포함)
2. V2User 조회 (telegram_id)
3. 신규 유저: V2User 생성 (cc_id: `tg_{tg_id}_{uuid8}`)
4. 기존 유저: V2User 업데이트
5. Access + Refresh Token 발급
6. 로그인 이벤트 기록
7. LOGIN 미션 트리거

---

### 2.6 V2 Auth Routes 확장
**파일**: `app/v2/api/auth_routes.py`

**수정 엔드포인트**:

#### POST /api/v2/auth/refresh
```python
# Request
{
  "refresh_token": "eyJ..."
}

# Response
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token or same",  # 7일 미만 시 갱신
  "user": { ... }
}
```

#### POST /api/v2/auth/logout
```python
# Request
{
  "refresh_token": "eyJ..." or null,
  "revoke_all": false  # true 시 모든 토큰 폐기
}

# Response
{
  "success": true,
  "revoked_count": 1
}
```

---

## 3. 수정된 파일

### 3.1 V2 API Routes
**파일**: `app/v2/api/routes.py`

**변경**:
```python
from app.v2.api.telegram_routes import router as telegram_router
router.include_router(telegram_router)
```

---

### 3.2 V2 Models Init
**파일**: `app/v2/models/__init__.py`

**추가**:
```python
from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType
from app.v2.models.refresh_token import V2UserRefreshToken

__all__ = [
    # ...
    "V2UserAuthEvent",
    "AuthEventType",
    "V2UserRefreshToken",
]
```

---

## 4. V1 vs V2 비교

| 항목 | V1 (기존) | V2 (신규) |
|------|----------|----------|
| 유저 테이블 | User (V1) | V2User (순수 V2) |
| 의존성 | app.models.user | app.v2.models.user |
| 동기화 | User ↔ V2User 이중 관리 | V2User 단일 출처 |
| Auth Event | UserEventLog (V1) | V2UserAuthEvent (V2) |
| Refresh Token | 미구현 | V2UserRefreshToken (신규) |
| Hash 검증 | 누락 (보안 취약) | 구현 (HMAC-SHA256) |

---

## 5. DB Migration 필요

### 5.1 v2_user_auth_event 테이블 생성
```bash
alembic revision --autogenerate -m "add_v2_user_auth_event_table"
alembic upgrade head
```

### 5.2 v2_user_refresh_token 테이블 생성
```bash
alembic revision --autogenerate -m "add_v2_user_refresh_token_table"
alembic upgrade head
```

---

## 6. 테스트 필요 항목

### 6.1 기능 테스트
- [ ] Telegram 신규 유저 생성 (V2User)
- [ ] Telegram 기존 유저 로그인
- [ ] initData hash 검증 실패 → 400
- [ ] Access Token 발급
- [ ] Refresh Token 발급
- [ ] Refresh Token으로 Access Token 갱신
- [ ] 만료 7일 미만 시 새 Refresh Token 발급
- [ ] 로그아웃 → Refresh Token 무효화
- [ ] 로그인 이벤트 기록 (v2_user_auth_event)

### 6.2 통합 테스트
- [ ] V2User 생성 → V2Vault 0원 초기화
- [ ] 로그인 → LOGIN 미션 진행
- [ ] 추천인 코드 (ref_*) → INVITE_FRIEND 미션
- [ ] DEV 환경에서 TEST_MODE 우회

---

## 7. 기존 시스템과의 호환성

### 7.1 V1 User 테이블 미사용
- ✅ V2User 단독 사용
- ✅ telegram_id 컬럼 활용 (V2User에 존재)
- ✅ V1 의존성 제거 완료

### 7.2 기존 V1 엔드포인트 유지
- `/api/telegram/auth` (V1) → User 테이블 사용
- `/api/v2/telegram/auth` (V2) → V2User 테이블 사용
- 병행 운영 가능 (점진적 이관)

---

## 8. 보안 강화 사항

### 8.1 Telegram initData 검증
- ✅ HMAC-SHA256 서명 검증
- ✅ hash 비교 로직 추가 (기존 누락)
- ✅ 검증 실패 시 로그 기록

### 8.2 Refresh Token 보안
- ✅ JWT jti (Token ID) 기반 관리
- ✅ DB 기반 폐기 (블랙리스트)
- ✅ Sliding Window (7일 미만 시 갱신)
- ✅ 로그아웃 시 즉시 무효화

### 8.3 감사 로그
- ✅ 모든 인증 이벤트 기록
- ✅ IP, User-Agent 기록
- ✅ 성공/실패 구분
- ✅ 90일 보존 정책

---

## 9. 운영 체크리스트

### 배포 전
- [ ] `TELEGRAM_BOT_TOKEN` 환경변수 설정
- [ ] `JWT_SECRET` 환경변수 설정
- [ ] DB Migration 실행 (v2_user_auth_event, v2_user_refresh_token)
- [ ] TEST_MODE=false (PROD 환경)

### 배포 후
- [ ] `/api/v2/telegram/auth` 200 응답 확인
- [ ] V2User 생성 확인
- [ ] v2_user_auth_event 기록 확인
- [ ] v2_user_refresh_token 생성 확인
- [ ] Refresh Token 갱신 테스트
- [ ] 로그아웃 → Revoke 확인

---

## 10. 롤백 계획

### 긴급 롤백 시나리오
**증상**: Telegram 인증 실패율 급증

**대응**:
1. `/api/telegram/auth` (V1) 사용 권장 (기존 엔드포인트)
2. V2 엔드포인트 일시 비활성화
3. 로그 수집 후 원인 분석

### 부분 롤백
- v2_user_auth_event 기록 비활성화 (데이터 유지)
- Refresh Token 미사용 (Access Token만 발급)

---

## 11. 향후 확장 계획

### Phase 2 (미래)
- [ ] Redis 세션 추적
- [ ] 디바이스 관리 (v2_user_device 테이블)
- [ ] FCM 푸시 알림 연동
- [ ] Access Token 만료 시간 단축 (1440분 → 15분)

### Phase 3 (미래)
- [ ] V1 User 테이블 완전 폐기
- [ ] V2User로 전체 시스템 통합
- [ ] 레거시 엔드포인트 제거

---

## 12. 참고 문서

- [V2 Telegram Auth SoT](../../../v2_telegram_auth_sot_ko.md)
- [V2 Auth 트러블 매핑표](../../../90_troubleshooting/v2_auth_trouble_mapping_ko.md)
- [V2 Auth 기술 가이드](../../../v2_auth_technical_guide_ko.md)
- [Telegram 공식 문서](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

---

## 13. 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-01-28 | GitHub Copilot | 최초 작성, V1 의존성 제거 완료 |
