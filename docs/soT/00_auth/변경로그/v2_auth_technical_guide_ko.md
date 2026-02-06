문서 타입: 기술 가이드
버전: v1.1
작성일: 2026-01-28
수정일: 2026-01-29
작성자: GitHub Copilot
대상: BE 개발자
상태: 구현 완료 ✅

---

# V2 Auth 실제 구현 기술 디테일 가이드

## 1. Telegram initData 검증 상세

### 1.1 검증 알고리즘 (Telegram 공식)

Telegram 공식 문서: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

```
1. initData에서 'hash' 필드 추출 및 제거
2. 나머지 필드를 key=value 형식으로 알파벳순 정렬
3. '\n'으로 연결하여 data_check_string 생성
4. secret_key = HMAC-SHA256("WebAppData", bot_token)
5. calculated_hash = HMAC-SHA256(secret_key, data_check_string)
6. calculated_hash == provided_hash 검증
```

### 1.2 기존 문제점 (수정됨 ✅)

기존 `app/core/telegram.py`에서는 calculated_hash와 hash_val 비교가 누락되어 있었음.
이제 `app/v2/core/telegram.py`에서 정상적으로 구현됨.

### 1.3 현재 구현 (`app/v2/core/telegram.py`) ✅

```python
"""
V2 Telegram Mini App initData 검증 모듈

Telegram 공식 문서 기반 HMAC-SHA256 서명 검증
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from app.core.config import get_settings


def validate_init_data(init_data: str) -> dict:
    """
    Telegram Mini App initData 서명 검증

    Args:
        init_data: URL-encoded query string (hash 포함)

    Returns:
        dict: 검증된 데이터 (user 필드는 JSON 파싱됨)

    Raises:
        ValueError: 검증 실패 시
    """
    settings = get_settings()

    # TEST_MODE: Mock 데이터 반환
    if not settings.telegram_bot_token:
        if settings.test_mode:
            return {
                "user": {"id": 1234567, "username": "test_user", "first_name": "Test"},
                "auth_date": "1706432000",
            }
        raise ValueError("TELEGRAM_BOT_TOKEN not configured")

    # 1. initData 파싱
    vals = dict(parse_qsl(init_data))

    # 2. hash 추출 및 제거
    hash_val = vals.pop('hash', None)
    if not hash_val:
        raise ValueError("Missing hash in initData")

    # 3. data_check_string 생성 (알파벳순 정렬, \n 구분)
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])

    # 4. secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        settings.telegram_bot_token.encode(),
        hashlib.sha256
    ).digest()

    # 5. calculated_hash = HMAC-SHA256(secret_key, data_check_string)
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    # 6. 🔴 hash 비교 (핵심 수정)
    if not hmac.compare_digest(calculated_hash, hash_val):
        raise ValueError("Invalid hash")

    # 7. user 필드 JSON 파싱
    if 'user' in vals:
        try:
            vals['user'] = json.loads(vals['user'])
        except json.JSONDecodeError:
            raise ValueError("Invalid user JSON in initData")

    return vals


def extract_telegram_user(validated_data: dict) -> dict:
    """
    검증된 initData에서 Telegram 유저 정보 추출

    Args:
        validated_data: validate_init_data() 결과

    Returns:
        dict: {id, username, first_name, last_name, language_code, ...}
    """
    user = validated_data.get('user')
    if not user:
        raise ValueError("No user data in initData")

    if isinstance(user, str):
        user = json.loads(user)

    return user
```

### 1.4 에러 처리 패턴

```python
# app/v2/api/telegram_routes.py

from fastapi import HTTPException
from app.v2.core import telegram as v2_telegram

@router.post("/auth")
def telegram_auth(payload: TelegramAuthRequest, request: Request, db: Session = Depends(get_db)):
    try:
        validated_data = v2_telegram.validate_init_data(payload.init_data)
        tg_user = v2_telegram.extract_telegram_user(validated_data)
    except ValueError as e:
        # 로그인 실패 이벤트 기록
        log_auth_event(
            db=db,
            user_id=0,
            event_type=AuthEventType.LOGIN_FAILED,
            ip_address=request.client.host if request.client else None,
            error_message=str(e),
            success=False,
        )
        raise HTTPException(status_code=400, detail=str(e))

    tg_id = tg_user.get('id')
    # ... 이후 로직
```

---

## 2. JWT 토큰 구조 및 클레임

### 2.1 Access Token 구조

```json
{
  "sub": "123",           // user_id (string, 필수)
  "iat": 1706432000,      // 발급 시각 (Unix timestamp, 필수)
  "exp": 1706432900,      // 만료 시각 (iat + 15분, 필수)
  "typ": "access",        // 토큰 타입 (필수)
  "role": "ADMIN",        // 관리자 역할 (optional)
  "roles": ["ADMIN"]      // 역할 배열 (optional)
}
```

### 2.2 Refresh Token 구조

```json
{
  "sub": "123",           // user_id (string, 필수)
  "iat": 1706432000,      // 발급 시각 (필수)
  "exp": 1709024000,      // 만료 시각 (iat + 30일, 필수)
  "typ": "refresh",       // 토큰 타입 (필수)
  "jti": "abc123..."      // 토큰 고유 ID (UUID, 필수)
}
```

### 2.3 Access Token 생성 (현재 구현)

```python
# app/core/security.py Line 12-31

def create_access_token(
    user_id: int,
    expires_minutes: int | None = None,
    role: str | None = None,
    roles: list[str] | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire_delta = timedelta(minutes=expires_minutes or settings.jwt_expire_minutes)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + expire_delta,
        "typ": "access",
    }

    if role:
        payload["role"] = role
    if roles:
        payload["roles"] = roles
    elif role:
        payload["roles"] = [role]

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token
```

### 2.4 Refresh Token 생성 (신규 구현)

```python
# app/v2/services/auth_service.py (확장)

import uuid
from datetime import datetime, timedelta, timezone

def create_refresh_token(
    user_id: int,
    expires_days: int = 30,
) -> tuple[str, str]:
    """
    Refresh Token 생성

    Args:
        user_id: 유저 ID
        expires_days: 만료 일수 (기본 30일)

    Returns:
        tuple[str, str]: (token, jti)
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=expires_days),
        "typ": "refresh",
        "jti": jti,
    }

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti
```

### 2.5 토큰 검증

```python
# app/core/security.py Line 62-80

def decode_access_token(token: str) -> Dict[str, Any]:
    """Access Token 검증 및 디코딩"""
    payload = _decode_token(token)

    typ = payload.get("typ")
    if typ not in (None, "access"):  # None: 레거시 호환
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")

    return payload


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """Refresh Token 검증 및 디코딩"""
    payload = _decode_token(token)

    typ = payload.get("typ")
    if typ != "refresh":
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")

    return payload


def _decode_token(token: str) -> Dict[str, Any]:
    """공통 토큰 디코딩"""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRED")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")
```

---

## 3. RBAC 미들웨어 구현

### 3.1 현재 구현 (`app/api/deps.py`)

```python
# Line 69-111

def get_current_admin_info(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> tuple[int, str]:
    """
    Admin 인증 검증

    Returns:
        tuple[int, str]: (admin_id, role)

    Raises:
        HTTPException 401: 토큰 없음/무효
        HTTPException 403: 관리자 권한 없음
    """
    # 1. Bearer Token 검증
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="AUTH_REQUIRED")

    # 2. JWT 검증 및 user_id 추출
    admin_id = get_current_user_id(db=db, credentials=credentials)
    payload = decode_access_token(credentials.credentials)

    # 3. JWT claim에서 role 추출
    role = payload.get("role")
    roles = payload.get("roles")
    if isinstance(roles, list) and roles:
        role = roles[0]  # 첫 번째 역할 사용

    role_str = str(role).upper() if role else None

    # 4. claim에 없으면 AdminUserProfile.tags에서 검색
    if not role_str:
        from app.models.admin_user_profile import AdminUserProfile
        profile = db.query(AdminUserProfile).filter(
            AdminUserProfile.user_id == admin_id
        ).first()

        if profile and isinstance(profile.tags, list):
            tag_role = next(
                (t for t in profile.tags if isinstance(t, str) and t.upper().startswith("ROLE_")),
                None
            )
            if tag_role:
                role_str = tag_role.replace("ROLE_", "", 1).upper()

    # 5. role 없으면 403
    if not role_str:
        raise HTTPException(status_code=403, detail="ADMIN_REQUIRED")

    # 6. SUPER_ADMIN → ADMIN 정규화
    if role_str == "SUPER_ADMIN":
        role_str = "ADMIN"

    return admin_id, role_str
```

### 3.2 RBAC 로깅 추가 (확장)

```python
# app/api/deps.py (수정)

from app.v2.services.auth_service import log_auth_event
from app.v2.models.auth_event import AuthEventType

def get_current_admin_info(
    request: Request,  # 추가
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> tuple[int, str]:
    # ... 기존 로직 ...

    # 5. role 없으면 403 + 이벤트 기록
    if not role_str:
        log_auth_event(
            db=db,
            user_id=admin_id,
            event_type=AuthEventType.RBAC_DENIED,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            success=False,
            error_message="ADMIN_REQUIRED",
        )
        raise HTTPException(status_code=403, detail="ADMIN_REQUIRED")

    # ... 이후 로직 ...
```

### 3.3 Admin API 적용 예시

```python
# app/v2/api/admin/user_routes.py

from app.api.deps import get_current_admin_info

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, role = admin_info

    # 권한별 분기 (필요시)
    if role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="INSUFFICIENT_PERMISSION")

    # ... 유저 목록 조회 로직 ...
```

---

## 4. 환경별 인증 제한

### 4.1 현재 DEV 로그인 환경 제한

```python
# app/v2/api/dev_login.py (현재 구현)

@router.post("/login", response_model=DevLoginResponse)
def dev_login(
    payload: DevLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    settings = get_settings()

    # 명시적 플래그(우선) 또는 env 체크(폴백)
    is_dev_env = settings.env in ["local", "development", "dev"]
    if not settings.dev_login_enabled and not is_dev_env:
        raise HTTPException(status_code=403, detail="DEV_LOGIN_DISABLED")

    # ... 이후 로직 ...
```

> [!IMPORTANT]
> 코드 파일은 존재하나, `app/v2/api/routes.py`에 `dev_login` 라우터 include가 누락되어 있으면 실제 `/api/v2/dev/login`은 404가 될 수 있다.
> (운영/문서 정합성 관점에서 라우터 등록 여부를 반드시 확인)

### 4.2 명시적 플래그 + V2 만료 설정 (현재 구현 ✅)

```python
# app/core/config.py (현재 구현 발췌)

class Settings(BaseSettings):
    # ... 기존 설정 ...

    dev_login_enabled: bool = Field(
        False,
        validation_alias=AliasChoices("DEV_LOGIN_ENABLED", "dev_login_enabled"),
    )

    v2_access_token_expire_minutes: int = Field(
        15,
        validation_alias=AliasChoices(
            "V2_ACCESS_TOKEN_EXPIRE_MINUTES",
            "v2_access_token_expire_minutes",
        ),
    )
```

### 4.3 DEV 로그인 검증 (요약)

```python
# app/v2/api/dev_login.py

@router.post("/login", response_model=DevLoginResponse)
def dev_login(...):
    settings = get_settings()

    is_dev_env = settings.env in ["local", "development", "dev"]
    if not settings.dev_login_enabled and not is_dev_env:
        raise HTTPException(status_code=403, detail="DEV_LOGIN_DISABLED")

    # ... 이후 로직 ...
```

### 4.4 환경별 설정 예시

```bash
# .env.local
DEV_LOGIN_ENABLED=true
TEST_MODE=true
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15

# .env.production
DEV_LOGIN_ENABLED=false
TEST_MODE=false
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15
TELEGRAM_BOT_TOKEN=123456:ABC...
```

---

## 5. 로그인 이벤트 기록 구현

### 5.1 DB 모델 (`app/v2/models/auth_event.py` 신규)

```python
"""
V2 Auth Event 모델

로그인/로그아웃/토큰갱신 등 인증 이벤트 기록
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, Integer, String, Index
from app.db.base_class import Base


class AuthEventType(str, PyEnum):
    """인증 이벤트 타입"""
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    TELEGRAM_LINK = "TELEGRAM_LINK"
    TELEGRAM_UNLINK = "TELEGRAM_UNLINK"
    RBAC_DENIED = "RBAC_DENIED"


class V2UserAuthEvent(Base):
    """V2 유저 인증 이벤트 로그"""
    __tablename__ = "v2_user_auth_event"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    event_type = Column(Enum(AuthEventType), nullable=False)
    ip_address = Column(String(45), nullable=True)  # IPv6 지원
    user_agent = Column(String(500), nullable=True)
    telegram_id = Column(BigInteger, nullable=True)
    success = Column(Boolean, nullable=False, default=True)
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('idx_v2_user_auth_event_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self):
        return f"<V2UserAuthEvent(id={self.id}, user_id={self.user_id}, event_type={self.event_type})>"
```

### 5.2 헬퍼 함수 (`app/v2/services/auth_service.py` 확장)

```python
from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType


def log_auth_event(
    db: Session,
    user_id: int,
    event_type: AuthEventType,
    ip_address: str | None = None,
    user_agent: str | None = None,
    telegram_id: int | None = None,
    success: bool = True,
    error_message: str | None = None,
) -> V2UserAuthEvent:
    """
    인증 이벤트 기록

    Args:
        db: DB 세션
        user_id: 유저 ID (실패 시 0)
        event_type: 이벤트 타입
        ip_address: 클라이언트 IP
        user_agent: User-Agent 헤더
        telegram_id: 텔레그램 유저 ID
        success: 성공 여부
        error_message: 실패 시 에러 메시지

    Returns:
        V2UserAuthEvent: 생성된 이벤트 레코드
    """
    event = V2UserAuthEvent(
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,  # 길이 제한
        telegram_id=telegram_id,
        success=success,
        error_message=error_message[:500] if error_message else None,
    )
    db.add(event)
    db.commit()
    return event
```

### 5.3 Telegram 인증 시 기록

```python
# app/v2/api/telegram_routes.py

from app.v2.services.auth_service import log_auth_event
from app.v2.models.auth_event import AuthEventType

@router.post("/auth", response_model=TelegramAuthResponse)
def telegram_auth(
    payload: TelegramAuthRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    # 1. initData 검증
    try:
        validated_data = v2_telegram.validate_init_data(payload.init_data)
        tg_user = v2_telegram.extract_telegram_user(validated_data)
    except ValueError as e:
        # 실패 이벤트 기록
        log_auth_event(
            db=db,
            user_id=0,
            event_type=AuthEventType.LOGIN_FAILED,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))

    tg_id = tg_user.get('id')

    # 2. 유저 조회/생성 로직 ...

    # 3. 로그인 성공 이벤트 기록
    log_auth_event(
        db=db,
        user_id=user.id,
        event_type=AuthEventType.LOGIN_SUCCESS,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        telegram_id=tg_id,
        success=True,
    )

    # 4. 토큰 발급 및 응답 ...
```

---

## 6. Refresh Token 구현 가이드

### 6.1 DB 모델 (`app/v2/models/refresh_token.py` 신규)

```python
"""
V2 Refresh Token 모델

30일 sliding window Refresh Token 저장
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Index
from app.db.base_class import Base


class V2UserRefreshToken(Base):
    """V2 유저 Refresh Token"""
    __tablename__ = "v2_user_refresh_token"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    jti = Column(String(64), nullable=False, unique=True, index=True)  # UUID
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)  # NULL이면 유효
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_v2_refresh_token_user_expires', 'user_id', 'expires_at'),
    )

    @property
    def is_valid(self) -> bool:
        """토큰 유효성 확인"""
        if self.revoked_at is not None:
            return False
        if self.expires_at < datetime.utcnow():
            return False
        return True

    def __repr__(self):
        return f"<V2UserRefreshToken(id={self.id}, user_id={self.user_id}, jti={self.jti[:8]}...)>"
```

### 6.2 토큰 발급 및 저장

```python
# app/v2/services/auth_service.py (확장)

from datetime import datetime, timedelta, timezone
from app.v2.models.refresh_token import V2UserRefreshToken


def issue_tokens(
    db: Session,
    user_id: int,
    role: str | None = None,
) -> tuple[str, str]:
    """
    Access Token + Refresh Token 발급

    Returns:
        tuple[str, str]: (access_token, refresh_token)
    """
    # Access Token
    access_token = create_access_token(user_id, role=role)

    # Refresh Token
    refresh_token, jti = create_refresh_token(user_id)

    # DB 저장
    token_record = V2UserRefreshToken(
        user_id=user_id,
        jti=jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(token_record)
    db.commit()

    return access_token, refresh_token
```

### 6.3 Refresh 엔드포인트 구현

```python
# app/v2/api/auth_routes.py Line 71+ (수정)

from app.v2.models.refresh_token import V2UserRefreshToken
from app.v2.services.auth_service import log_auth_event
from app.v2.models.auth_event import AuthEventType


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=AuthTokenResponse)
def v2_refresh(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    """
    Access Token 갱신

    Refresh Token을 검증하고 새 Access Token을 발급합니다.
    만료 30일 미만인 경우 새 Refresh Token도 함께 발급합니다.
    """
    # 1. Refresh Token 디코딩
    try:
        decoded = decode_refresh_token(payload.refresh_token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="INVALID_REFRESH_TOKEN")

    jti = decoded.get("jti")
    user_id = int(decoded.get("sub"))

    # 2. DB에서 토큰 조회
    token_record = db.query(V2UserRefreshToken).filter(
        V2UserRefreshToken.jti == jti,
        V2UserRefreshToken.user_id == user_id,
    ).first()

    if not token_record:
        raise HTTPException(status_code=401, detail="TOKEN_NOT_FOUND")

    # 3. Revoked 확인
    if token_record.revoked_at is not None:
        raise HTTPException(status_code=401, detail="TOKEN_REVOKED")

    # 4. 만료 확인
    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRED")

    # 5. 새 Access Token 발급
    new_access_token = create_access_token(user_id)

    # 6. last_used_at 갱신 (sliding window)
    token_record.last_used_at = datetime.now(timezone.utc)

    # 7. 만료 30일 미만 시 새 Refresh Token 발급
    new_refresh_token = None
    days_left = (token_record.expires_at - datetime.now(timezone.utc)).days

    if days_left < 30:
        new_refresh_token, new_jti = create_refresh_token(user_id)
        new_token_record = V2UserRefreshToken(
            user_id=user_id,
            jti=new_jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(new_token_record)
        # 기존 토큰 revoke
        token_record.revoked_at = datetime.now(timezone.utc)

    db.commit()

    # 8. 이벤트 기록
    log_auth_event(
        db=db,
        user_id=user_id,
        event_type=AuthEventType.TOKEN_REFRESH,
        ip_address=request.client.host if request.client else None,
        success=True,
    )

    # 9. 유저 정보 조회
    user = db.get(V2User, user_id)

    return AuthTokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token or payload.refresh_token,
        user=AuthUser(
            id=user.id,
            cc_id=user.cc_id,
            nickname=user.nickname,
            vault_locked_balance=user.vault_locked_balance,
        ),
    )
```

### 6.4 로그아웃 구현

```python
# app/v2/api/auth_routes.py Line 76+ (수정)

class LogoutRequest(BaseModel):
    refresh_token: str | None = None


@router.post("/logout")
def v2_logout(
    payload: LogoutRequest,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict:
    """
    로그아웃

    Refresh Token이 제공되면 해당 토큰을 무효화합니다.
    Access Token은 자연 만료됩니다 (15분).
    """
    # Refresh Token revoke
    if payload.refresh_token:
        try:
            decoded = decode_refresh_token(payload.refresh_token)
            jti = decoded.get("jti")

            token_record = db.query(V2UserRefreshToken).filter(
                V2UserRefreshToken.jti == jti,
                V2UserRefreshToken.user_id == user_id,
            ).first()

            if token_record and token_record.revoked_at is None:
                token_record.revoked_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass  # 이미 무효한 토큰은 무시

    # 이벤트 기록
    log_auth_event(
        db=db,
        user_id=user_id,
        event_type=AuthEventType.LOGOUT,
        ip_address=request.client.host if request.client else None,
        success=True,
    )

    return {"success": True}
```

---

## 7. Migration 스크립트 예시

### 7.1 v2_user_auth_event 테이블

```python
# alembic/versions/XXXXXX_add_v2_user_auth_event.py

"""add v2_user_auth_event table

Revision ID: XXXXXX
Revises: YYYYYY
Create Date: 2026-01-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'XXXXXX'
down_revision = 'YYYYYY'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'v2_user_auth_event',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum(
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
            'TOKEN_REFRESH', 'TELEGRAM_LINK', 'TELEGRAM_UNLINK', 'RBAC_DENIED',
            name='autheventtype'
        ), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('telegram_id', sa.BigInteger(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_v2_user_auth_event_user_id', 'v2_user_auth_event', ['user_id'])
    op.create_index('idx_v2_user_auth_event_created_at', 'v2_user_auth_event', ['created_at'])
    op.create_index('idx_v2_user_auth_event_user_created', 'v2_user_auth_event', ['user_id', 'created_at'])


def downgrade():
    op.drop_index('idx_v2_user_auth_event_user_created', 'v2_user_auth_event')
    op.drop_index('idx_v2_user_auth_event_created_at', 'v2_user_auth_event')
    op.drop_index('idx_v2_user_auth_event_user_id', 'v2_user_auth_event')
    op.drop_table('v2_user_auth_event')
    op.execute("DROP TYPE IF EXISTS autheventtype")
```

### 7.2 v2_user_refresh_token 테이블

```python
# alembic/versions/XXXXXX_add_v2_user_refresh_token.py

"""add v2_user_refresh_token table

Revision ID: ZZZZZZ
Revises: XXXXXX
Create Date: 2026-01-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'ZZZZZZ'
down_revision = 'XXXXXX'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'v2_user_refresh_token',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_used_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('jti'),
    )
    op.create_index('idx_v2_refresh_token_user_id', 'v2_user_refresh_token', ['user_id'])
    op.create_index('idx_v2_refresh_token_jti', 'v2_user_refresh_token', ['jti'])
    op.create_index('idx_v2_refresh_token_expires_at', 'v2_user_refresh_token', ['expires_at'])
    op.create_index('idx_v2_refresh_token_user_expires', 'v2_user_refresh_token', ['user_id', 'expires_at'])


def downgrade():
    op.drop_index('idx_v2_refresh_token_user_expires', 'v2_user_refresh_token')
    op.drop_index('idx_v2_refresh_token_expires_at', 'v2_user_refresh_token')
    op.drop_index('idx_v2_refresh_token_jti', 'v2_user_refresh_token')
    op.drop_index('idx_v2_refresh_token_user_id', 'v2_user_refresh_token')
    op.drop_table('v2_user_refresh_token')
```

---

## 8. 배치 작업

### 8.1 만료된 Refresh Token 정리

```python
# scripts/cleanup_expired_refresh_tokens.py

"""
만료된 Refresh Token 정리 배치

매일 1회 실행 권장 (Celery 또는 Cron)
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete

from app.db.session import SessionLocal
from app.v2.models.refresh_token import V2UserRefreshToken


def cleanup_expired_refresh_tokens(days_old: int = 30):
    """
    만료된 Refresh Token 삭제

    Args:
        days_old: 삭제 기준 일수 (기본 30일)
    """
    db = SessionLocal()
    try:
        threshold = datetime.now(timezone.utc) - timedelta(days=days_old)

        result = db.execute(
            delete(V2UserRefreshToken).where(
                V2UserRefreshToken.expires_at < threshold
            )
        )
        db.commit()

        print(f"Deleted {result.rowcount} expired refresh tokens")
    finally:
        db.close()


if __name__ == "__main__":
    cleanup_expired_refresh_tokens()
```

### 8.2 Auth Event 아카이브

```python
# scripts/archive_auth_events.py

"""
오래된 Auth Event 아카이브

90일 이상 된 이벤트를 압축 저장 후 삭제
월 1회 실행 권장
"""
from datetime import datetime, timedelta, timezone
import json

from app.db.session import SessionLocal
from app.v2.models.auth_event import V2UserAuthEvent


def archive_auth_events(days_old: int = 90, output_dir: str = "/var/log/auth_archive"):
    """
    오래된 Auth Event 아카이브

    Args:
        days_old: 아카이브 기준 일수 (기본 90일)
        output_dir: 아카이브 파일 저장 경로
    """
    db = SessionLocal()
    try:
        threshold = datetime.now(timezone.utc) - timedelta(days=days_old)

        # 조회
        old_events = db.query(V2UserAuthEvent).filter(
            V2UserAuthEvent.created_at < threshold
        ).all()

        if not old_events:
            print("No events to archive")
            return

        # JSON 파일로 저장
        archive_file = f"{output_dir}/auth_events_{datetime.now().strftime('%Y%m')}.jsonl"
        with open(archive_file, 'a') as f:
            for event in old_events:
                f.write(json.dumps({
                    'id': event.id,
                    'user_id': event.user_id,
                    'event_type': event.event_type.value,
                    'ip_address': event.ip_address,
                    'telegram_id': event.telegram_id,
                    'success': event.success,
                    'created_at': event.created_at.isoformat(),
                }) + '\n')

        # 삭제
        for event in old_events:
            db.delete(event)
        db.commit()

        print(f"Archived and deleted {len(old_events)} events to {archive_file}")
    finally:
        db.close()


if __name__ == "__main__":
    archive_auth_events()
```

---

## 9. 구현 현황 (2026-01-29 기준)

### ✅ 구현 완료

| 항목 | 파일 | 상태 |
|------|------|------|
| initData hash 검증 | `app/v2/core/telegram.py` | ✅ |
| Auth Event 모델 | `app/v2/models/auth_event.py` | ✅ |
| Refresh Token 모델 | `app/v2/models/refresh_token.py` | ✅ |
| Telegram 인증 API | `app/v2/api/telegram_routes.py` | ✅ |
| /refresh 엔드포인트 | `app/v2/api/auth_routes.py` | ✅ |
| /logout 엔드포인트 | `app/v2/api/auth_routes.py` | ✅ |
| V2AuthService 확장 | `app/v2/services/auth_service.py` | ✅ |
| DB Migration | `alembic/versions/20260128_1800_add_v2_auth_tables.py` | ✅ |

### 🔴 핵심 변경사항: V1 의존성 완전 제거

`app/v2/api/telegram_routes.py`는 **순수 V2 구현**입니다:
- ❌ `from app.models.user import User` 미사용
- ✅ `from app.v2.models.user import V2User` 사용
- V2User가 단일 출처 (Single Source of Truth)

---

## 10. 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-01-28 | GitHub Copilot | 최초 작성 |
| v1.1 | 2026-01-29 | GitHub Copilot | 구현 완료 상태 반영, V1 의존성 제거 |
