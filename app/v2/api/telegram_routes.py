"""
V2 Telegram Mini App 인증 API (순수 V2 구현)

텔레그램 initData 기반 인증 엔드포인트
- V1 의존성 완전 제거
- V2User, V2Vault만 사용
- hash 검증 포함
- Auth Event 로깅 포함
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.v2.api import deps
from app.v2.core import telegram as v2_telegram
from app.v2.models.auth_event import AuthEventType
from app.v2.models.user import V2User
from app.v2.schemas import v2_telegram as telegram_schemas
from app.v2.services.auth_service import log_auth_event, V2AuthService


router = APIRouter(prefix="/telegram", tags=["v2-telegram"])

# Backward-compatible schema exports (used by alias routers)
TelegramAuthRequest = telegram_schemas.TelegramAuthRequest
TelegramAuthResponse = telegram_schemas.TelegramAuthResponse
TelegramLinkTokenResponse = telegram_schemas.TelegramLinkTokenResponse


# ============ Schemas ============

class V2TelegramAuthRequest(BaseModel):
    """Telegram 인증 요청"""
    init_data: str
    start_param: str | None = None


class V2TelegramAuthUser(BaseModel):
    """인증된 유저 정보"""
    id: int
    cc_id: str
    nickname: str | None = None
    telegram_id: int | None = None
    vault_locked_balance: int = 0


class V2TelegramAuthResponse(BaseModel):
    """Telegram 인증 응답"""
    access_token: str
    refresh_token: str | None = None
    is_new_user: bool = False
    user: V2TelegramAuthUser


def telegram_auth(payload: TelegramAuthRequest, db: Session) -> TelegramAuthResponse:
    """Backward-compatible wrapper for alias routes.

    NOTE: This path intentionally omits Request metadata (client_ip/user_agent).
    """
    # 1. initData 검증
    try:
        validated_data = v2_telegram.validate_init_data(payload.init_data)
        tg_user = v2_telegram.extract_telegram_user(validated_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    tg_id = tg_user.get("id")
    tg_username = tg_user.get("username")
    tg_nickname = v2_telegram.generate_nickname(tg_user)
    start_param = (payload.start_param or validated_data.get("start_param") or "").strip()

    # 2. V2User 조회/생성
    v2_user = db.query(V2User).filter(V2User.telegram_id == tg_id).first()
    is_new_user = False
    if not v2_user:
        v2_user, is_new_user = _create_v2_user(db, tg_id, tg_username, tg_nickname, start_param)
    else:
        _update_v2_user(db, v2_user, tg_username, tg_nickname)

    # 3. 토큰 발급
    access_token, refresh_token, _ = V2AuthService.issue_tokens(db, v2_user.id)

    return TelegramAuthResponse(
        access_token=access_token,
        token_type="bearer",
        is_new_user=is_new_user,
        linked_to_existing=False,
        user=telegram_schemas.AuthUser(
            id=int(v2_user.id),
            external_id=str(v2_user.cc_id),
            nickname=v2_user.nickname,
            telegram_id=v2_user.telegram_id,
        ),
    )


def issue_link_token(db: Session, user_id: int) -> TelegramLinkTokenResponse:
    """Issue a short start_param code for linking an existing user to Telegram."""
    from app.v2.models import TelegramLinkCode

    now_utc = datetime.utcnow()
    expires_at = now_utc + timedelta(minutes=10)

    # Remove existing active codes for the user to keep it simple.
    db.query(TelegramLinkCode).filter(TelegramLinkCode.user_id == int(user_id)).delete(synchronize_session=False)

    # Generate a short code (16 chars) with collision check.
    for _ in range(5):
        code = uuid.uuid4().hex[:16]
        exists = db.query(TelegramLinkCode).filter(TelegramLinkCode.code == code).first()
        if not exists:
            record = TelegramLinkCode(
                code=code,
                user_id=int(user_id),
                expires_at=expires_at,
                used_at=None,
            )
            db.add(record)
            db.commit()
            start_param = f"link_{code}"
            return TelegramLinkTokenResponse(
                expires_at_utc=expires_at,
                start_param=start_param,
                open_url=None,
            )

    raise HTTPException(status_code=500, detail="LINK_TOKEN_GENERATION_FAILED")


# ============ Endpoints ============

@router.post("/auth", response_model=V2TelegramAuthResponse)
def v2_telegram_auth(
    payload: V2TelegramAuthRequest,
    request: Request,
    db: Session = Depends(deps.get_db),
) -> V2TelegramAuthResponse:
    """
    V2 Telegram Mini App 인증 (순수 V2)

    initData를 검증하고 유저를 인증합니다.
    - 신규 유저: V2User 자동 생성
    - 기존 유저: V2User 로그인
    - V1 의존성 없음 (User 테이블 미사용)

    🔴 보안 강화:
    1. hash 검증 포함
    2. Auth Event 로깅
    3. Refresh Token 발급
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # 1. initData 검증 (hash 비교 포함)
    try:
        validated_data = v2_telegram.validate_init_data(payload.init_data)
        tg_user = v2_telegram.extract_telegram_user(validated_data)
    except ValueError as e:
        # 실패 이벤트 기록
        log_auth_event(
            db=db,
            user_id=0,
            event_type=AuthEventType.LOGIN_FAILED,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))

    tg_id = tg_user.get("id")
    tg_username = tg_user.get("username")
    tg_nickname = v2_telegram.generate_nickname(tg_user)
    start_param = (payload.start_param or validated_data.get("start_param") or "").strip()

    # 2. V2User 조회 (telegram_id로)
    v2_user = db.query(V2User).filter(V2User.telegram_id == tg_id).first()
    is_new_user = False

    if not v2_user:
        # 3. 신규 V2User 생성
        v2_user, is_new_user = _create_v2_user(db, tg_id, tg_username, tg_nickname, start_param)
    else:
        # 4. 기존 V2User 업데이트
        _update_v2_user(db, v2_user, tg_username, tg_nickname)

    # 5. 토큰 발급
    access_token, refresh_token, _ = V2AuthService.issue_tokens(db, v2_user.id)

    # 6. 로그인 성공 이벤트 기록
    log_auth_event(
        db=db,
        user_id=v2_user.id,
        event_type=AuthEventType.LOGIN_SUCCESS,
        ip_address=client_ip,
        user_agent=user_agent,
        telegram_id=tg_id,
        success=True,
    )

    # 7. LOGIN 미션 트리거
    try:
        from app.v2.services.mission_service import V2MissionService
        V2MissionService.ensure_login_progress(db, v2_user.id)
    except Exception:
        pass  # 미션 실패해도 로그인은 성공

    return V2TelegramAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        is_new_user=is_new_user,
        user=V2TelegramAuthUser(
            id=v2_user.id,
            cc_id=v2_user.cc_id,
            nickname=v2_user.nickname,
            telegram_id=v2_user.telegram_id,
            vault_locked_balance=v2_user.vault_locked_balance,
        ),
    )


# ============ Helper Functions ============

def _create_v2_user(
    db: Session,
    tg_id: int,
    tg_username: str | None,
    tg_nickname: str,
    start_param: str,
) -> tuple[V2User, bool]:
    """순수 V2User 생성 (V1 User 미사용)"""
    from datetime import datetime
    
    # cc_id 생성
    unique_suffix = uuid.uuid4().hex[:8]
    cc_id = f"tg_{tg_id}_{unique_suffix}"

    # V2User 생성
    v2_user = V2User(
        cc_id=cc_id,
        nickname=tg_nickname,
        telegram_id=tg_id,
        telegram_username=tg_username,
        vault_locked_balance=0,  # 초기 0원 (미션으로 지급)
        last_login_at=datetime.utcnow(),  # 최초 로그인 시각
    )
    db.add(v2_user)
    db.flush()

    try:
        db.commit()
        db.refresh(v2_user)

        # 추천인 처리
        if start_param and start_param.startswith("ref_"):
            _handle_referral(db, v2_user.id, start_param)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create V2User: {str(e)}")

    return v2_user, True


def _update_v2_user(
    db: Session,
    v2_user: V2User,
    tg_username: str | None,
    tg_nickname: str,
) -> None:
    """기존 V2User 정보 업데이트"""
    from datetime import datetime
    
    v2_user.telegram_username = tg_username
    v2_user.last_login_at = datetime.utcnow()  # 로그인 시각 업데이트

    # 닉네임 업데이트 (기본 닉네임인 경우만)
    if v2_user.nickname and (
        v2_user.nickname.startswith("tg_user_") or v2_user.nickname == str(v2_user.telegram_id)
    ):
        v2_user.nickname = tg_nickname

    try:
        db.commit()
        db.refresh(v2_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update V2User: {str(e)}")


def _handle_referral(db: Session, new_user_id: int, start_param: str) -> None:
    """추천인 처리 (V2 전용)"""
    try:
        referrer_id_str = start_param.split("_")[1]
        referrer_id = int(referrer_id_str)

        # V2User 존재 확인
        referrer = db.get(V2User, referrer_id)
        if referrer and referrer.id != new_user_id:
            try:
                from app.v2.services.mission_service import V2MissionService
                V2MissionService.update_progress(db, referrer.id, "INVITE_FRIEND", 1)
            except Exception:
                pass  # 미션 실패는 무시
    except (IndexError, ValueError):
        pass
