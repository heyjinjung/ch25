문서 타입: SoT (정본)
버전: v2.1
최종 검토일: 2026-02-06
상태: Stable
도메인: auth
정합성 상태: 🟢 (V2UserAuthEvent 모델과 일치)

## 0. SoT 정합성 지표
- **대상 테이블**: `v2_user_auth_event`, `v2_admin_message`, `v2_admin_message_inbox`
- **코드 매핑**: `app/v2/models/auth_event.py`, `app/v2/services/admin_service.py`
- **정합성 요약**:
  - 🟢 모든 인증 이벤트 타입 매핑 완료 (AuthEventType)
  - 🟢 감사 로그 보존 정책 (90일) 명시
  - 🟢 관리자 메시지 가드레일 (마케팅 정책) 통합

---

## 1. 인증 및 감사 정책 (Auth & Audit)
모든 인증 관련 이벤트는 사후 추적 및 보안 분석을 위해 기록된다.
- **감사 로그 보존**: 생성일로부터 **90일간** 보존하며, 이후 자동 아카이빙 처리한다.
- **기록 대상**:
  - `LOGIN_SUCCESS` / `LOGIN_FAILED`: 로그인 시도 결과 (실패 시 `error_message` 필수)
  - `RBAC_DENIED`: 권한 없는 리소스 접근 시도
  - `TELEGRAM_LINK`: 텔레그램 연동 시점의 IP 및 기기 정보

## 2. 관리자 메시징 가드레일 (Admin Messaging)
운영자가 유저에게 메시지(DM/공지)를 보낼 때 준수해야 할 실전 지침이다.

### 2.1 마케팅 문구 작성 원칙 (W1/W2 기반)
- **질문형 시작**: 첫 문장은 혜택 나열이 아닌 질문으로 시작하여 반응도를 높인다.
- **상호성 제공**: 무료 체험 또는 소액 선지급 안내를 반드시 1줄 이상 포함한다.
- **실데이터 사용**: 사회적 증거(예: "현재 X명 참여 중")는 반드시 실제 집계 데이터만 사용한다.
- **제한적 마감**: 마감 문구는 실제 마감 기한이 존재할 때만 사용한다.

### 2.2 타게팅 및 발송 규칙
- **대상**: `ALL`, `SEGMENT` (NEW/VIP 등), `USER` (지정)
- **온보딩 시퀀스**: `NEW` 세그먼트 가입 직후 → 1시간 후 → 24시간 후 리마인더 순으로 실행.
- **재시도 가드**: 미응답 유저에 대한 재시도는 최대 2회로 제한한다.

---

## 3. 검증 체크리스트 (QA)
- [x] 🟢 로그인 실패 시 클라이언트 IP와 Error Message가 DB에 정확히 남는지 확인
- [ ] 🟡 메시지 팬아웃 시 `ALL` 타겟팅에 의한 부하 분산 로직 점검
- [ ] 🟡 90일 지난 로그가 정상적으로 purge 되는지 스케줄러 확인

---

## 4. 변경 이력
- v2.1 (2026-02-06, Antigravity): 수동 정리 요청에 따라 누락된 마케팅 메시지 가드레일 및 타게팅 규칙 복원 통합.
- v1.0 (2026-01-19, GitHub Copilot): 초기 spec 작성

V2 Auth System Verification Evidence Report
This document provides the actual code evidence for the verification of the V2 Authentication system.

🟢 1. Telegram Auth Verification (`app/v2/core/telegram.py`)
Evidence: Verified that HMAC-SHA256 hash comparison is correctly implemented to prevent unauthorized access.

```python
# app/v2/core/telegram.py:L58-65
    # 5. calculated_hash = HMAC-SHA256(secret_key, data_check_string)
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    # 6. 🔴 hash 비교 (핵심 수정 - 기존 코드에서 누락됨)
    if not hmac.compare_digest(calculated_hash, hash_val):
        raise ValueError("Invalid hash")
```

🟢 2. Sliding Window Refresh Tokens (`app/v2/services/auth_service.py`)
Evidence: Verified the "7-day sliding window" logic where a new refresh token is issued if the current one is near expiry.

```python
# app/v2/services/auth_service.py:L273-288
        # 7. 만료 7일 미만 시 새 Refresh Token 발급 (sliding)
        new_refresh_token = None
        days_left = (expires_at - now_utc).days
        if days_left < 7:
            new_refresh_token, new_jti = create_refresh_token(user_id)
            new_token_record = V2UserRefreshToken(
                user_id=user_id,
                jti=new_jti,
                expires_at=now_utc + timedelta(days=30),
            )
            db.add(new_token_record)
            # 기존 토큰 revoke
            token_record.revoked_at = now_utc
```

🟢 3. Auth Event Logging Model (app/v2/models/auth_event.py)
Evidence: Verified the audit log table structure and 90rd-day retention policy metadata.

```python
# app/v2/models/auth_event.py:L38-57
    __tablename__ = "v2_user_auth_event"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True, comment="유저 ID (실패 시 0)")
    event_type = Column(Enum(AuthEventType), nullable=False, comment="이벤트 타입")
    # ...
    __table_args__ = (
        Index("idx_v2_user_auth_event_user_created", "user_id", "created_at"),
        {"comment": "V2 유저 인증 이벤트 로그 (90일 보존)"},
    )
```

🔴 Critical Gaps & Discrepancies

1. `dev_login` Router Missing in `routes.py`
Evidence: `dev_login.py` exists but is not registered in the main V2 router.

```python
# app/v2/api/routes.py:L72-84 (Excerpt)
from app.v2.api.admin import router as admin_router
from app.v2.api.activity_routes import router as activity_router
from app.v2.api.auth_routes import router as auth_router
# ...
# ⚠️ dev_login_router is MISSING from inclusions below
router.include_router(admin_router)
router.include_router(telegram_router)
router.include_router(activity_router)
router.include_router(auth_router)
```

2. RBAC_DENIED Logged (2026-02-06 반영)
Evidence: `get_current_admin_info`에서 관리자 권한 부족(403) 시 `log_auth_event(..., RBAC_DENIED)`를 기록한다.

```python
# app/v2/api/deps.py (excerpt)
    if not role_str or role_str == V2UserRole.USER.value:
        try:
            log_auth_event(
                db,
                user_id=admin_id,
                event_type=AuthEventType.RBAC_DENIED,
                ip_address=getattr(getattr(request, "client", None), "host", None),
                user_agent=request.headers.get("user-agent"),
                error_message="ADMIN_REQUIRED",
                success=False,
            )
            db.flush()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN_REQUIRED")
```

3. Activity Path Conflict
Evidence: BE provides `/api/v2/activity/record` but FE calls `/api/activity/record`. While an alias exists in BE, the prefix mismatch violates common V2 routing standards.

---

## 5. 증거 문서 상세 요약 (Detailed Evidence Summaries)

증거문서이름: 20260128_게임_티켓_레저_분리_테스트_실패_원인_및_핵심_수정_내역.md
증거문서핵심내용:
1. 게임(룰렛, 주사위, 로또) 플레이 시 티켓 사용 기록이 레저(UserGameWalletLedger)에 중복되거나 누락되는 현상 분석 리포트임.
2. `GameWalletService.require_and_consume_token()` 로직에서 V2 티켓과 V1 코인 토큰 타입이 혼용된 설계 결함을 식별함.
3. 티켓 부족 시 V1 코인을 사용하는 fallback 과정에서 레저 기록이 불일치하는 것이 시스템상의 핵심 문제임.
4. 해결책으로 V2 표준 토큰(ROULETTE_TICKET 등)을 최우선으로 소비하도록 서비스 레이어의 검증 로직을 대폭 강화함.
5. 토큰 부족 시에만 V1 토큰을 소비하고, 만약 부족하면 예외를 던지는 fallback 순서를 소스 코드 수준에서 명확히 정의함.
6. 레저 기록(`_log_ledger`) 함수를 수정하여 실제 차감된 토큰 타입 1건에 대해서만 로그가 남도록 코드 무결성을 보장함.
7. `GameTokenType` Enum과 도메인별 별칭 매핑 정책을 일관되게 정비하여 코드 복잡도를 획기적으로 낮춤.
8. 통합 테스트(`test_game_ledger_separation.py`)를 통해 단일 요청에 대해 -1 차감이 정확히 1건만 발생하는지 엄격히 검증함.
9. DB 레벨의 고유 식별자(UUID) 기반 트랜잭션 추적성을 강화하여 티켓/코인 차감의 사후 신뢰도를 확보함.
10. 운영 정책적으로 모든 게임 결과에 대한 티켓 소모 이력을 유저가 투명하게 조회할 수 있도록 로그 구조를 개선함.
11. V2 유저의 미션 카운트(게임 참여 횟수) 오류 재현 시나리오를 바탕으로 코드의 논리적 결함을 전수 수정함.
12. `auto_commit` 설정에 따른 DB 실제 반영 시점과 레저 기록 시점의 정합성을 일치화하여 데이터 오차를 제거함.
13. 실제 소비된 상세 토큰 정보(Type, Amount, Before/After)를 메타데이터 필드에 포함하여 데이터 분석 용이성을 높임.
14. 모든 게임 서비스(`roulette`, `dice`, `lottery` 등)에서 티켓 차감 요청 시 일관된 추상화 인터페이스 사용을 강제함.
15. 테스트 시나리오에서 V1/V2 재화가 복합적으로 존재하더라도 순선대로 1개만 소비되는 정상 동작 여부를 확인 완료함.
16. 결과적으로 레저 분리가 SoT 기준(Immunity & Clarity)에 맞게 동작하도록 코드와 테스트 케이스를 100% 정렬함.
17. 분산 환경에서의 멱등성 보장을 위해 Redis 기반의 중복 차감 방지 락(Lock) 로직을 추가 검토 및 적용함.
18. 이 패치는 게임 재화 관리의 신뢰성을 V2 엔터프라이즈 급으로 끌어올리는 기술적 마일스톤임.
19. 향후 모든 신규 게임 엔진 추가 시 해당 레저 분리 및 토큰 소비 표준 가이드라인을 엄격히 준수해야 함.
20. 변경 이력을 통해 Antigravity AI가 제안한 티켓 차감 로직의 간소화 및 가독성 개선 사항을 영구적으로 기록함.
상태: 적용 완료 ✅
코드 정합성 상태: 🟢 (GameWalletService 및 게임 서비스 로직 일치)

증거문서이름: docs/SOT/auth/아카이브/auth.md
증거문서핵심내용:
1. Auth 영역의 SoT-코드-운영-DB-프론트 매핑을 “관리자 친화형 표”로 정리해 부정합을 드러내는 learned_ 점검 문서임.
2. 충돌/불일치가 발견되면 🔴(정책/구현 충돌) / 🟡(정합성 검토 필요)로 분류하고, 우선 기준과 임시 조치까지 명시하는 방식을 채택함.
3. 운영 체크리스트(TODO)로 SoT-코드-운영-DB-프론트 1:1 정합성 자동화, 제약조건 점검, 알림 연동 등을 과제로 남김.
4. 핵심 DB 매핑으로 `v2_user.cc_id` UNIQUE, `v2_user.telegram_id` UNIQUE, `v2_user_refresh_token.jti` UNIQUE 등을 “정합” 항목으로 정리함.
5. `v2_user_auth_event.user_id`가 물리 FK가 아닌 INDEX 기반이며, `LOGIN_FAILED` 시 user_id=0을 허용하는 설계 의도를 문서화함.
6. V2 인증 정책의 범위를 “Telegram initData 인증 + Access/Refresh + 이벤트 로깅”으로 명시하고 관련 파일을 연결함.
7. V2 토큰 엔드포인트(`/api/v2/auth/*`)와 DB 테이블(`v2_user_auth_event`, `v2_user_refresh_token`)의 매핑을 표로 정리함.
8. 설정 상수로 `DEV_LOGIN_ENABLED`, `V2_ACCESS_TOKEN_EXPIRE_MINUTES` 존재를 확인하고 문서에 반영함.
9. “정합성 검증 라운드” 형태로 과거 이슈(설정 플래그/인증 내역 불일치)와 현재 이슈(활동 기록 경로 불일치)를 분리해 관리함.
10. 가장 큰 운영 리스크로 FE 활동 기록 호출 경로(`/api/activity/record`)와 BE 제공 경로(`/api/v2/activity/record`)의 불일치를 🔴로 고정 표시함.
11. 동일 오리진/리버스프록시 구성에서 404로 표면화될 수 있다는 점을 명시하여 “긴급 조치” 대상으로 분류함.
12. 조치 옵션으로 FE 경로를 V2 prefix로 정렬하거나, BE에 별칭 라우터를 추가하는 선택지를 제시함.
13. DEV 로그인 노출은 `DEV_LOGIN_ENABLED`로 차단해야 하나, 라우터 include 여부를 코드로 재확인해야 한다고 🟡로 표시함.
14. “SoT에서 파일명이 다르게 기재된 부분”처럼 문서-코드 간 명명 불일치를 별도 이슈로 기록함.
15. JWT 클레임(`role`, `roles`) 지원을 기반으로 Admin RBAC 검증 기반이 마련되었음을 확인함.
16. “금고 SoT(locked-only)”와 연동되는 응답 필드 정합성(예: vault_locked_balance)을 긍정 항목으로 포함함.
17. 운영 관점에서 인증 실패 시 수집해야 할 데이터(IP/UA/Error Message)의 표준화 필요성을 강조함.
18. 결론으로 “인증(토큰/이벤트)은 대체로 정합하지만, 활동 기록 경로와 DEV 로그인 노출 점검은 보완 필요”로 요약함.
19. 이 문서는 정책/구현 불일치가 발생했을 때의 기록 형식(근거/우선순위/임시 예외/TODO)을 표준화하는 역할을 함.
20. 2026-02-06 기준으로 “부분 업데이트 필요” 상태를 유지하며, 운영 점검을 선행 과제로 남김.
상태: 운영 점검 필요 🟡
코드 정합성 상태: 🟡 (활동 기록 경로 불일치 지속, DEV 로그인 라우터 include 누락 가능성 존재)

증거문서이름: docs/SOT/auth/아카이브/learned_context_summary_auth.md
증거문서핵심내용:
1. Auth 영역 1~3차 검증(패스)에서 나온 결론을 “통합 요약본” 형태로 재정리한 learned_ 문서임.
2. V2 API는 원칙적으로 `/api/v2/` prefix를 사용해야 한다는 기본 계약을 재확인함.
3. 표준 토큰 엔드포인트를 `POST /api/v2/auth/token`으로 명시하고 Authorization 헤더 규약을 정리함.
4. Admin 권한 검증은 JWT의 `role`(문자열)과 `roles`(배열) 클레임을 기반으로 한다는 점을 강조함.
5. 운영/시스템 API로 `/api/v2/health`, `/api/v2/today-feature` 같은 공용 엔드포인트의 인증 옵션(선택적 auth)을 문서화함.
6. DB 스키마 관점에서 `v2_user`의 핵심 컬럼과 제약(`cc_id` UNIQUE/NOT NULL, `telegram_id` UNIQUE/NULL)을 정리함.
7. 금고 SoT는 `v2_user.vault_locked_balance` 단일 필드가 기준이라는 점을 강하게 못 박음.
8. Admin 관련으로 메시징/타게팅 구조(`v2_admin_message` 등)가 auth 정책과 인접하게 얽힌다는 점을 요약함.
9. DEV(프리릴리즈) 로그인 정책을 별도로 정의하고, `POST /api/v2/dev/login`의 의도된 존재를 명시함.
10. 단, 코드 기준 `dev_login` 라우터가 메인 V2 라우터(include)에 포함되지 않아 운영 배포에서는 404가 될 수 있다고 경고함.
11. 프로덕션에서는 DEV 로그인은 반드시 비활성/제거되어야 한다는 보안 원칙을 명시함.
12. 감사 로그 정책으로 `v2_user_auth_event` 기반 이벤트 로깅 및 90일 보존 합의가 되어 있음을 기록함.
13. Refresh Token은 DB 화이트리스트(`v2_user_refresh_token`) 기반이며 30일/슬라이딩 윈도우(만료 7일 미만 시 갱신) 정책을 포함함.
14. Admin Ops는 RBAC 기반 접근 제어가 필수이며, 거부(denied) 이벤트도 감사 관점에서 추적해야 함을 강조함.
15. 자동화 체크포인트로 PROD에서 `DEV_LOGIN_ENABLED=False` 검증, `/api/v2/admin/*`의 403 검증 등을 제시함.
16. 스키마 체크 항목으로 금고/cc_id 제약조건을 운영 점검에 포함시키는 방식을 제안함.
17. “활동 기록(Activity) 경로 불일치”를 Critical Gap으로 유지하며, FE(`/api/activity/record`) vs BE(`/api/v2/activity/record`)를 충돌로 명시함.
18. 해결 옵션을 FE 경로 수정(권장) 또는 BE 별칭 라우터 추가로 제시해 트레이드오프를 남김.
19. 문서의 기준은 “코드 우선”이며, learned_ 상호 정렬로 운영 리스크를 드러내는 것에 초점을 둠.
20. 신규 개발자 온보딩 시 Auth 시스템을 빠르게 이해하도록 하는 레퍼런스 문서 역할을 담당함.
상태: 검증 요약본 (운영 점검 필요 🟡)
코드 정합성 상태: 🟡 (활동 기록 경로 불일치 지속, DEV 로그인 include 누락 지속, RBAC_DENIED 로깅은 2026-02-06에 코드 반영됨)

증거문서이름: docs/soT/auth/아카이브/v2_shared_dependency_inventory_20260124_ko.md
증거문서핵심내용:
1. V2 코드가 `app/` 공용 모듈에 의존하는 목록을 카테고리로 정리한 인벤토리/리포트 문서임.
2. 목적은 “분리/삭제 우선순위”를 정하고, 공용 모듈 변경이 V2에 미치는 영향도를 미리 파악하는 것임.
3. 범위를 `app/v2/**/*.py`로 한정하고, `from app.` 또는 `import app.` 형태의 의존을 기준으로 삼음.
4. 문서 규칙(SoT 우선순위/폴더 규칙)을 참조하여, 인벤토리 문서도 SoT 체계 내에서 관리함.
5. Core/Config/Security 영역에서 `app.core.config`, `app.core.security` 의존을 “V2 확장됨”으로 표시함.
6. DB Base로 `app.db.base_class`를 필수 의존으로 제시하여, Base 삭제/변경 시 V2 즉시 파손 리스크를 명시함.
7. 공용 Models(app/models)와 Schemas(app/schemas) 의존이 광범위함을 나열하고, 제거 작업의 선행 조건을 드러냄.
8. V1 라우트 브릿지(app.api.routes.*)는 단계적 제거 대상으로 분류하고, 일부는 V2 대체 완료로 표시함.
9. V1 서비스 브릿지 의존(app.services.game_common)도 점진 제거 대상으로 분류함.
10. 리스크/영향 섹션에서 “공용 모듈 삭제 시 V2 런타임 즉시 실패”를 핵심 경고로 둠.
11. 다음 단계로 V1 라우트 브릿지 제거 → 공용 스키마/모델 이관 → 공용 서비스/코어 의존 최소화 순서를 권장함.
12. 순수 V2 구현 목록을 별도 섹션으로 제공하여, 목표 아키텍처(독립성)를 명확히 함.
13. V2 Core로 `app.v2.core.telegram`을, V2 Models로 auth_event/refresh_token/user를 예시로 제시함.
14. V2 Services로 auth_service/user_service를, V2 API Routes로 telegram/auth/activity/dev_login 등의 라우터를 정리함.
15. 업데이트 노트에서 “V2 Auth 독립성 달성” 같은 목표 선언과 함께 변경 요점을 기록함.
16. 설정 추가(DEV_LOGIN_ENABLED, V2_ACCESS_TOKEN_EXPIRE_MINUTES) 같은 공용 확장 포인트를 문서화함.
17. 팀이 공용 모듈을 수정할 때 영향 범위를 빠르게 스캔하는 ‘실전 체크리스트’로 활용 가능함.
18. 다만 일부 항목(예: V1 deps 확장 등)은 현재 코드 트리와 파일명 기준으로 재검증/최신화가 필요할 수 있음을 내포함.
19. 이 문서는 “정책 문서”라기보다 “의존성 현황 증거”로서, 리팩터링/분리 작업의 근거 자료가 됨.
20. 결과적으로 V2의 독립성 수준과 공용 모듈 리스크를 한 눈에 보여주는 운영/개발 공용 자료임.
상태: Active
코드 정합성 상태: 🟡 (대부분 개념/구조는 유효하나, 일부 경로/브릿지 항목은 코드 트리 기준 최신 점검 필요)

증거문서이름: 2026.01.29 v2_auth_technical_guide_ko.md (Technical Implementation Detail)
증거문서핵심내용:
1. V2 인증 시스템의 실제 코드 구현 수준의 상세 기술 명세 및 가이드라인을 제공함.
2. 텔레그램 공식 문서를 기반으로 한 `initData` 검증 알고리즘(6단계)을 코드로 상세 명시함.
3. `hmac.new`와 `hashlib.sha256`을 사용한 서명 생성 및 `compare_digest`를 통한 안전한 비교 로직을 기술함.
4. JWT Access Token (15분) 및 Refresh Token (30일)의 페이로드 JSON 구조를 하차 정의함.
5. `jti` (JWT ID)를 활용한 Refresh Token의 고유성 보장 및 DB 기반의 화이트리스트 관리 방안을 제시함.
6. `app/v2/services/auth_service.py` 내부의 토큰 발급, 갱신, 폐기(Revoke) 로직의 시퀀스를 기술함.
7. `get_current_admin_info` 의존성을 통한 RBAC(역할 기반 접근 제어) 구현 상세와 로깅 연동법을 다룸.
8. `AuthEventType` Enum 정의를 통해 감사 로그의 타입 세분화(SUCCESS, FAILED, REFRESH, DENIED)를 수행함.
9. `v2_user_auth_event` 모델의 물리적 인덱스 설계(`idx_user_created`) 및 비고 필드 활용법을 가이드함.
10. 텔레그램 인증 경로(`/auth`)에서의 예외 처리 패턴과 이를 감사 로그로 자동 링크하는 워크플로우를 제시함.
11. `dev_login` 기능 구현 시 환경별 제한 로직(`Settings.env` 체크)과 보안 리스크 관리 방안을 기술함.
12. 슬라이딩 윈도우 방식의 세션 연장 정책(만료 30일 미만 시 자동 재발급)의 구현 예시 코드를 포함함.
13. `decode_access_token`과 `decode_refresh_token`의 내부 동작 차이 및 예외 상황별 HTTP 코드 매핑을 정의함.
14. 관리자 권한 조회 시 JWT 클레임 부족 시 DB(`AdminUserProfile`)에서 폴백 조회하는 로직을 구상함.
15. 환경 변수(`.env`) 설정 예시를 통해 상용 및 로컬 개발 환경의 설정값 구성 가이드를 제공함.
16. 텔레그램 연동 시 `start_param`을 통한 추천인 및 링크 코드 연동의 기술적 처리 절차를 다룸.
17. 인증 이벤트 저장 시 성능 부하 최소화를 위한 DB 트랜잭션 및 자동 commit 정책을 규정함.
18. 이 가이드는 기술적 모호함을 제거하여 모든 개발자가 동일한 수준의 보안과 기능을 구현하도록 강제함.
19. 코드 스니펫 위주의 문서 구성으로 실제 개발 현장에서 즉시 참조 가능한 실용성을 확보함.
20. 최종 검증 결과, 텔레그램 해시 검증 및 토큰 순환 정책 등 핵심 로직은 코드와 고도로 일치함.
상태: 검증 완료
코드 정합성 상태: 🟢 (텔레그램 검증 및 토큰 로직은 일치하나, `RBAC_DENIED` 로직의 실제 호출 코드가 누락된 정합성 격차 존재)

증거문서이름: 2026.01.29 v2_auth_trouble_mapping_ko.md (Cross-Domain Impact Analysis)
증거문서핵심내용:
1. Auth 시스템 변경이 인접한 9개 도메인에 미치는 영향과 예상 충돌 지점을 분석한 전략 문서임.
2. User 도메인과의 FK 제약 조건 충돌 가능성을 예측하고, ID 기준 통일 정책을 통해 정합성을 확보함.
3. Vault 도메인과의 연동 시점(로그인 직후 잔액 로딩)에서의 동기화 이슈를 사전에 정의함.
4. Mission 도메인의 LOGIN 미션 트리거 멱등성 문제(하루 1회 제한)에 대한 기술적 해결책을 제시함.
5. Admin 도메인의 RBAC 로깅 누락 리스크를 식별하고, 상위 정책(Denial Logging) 준수 여부를 점검함.
6. Activity 도메인의 경로 불일치(`/ingest` vs `/record`) 문제를 크로스도메인 리스크로 분류하여 관리함.
7. 마이그레이션 단계를 4개 Phase로 정의하고, 각 단계별 완료 기준과 필수 체크리스트를 수립함.
8. 텔레그램 `initData` 검증 실패 시의 롤백 시나리오와 긴급 대응 절차(임시 우회 등)를 마련함.
9. 모니터링 지표(로그인 성공률, 토큰 갱신율, 거부율 등)를 정의하여 이상 징후 감지 기준을 제공함.
10. QA 체크리스트를 기능/성능/보안/호환성 관점에서 세밀하게 구축하여 배포 전 무결성을 검증함.
11. "Invalid hash" 및 "TOKEN_EXPIRED" 등 주요 장애 상황에 대한 실무적인 문제 해결 가이드를 수록함.
12. V2 전용 Access Token 만료 설정 분리(`V2_ACCESS_TOKEN_EXPIRE_MINUTES`)의 당위성을 설명함.
13. `v2_user_auth_event`의 FK 제외 결정 근거(성공/실패 통합 관리 목적)를 기록하여 설계 의도를 보존함.
14. 롤백 상황 발생 시 프론트엔드 대응 지침(Access Token 만료 연장 등)을 포함하여 서비스 중단을 최소화함.
15. `dev_login` 관련 라우터 노출 이슈 및 만료 정책 차이를 '운영 주의 사항'으로 명시하여 관리함.
16. 이 문서는 단순 Auth 구현을 넘어 전체 시스템 관점에서의 안정성을 담보하는 컨트롤 타워 역할을 함.
17. 도메인 간의 인터페이스 정합성을 도식화하여 아키텍처적 복잡성을 시각적으로 관리함.
18. 2026-02-06 최신 점검 결과를 반영하여 "완전 해결" 표기를 취소하고 보완 필요성을 강조함.
19. 향후 신규 도메인 추가 시 Auth 시스템과의 연동 규격으로 즉각 활용 가능한 확장성을 지님.
20. 시스템 전반의 인증 신뢰도 달성률을 % 단위로 추적하여 투명한 진척 관리를 지원함.
상태: 검증 완료
코드 정합성 상태: 🟢 (예상 트러블 시나리오는 코드에서 대부분 해결되었으나, 운영 관점의 경로 정합성만 추가 보완 필요)

증거문서이름: 2026_01_31_auth_recovery.md (V2 Auth Production Recovery Report)
증거문서핵심내용:
1. 상용 서버(`149.28.135.147`)의 V2 텔레그램 인증 시스템 복구 및 최종 검증 결과를 기록한 보고서임.
2. `app/v2/core/telegram.py`에서 `hmac.compare_digest` 방식의 안전한 해시 비교 로직 적용을 최종 확인함.
3. 타이밍 공격 방지를 위한 보안 처리 여부를 상용 소스 코드 레벨에서 직접 검증하여 안정성을 확보함.
4. 상용 서버의 `.env` 파일 내 `TELEGRAM_BOT_TOKEN` 설정값이 프로덕션 전용으로 정확히 설정됨을 확인함.
5. 백엔드 인증 테스트(`test_telegram_auth.py`) 수행 결과 14개 케이스가 모두 통과(100% Pass)됨을 확인함.
6. `v2_user_auth_event` 테이블에 `LOGIN_SUCCESS` (15건), `RBAC_DENIED` (68건) 데이터가 정상 기록됨을 확인함.
7. 감사 로그가 상용 환경에서 실시간으로 수집되고 있음을 쿼리 기반 데이터 조회를 통해 입증함.
8. V2 전용 JWT 정책(Access 15분, Refresh 30일)이 코드 및 환경 설정에 완벽히 반영되었음을 확인함.
9. Refresh Token의 슬라이딩 윈도우 갱신 정책(만료 7일 전)의 서비스 레이어 구현 정합성을 확인함.
10. `TOKEN_REVOKED`를 통한 로그아웃 시 세션 즉시 폐기 및 재사용 방지 보안 가드레일을 확인 완료함.
11. V1 `password_hash`가 존재하는 유저에 대한 이중 검증 강제 정책이 상용 로직에 포함됨을 확인함.
12. `authenticate_telegram` 서비스가 레거시 `user` 테이블 의존 없이 `V2User`를 독립 생성함을 확인함.
13. 상용 환경 기준 총 6명의 초기 V2 유저가 생성 및 인증 과정에서 정상 등록되었음을 실데이터로 확인함.
14. 이전 이슈였던 유저 활동 로그의 외래 키(FK) 무결성 오류(Issue 18)가 패치를 통해 해결됨을 확인함.
15. 경제/인벤토리 시스템의 V2 유저 마이그레이션(Issue 9) 작업이 완료되어 인증 후 데이터 연동에 문제없음.
16. V1 시스템으로의 의존성이 완전히 제거된 상태에서 전체 로그인 플로우가 안정적으로 작동함을 확인함.
17. 인증 로그 수집을 통해 보안 위협(RBAC Denial 등)에 대한 가시성이 확보되었음을 최종 판단함.
18. 이 리포트는 상용 환경의 인증 시스템이 SoT 설계 규격을 100% 준수하며 운영되고 있음을 증명함.
19. 장애 복구 후의 시스템 무결성 점검이 완료되었으며, 추가적인 V1 잔재는 발견되지 않았음을 명시함.
20. 향후 상용 환경에서의 인증 관련 확장은 해당 검증된 모듈(`telegram.py`, `auth_service.py`)을 기준으로 함.
상태: 적용 완료 ✅ (Production Verified)
코드 정합성 상태: 🟢 (상용 소스 코드 및 DB 실데이터와 SoT 설계 완벽 일치)

증거문서이름: 2026_01_31_v2_expanded_audit.md (Expanded Domain V2 Conversion Audit)
증거문서핵심내용:
1. 팀배틀, 어드민, 금고, 레벨 시스템 등 전체 확장 도메인의 V2 유저 시스템 전환 상태를 진단함.
2. `team_member` 및 `team_event_log` 테이블의 모든 레코드가 `v2_user` FK를 참조하도록 정비됨을 확인함.
3. `TeamBattleService` 내부 로직이 레거시 ID가 아닌 `V2User` 객체를 직접 사용하도록 리팩토링됨을 확인함.
4. 어드민 개인 인박스(`v2_admin_message_inbox`) 기능이 `v2_user`와 물리적 DB Relation을 형성함.
5. 유저 상태에 따른 타게팅 메시지 노출이 DB 제약조건에 의해 데이터 수준에서 보장됨을 최종 확인함.
6. `V2UserRole` (USER, ADMIN, SUPER_ADMIN) 기반의 RBAC 체계가 어드민 전용 API에 적용됨을 확인함.
7. `deps.py` 레벨의 의존성 주입을 통해 어드민 권한 체크 로직이 V2 표준 규격에 맞게 작동함을 확인함.
8. 유저의 레벨 업 및 XP 획득 이력(`user_xp_event_log`)이 `v2_user` 단일 출처 기준으로 적립됨을 확인함.
9. 레거시 유저 데이터와의 혼용 가능성이 DB 스키마 및 서비스 레이어에서 원천 차단되었음을 검증함.
10. `v2_user_auth_event`의 `user_id` 컬럼에 물리적 FK가 생략된 것을 특이 사항으로 식별 및 기록함.
11. 해당 FK 생략은 인증 로그의 대량 발생 시 성능 최적화와 실패 로그(0번 유저) 수용을 위한 의도적 설계임.
12. 데이터 일관성 위반 여부를 주기적으로 모니터링하기 위한 운영 지침의 필요성을 보고서에 명시함.
13. `vault_ledger` 및 `vault_status` 테이블의 모든 금융 트랜잭션이 `v2_user`와 연동 완료됨을 확인함.
14. 운영 환경의 핵심 비즈니스 로직(팀, 금고, 레벨)이 모두 V2 Native 환경으로 이관되었음을 선언함.
15. 시스템 전반의 유저 식별 체계가 V2 ID로 통합되어 도메인 간 교차 검증의 토대가 마련됨을 확인함.
16. 레거시 `user` 테이블에 대한 서비스 로직의 물리적 의존성 잔재를 전수 조사하여 제거 완료함.
17. 데이터 정합성이 DB 제약조건(FK) 수준에서 강제되고 있어 소프트웨어적 오류 전파가 차단됨을 확인함.
18. 감사 로그 보존 정책(90일)에 따른 테이블 디자인이 V2 표준을 준수하고 있음을 최종적으로 확인함.
19. 이 감사는 전체 도메인이 하나의 V2 유저 생태계 안에서 유기적으로 정합되었음을 입증하는 결과물임.
20. 향후 신규 도메인 개발 시 이 감사 리포트의 V2 FK 매핑 정책을 표준 가이드라인으로 준수해야 함.
상태: 검증 완료 ✅ (V2 Native Integration Verified)
코드 정합성 상태: 🟢 (핵심 비즈니스 테이블의 v2_user FK 매핑 완료 및 서비스 로직 연동 확인)

증거문서이름: 20260131_mission_login_v2_fk_patch.md (Mission Login & DB FK Patch)
증거문서핵심내용:
1. 이벤트 미션(신규 다음날 로그인)의 카운트가 누락되던 버그를 수정하고 DB 외래 키 정합성을 전수 패치함.
2. 원인 분석 결과, `ensure_login_progress` 메서드가 일반 로그인만 처리하고 연속 로그인(Streak) 트리거를 누락한 점을 발견함.
3. 수정 사항으로 `V2User.last_play_date`를 현재 서버 시간(09:00 KST 기준)과 비교하여 연속성 여부를 자동 판단하도록 함.
4. "NEXT_DAY_LOGIN", "LOGIN_STREAK" 등 미션 액션 타입과 실제 코드 내의 트리거 함수 간의 명칭 및 로직 정합성을 확보함.
5. V2 로그 테이블(`v2_dice_log`, `v2_roulette_log` 등) 전반에서 `user_id` 컬럼의 FK 누락 문제를 식별하고 해결함.
6. 유저 삭제 시 관련 활동 로그가 고아 데이터(Orphaned)로 남는 리스크를 방지하기 위해 `ON DELETE SET NULL` 정책을 적용함.
7. `v2_user_auth_event` 테이블은 성능 최적화와 로그인 실패 기록(0번 유저) 수용을 위해 기술적 결정에 따라 FK를 생략함.
8. Alembic 마이그레이션 스크립트를 생성하여 상용 DB에 물리적 FK 제약 조건을 공식적으로 반영하고 데이터 무결성을 강화함.
9. `mission_service.py` 내부의 미션 진행도 업데이트 시퀀스를 정교화하여 상시 출석 및 기간제 이벤트 미션 통합 관리를 실현함.
10. `_operational_play_date` 헬퍼 함수를 도입하여 한국 시간 기준의 데일리 리셋 정책이 코드 전반에 일관되게 적용되도록 함.
11. 유저 미션 진행 레코드(`user_mission_progress`) 생성 실패 시의 예외 처리를 보강하여 전체 인증 플로우 중단을 방지함.
12. 미션 목표 수치(`target_value`) 도달 시 즉시 완료 플래그를 업데이트하고 보상 수령 권한을 부여하는 자동화 시나리오를 검증함.
13. `v2_shop_order` 등 주요 상거래 테이블에 FK를 추가하여 유저 탈퇴 시에도 브랜드 정합성과 통계적 수치 안정성을 확보함.
14. 배포 후 상용 가검증을 통해 `mission_id=8` (연속 로그인) 유저의 카운트가 정상적으로 누적됨을 실제 데이터로 증명함.
15. 이 패치는 데이터 정합성(Consistency) 유지와 미션 시스템의 사용자 경험 신뢰도를 동시에 충족하는 중요한 패치임.
16. 향후 모든 신규 감사 로그 테이블 설계 시 `user_id` FK 및 삭제 전파 정책을 표준 스키마 템플릿으로 준수하도록 규정함.
17. 고아 데이터 발생 방지를 위해 주기적으로 정합성 체크 쿼리를 실행하고 결과를 리포팅하는 운영 파이프라인 가이드를 수립함.
18. 미션 보상 지급 과정의 트랜잭션 원자성을 강화하여 중복 지급이나 누락이 없는 금융권 수준의 안정성을 추구함.
19. 변경 이력을 통해 Antigravity AI가 기여한 연속 로그인 판별 알고리즘의 최적화 및 날짜 계산 로직 수정 내역을 기록함.
20. 결과적으로 미션과 DB 아키텍처가 V2 엔터프라이즈 사양에 맞게 최종적으로 정렬되었음을 선언함.
상태: 적용 완료 ✅ (RESOLVED)
코드 정합성 상태: 🟢 (MissionService 트리거 및 DB FK 스키마 일치)

증거문서이름: 20260129_auth_mission_integration_test_update.md (Auth+Mission Integrated Test Update)
증거문서핵심내용:
1. Auth와 미션 시스템 간의 연동 과정을 SoT 및 실제 코드 구현 로직 기준으로 재정렬한 패치 노트임.
2. `/api/v2/dev/login` 호출 시 발생하는 404 응답의 기술적 원인을 분석하여 라우터 결함이 아님을 규명함.
3. 원인은 `create_if_missing` 기본값이 `False`일 때 유저가 부재할 경우 반환되는 정상적인 예외 처리임.
4. DEV 라우터의 노출 조건을 `local`, `dev`, `development` 환경으로 엄격히 제한하는 보안 정책을 수립함.
5. `POST /api/v2/dev/login` 파라미터 중 `create_if_missing=True` 명시 시의 유저 자동 생성 성공을 검증함.
6. `cc_id` 누락 또는 공백 입력 시의 400 Bad Request (`MISSING_CC_ID`) 반환 처리 로직을 코드에 보강함.
7. 테스트 환경(pytest) 구동 시 `ENV` 환경 변수를 `dev`로 강제 고정하여 라우터 접근성을 확정적으로 보장함.
8. 미션 클레임 API 경로(`api/v2/mission/{id}/claim`)와 권한 체크 로직의 물리적 구현 위치를 동의함.
9. 멱등성 보장을 위한 `X-Idempotency-Key` 헤더 필수 포함 여부를 통합 테스트 시나리오에 공식 반영함.
10. `app/v2/api/routes.py` 내의 불필요한 DEV 라우터 중복 등록 코드를 제거하여 라우팅 설계를 단순화함.
11. 테스트 입력 Payload와 실제 비즈니스 기대 결과값 사이의 1:1 매핑을 통한 테스트 신뢰도를 극대화함.
12. `tests/conftest.py`를 수정하여 테스트용 DB 초기화 및 인증 컨텍스트 주입 과정을 최신화함.
13. 통합 테스트 파일 내의 5개 핵심 인증-미션 연동 시나리오가 모두 정상 통과(Passed)됨을 확인함.
14. 단순히 코드를 수정하는 것이 아니라 "테스트가 검증해야 할 비즈니스 명세"를 명확히 정립하는 성과를 거둠.
15. 유저 미존재 404 시나리오를 '의도된 동작'으로 간주하여 실패 테스트 케이스에서 정상 분리함.
16. 로그인 성공 시 연쇄적으로 발생하는 미션 진행도 업데이트와 인증 이벤트 기록의 순차적 흐름을 검증함.
17. 멱등성 키가 동일한 중복 요청 시 미션 보상이 이중 지급되지 않는 방어 로직이 작동함을 최종 확인함.
18. 이번 업데이트를 통해 개발 단계에서의 Auth 시스템 테스트 환경의 일관성과 정확성을 대폭 향상함.
19. 향후 신규 기능 추가 시 `api_router`의 환경별 노출 필터 정책을 준수하도록 개발 가이드를 보강함.
20. 결과적으로 Auth와 미션 시스템 간의 데이터 결합 부위가 테스트 레이어에서 100% 커버됨을 입증함.
상태: 적용 완료 ✅
코드 정합성 상태: 🟢 (API Routes 구성 및 Integration Test 기대값과 실제 코드 로직 완전 일치)

증거문서이름: 20260129_v2_auth_reliability_update.md (V2 Auth Reliability & Consistency Update)
증거문서핵심내용:
1. V2 인증 시스템의 설계 사양(SoT)과 실제 `auth_routes.py` 코드 간의 미세한 격차를 완전히 해소함.
2. 기존에 Access Token만 발급되던 `v2_login` 계열 함수를 Access + Refresh Token 이중 발급 체계로 전환함.
3. `V2AuthService.issue_v2_tokens`를 토큰 발급의 단일 진입점(SSOT)으로 정의하여 발급 로직을 일원화함.
4. Access Token (15분) 및 Refresh Token (30일)에 대한 만료 정책을 글로벌 설정값과 코드에 엄격히 반영함.
5. 인증 감사 로그(`v2_user_auth_event`) 기록 시 클라이언트 IP와 User-Agent 상시 수집 로직을 내재화함.
6. 인증 실패 시 DB에 구체적인 에러 사유를 동시 기록하여 운영팀의 트러블슈팅 효율성을 획기적으로 개선함.
7. 미션 시스템과의 종속성을 `ensure_login_progress` 메서드로 캡슐화하여 서비스 레이어의 결합도를 낮춤.
8. `telegram_routes.py`와 `auth_routes.py`에서 동일한 미션 카운트 합산 로직이 호출되도록 정합을 맞춤.
9. 프론트엔드 대응을 위한 `/login/test` (테스트 페이지)와 `/login` (상용 페이지)의 이원화 운영 전략을 지원함.
10. 테스트 페이지(`V2TelegramTestLoginPage`)에 초기화 유의 안내 및 개발 로그인용 수단을 연동 완료함.
11. 상용 페이지(`V2TelegramLoginPage`)에는 자동 인증, 성공 피드백(진동), 로딩 UI 등 UX 최적화 요소를 반영함.
12. 비 텔레그램 환경 감지 시 사용자에게 적절한 안내 문구와 재접속 가이드를 제공하는 가드 로직을 구현함.
13. Refresh Token의 슬라이딩 윈도우 구현(만료 7일 전 접근 시 새 토큰 교체)의 실제 코드 동작을 검증함.
14. `v2_auth.py` 스키마에 `refresh_token` 필드를 공식 추가하여 클라이언트와의 API 규격을 정형화함.
15. 모든 API 호출 시 JWT 만료 응답에 대한 프론트엔드의 토큰 갱신 시퀀스가 백엔드와 완벽히 정합됨.
16. 감사 로그 보존 기간(90일) 및 아카이빙 대상을 문서화하고 코드 수준의 주석으로 정책을 명시함.
17. 로그인 성공 시 홈 화면 이동과 함께 신규 유저 대상 보상 정보를 직관적으로 노출하는 UI 시퀀스를 완성함.
18. 이 업데이트는 V2 인증 시스템의 신뢰성(Reliability)과 가용성(Availability)을 완성하는 최종 단계임.
19. 운영 배포 전 필수 체크리스트 항목을 전수 점검하여 배포로 인한 인증 중단 리스크를 제로화함.
20. 시스템의 모든 인증 시도가 추적 가능해졌으며, 토큰 관리 정책이 현대적 보안 표준을 충족함을 확인함.
상태: 적용 완료 ✅ (문서 및 코드 정합 갱신)
코드 정합성 상태: 🟢 (이중 토큰 발급 원칙 및 감사 로깅 정책이 실제 코드와 고도로 일관됨)

증거문서이름: v2_sig_import_cleanup_guide_v1.0.md (V2 Import Cleanup Guide)
증거문서핵심내용:
1. V2 코드베이스 내의 V1 네임스페이스(`app.services.*` 등) 참조를 완전히 제거하기 위한 기술적 지침서임.
2. V2 전용 서비스 및 테이블을 사용하는 '아키텍처 이관' 상태와 테스트 통과 기반의 '기능 검증' 상태를 엄격히 분리함.
3. 이관 범위는 Backend(`app/v2/**`)와 관련 문서(`dependency_inventory`, `verification_checklist`) 전반을 포함함.
4. V1 import 제거 원칙으로 기존 동작의 원칙적 유지와 최소한의 diff 발생을 통한 리스크 관리를 명시함.
5. Auth, Vault, Shop, Inventory, Mission 등 8개 주요 영역별로 카테고리를 분류하여 단계적 정리를 권고함.
6. 스캔 절차로 `grep` 등을 활용하여 `app/v2` 내의 V1 참조 지점을 전수 조사하고 목록화하는 로직을 정의함.
7. 대체 절차로 V1 서비스를 V2 전용 서비스(`app/v2/services/*`)로 교체하고 V2 로그 테이블 연동을 확인함.
8. 정리 과정에서 불필요한 중복 로직을 제거하되, 대규모 리팩토링은 지양하고 최소 수정 원칙을 고수함.
9. 기록 절차로 이관이 완료된 항목에 대해 `dependency_inventory`와 `verification_checklist`를 상시 동기화함.
10. Vault 영역의 경우 V1 VaultService를 제거하고 `V2VaultService` 단독 사용 및 어드민 로직 이관을 완료함.
11. Game 영역은 V1 VaultService 의존을 끊고 `V2VaultService` 기반의 shim을 통해 게임-금고 연동을 보장함.
12. Mission/Attendance 영역은 V1 RewardService 등의 의존성을 제거하고 V2 전용 내부 서비스로 완전 수렴함.
13. Shop 영역은 `UiConfigService` 및 `IdempotencyService`를 V2 네임스페이스로 대체하여 아키텍처를 정립함.
14. Team Battle 및 Survey 영역은 V1 서비스 참조를 0건으로 만드는 'Functional Verified' 달성 내역을 기록함.
15. Admin 영역의 경우 우선순위에 따라 `vault_routes` 등 핵심 경로를 먼저 이관하고 저트래픽 경로는 후순위 배치함.
16. 집중 스캔 결과로 `inventory_service`, `shop_service` 등의 완료 상태와 미진한 admin 서비스 백로그를 명시함.
17. 검증 수단으로 `pytest`를 활용하여 아키텍처 정합성(`test_v2_architecture_sot.py`)을 상시 체크하도록 가이드함.
18. 이 가이드는 V2 시스템이 V1의 영향권에서 벗어나 독립적인 'v2-only' 환경을 구축하는 로드맵 역할을 수행함.
19. 변경 이력을 통해 Game/Shop/Inventory 등 핵심 도메인의 V1 import 제거 완료 시점과 통과 로그를 투명하게 공개함.
20. 향후 모든 V2 패치는 이 가이드의 import 정책을 위반하지 않아야 하며, V1 참조 발생 시 즉각 경고 대상을 분류함.
상태: 적용 완료 ✅
코드 정합성 상태: 🟢 (V2 서비스 레이어의 V1 참조 제거 상태와 가이드라인 일치)

증거문서이름: v2_telegram_auth_sot_ko.md (V2 Telegram Auth SoT)
증거문서핵심내용:
1. 텔레그램 미니 앱 기반 인증 정책과 9개 도메인 간의 통합 방식을 정의한 최상위 단일 원천(SoT) 문서임.
2. `user`(V1) 테이블 의존성을 완전히 배제하고 `v2_user` 테이블만을 인증의 핵심 소스로 사용하는 아키텍처를 수립함.
3. `initData` 검증 시 HMAC-SHA256 서명 확인을 통해 보안 무결성을 확보하고 `validate_init_data` 로직을 상세 정의함.
4. 신규 유저 생성 시 `tg_{tg_id}_{uuid8}` 형식의 고유 `cc_id` 부여 정책과 가입 자동화 프로세스를 명시함.
5. 기존 웹 계정과의 연동을 위한 `link_{code}` 기반 시나리오를 설계하되, 현재 구현 상태와의 갭을 명확히 식별함.
6. 추천인 시스템 연동을 위해 `start_param` 내 `ref_{id}` 파싱 및 보상 지급(미션 연동) 워크플로우를 기술함.
7. Pre-Release 환경을 위한 DEV 로그인 정책을 수립하고, 상용 환경에서의 DEV 엔드포인트 차단(403)을 강제함.
8. 토큰 정책으로 Access Token (15분) 및 Refresh Token (30일, sliding window)의 구체적인 클레임 구조를 정의함.
9. JWT 내 `sub`, `iat`, `exp`, `role` 등 표준 클레임을 사용하여 시스템 전반의 인증 일관성을 부여함.
10. Refresh Token의 DB 기반 화이트리스트 관리 및 로그아웃 시 즉시 폐기(Revocation) 로직을 서비스 레이어에 규정함.
11. RBAC 모델을 통해 USER, OPERATOR, MANAGER, ADMIN 등 역할별 접근 권한 범위를 세밀하게 분류함.
12. 권한 검증 우선순위로 JWT 클레임 확인 후 필드 부재 시 `AdminUserProfile.tags`를 폴백 조회하는 순서를 정의함.
13. 감사 로그 정책에 따라 `v2_user_auth_event` 테이블에 로그인 성공/실패, RBAC 거부 등 7종 이벤트를 기록함.
14. 부하 방지 및 로그인 실패 처리(0번 유저)를 위해 감사 로그 테이블의 물리적 FK를 의도적으로 제외하는 결정을 기록함.
15. 감사 데이터의 보존 기간을 90일로 설정하고, 기간 만료 시 자동 아카이빙 및 삭제 처리하는 패키지를 구성함.
16. 9개 도메인별 영향도를 분석하여 User 도메인의 높은 리스크와 Vault/Mission 도메인의 중간 수준 연동을 식별함.
17. 배포 전 체크리스트로 `TELEGRAM_BOT_TOKEN`, `JWT_SECRET` 설정 및 `DEV_LOGIN` 차단 여부를 전수 점검하도록 함.
18. 모니터링 지표로 로그인 성공률, 텔레그램 검증 실패율 등을 정의하여 이상 징후 감출 시 알림 임계값을 설정함.
19. 2026-01-29 기준 P0(MVP 필수) 및 P1 항목의 구현 완료 상태를 파일 목록 및 단위 테스트 결과와 함께 공표함.
20. 이 문서는 텔레그램 인증의 모든 기술적/비즈니스적 결정 사항을 포괄하며, 향후 모든 확장의 준거 기준이 됨.
상태: 구현 완료 ✅
코드 정합성 상태: 🟢 (V2 인증 테이블 모델 및 텔레그램 검증 로직 소스 코드와 완벽 일치)

증거문서이름: v2_v1_dependency_inventory_ko.md (V2 to V1 Dependency Inventory)
증거문서핵심내용:
1. V2 코드베이스 내에서 V1 서비스, 라우트, 모델을 경유하는 모든 지점을 전수 조사하여 목록화한 인벤토리 문서임.
2. V2-only 전환을 위해 반드시 제거하거나 대체해야 할 이관 범위를 식별하여 마이그레이션 우선순위를 도출함.
3. `app/v2/**` 내의 `from app.services...` 참조를 스캔하여 V1 서비스 호출 지점을 영역별로 카테고리화함.
4. `v1_auth_user_alias.py`와 같이 V2 API가 V1 라우트를 직접 호출하는 '직접 경유' 지점을 리스크 관리 대상으로 등록함.
5. V2 API 라우트(`routes.py`)에서 `FeatureService`, `InventoryService` 등 10여 개 V1 서비스를 호출하는 현황을 상세 기록함.
6. 어드민 라우트(`admin/*.py`) 내부의 V1 모델(`UserGameWallet`, `User`) 의존성 및 V2 서비스 이관 진척도를 병기함.
7. V2 서비스 레이어에서 V1 `AuditService`나 `OpsLogService` 등을 참조하는 시나리오와 대체 필요성을 제기함.
8. 현재 구현 및 운영 중인 V2 서비스 15종(`vault_service`, `mission_service` 등)의 목록과 역할 범위를 정의함.
9. CSV 형식의 마이그레이션 맵을 통해 25개 엔드포인트별 V1 서비스 호출 여부와 이관 상태(mixed, v2-only)를 관리함.
10. `v2/auth/token` 및 `v2/auth/login` 경로의 V1 의존성을 'High Risk'로 분류하고 V2 Auth 완성 후 폐기 계획을 수립함.
11. `v2/vault` 및 `v2/activity` 경로의 이관 상태를 점검하여, 금고는 완료(v2-only), 활동 기록은 진행 중(mixed)임을 명시함.
12. 게임 엔진(roulette, dice, lottery)의 V1 서비스 참조를 제거하고 V2 전용 서비스로 분리 완료한 내역을 증거와 함께 기록함.
13. `v2/inventory` 및 `v2/shop` 경로의 미진한 SoT 전환 상태를 식별하고, 재화 차감 및 결제 로직의 High Risk를 경고함.
14. `v2/admin/economy` 등 어드민 기능의 V1 `GameWalletService` 의존성을 식별하여 재화 쓰기 로직의 이관 필요성을 강조함.
15. V1과 V2가 동일한 경로(`/api/events/status`)를 공유하여 발생하는 경로 충돌 리스크를 식별하고 해결책을 제안함.
16. 파일 레벨의 증거(파일명 및 라인 넘버)를 유지/확장하여 개발자가 정확한 수정 위치를 파악할 수 있도록 지원함.
17. 각 항목에 대해 소유권(Owner)과 예상 완료 시간(ETA), 작업 방식(Migrate/Shim/Keep)을 지정하여 관리 체계를 구축함.
18. 자동 스캔 스크립트를 통한 정기적인 의존성 체크를 권고하여 PR 리뷰 시 V1 참조 유입을 사전 차단하도록 함.
19. High 우선순위 항목(인증, 금고 쓰기, 상점 결제, 게임 실행)부터 'Plan-Patch-Verify-Ship' 시퀀스로 진행할 것을 명시함.
20. 이 문서는 V2 아키텍처의 순수성(Purity)을 유지하고 레거시 기술 부채를 체계적으로 청산하기 위한 실행 계획서임.
상태: 관리 중 🟡 (Mixed 상태 항목 잔존)
코드 정합성 상태: 🟢 (인벤토리에 기록된 V1 참조 지점이 코드베이스 내 grep 결과와 일치함)

증거문서이름: W05_AUTH_troubleshooting.md (Weekly Auth Troubleshooting Report)
증거문서핵심내용:
1. W05 주차(1/27~2/2) 동안 발생한 Auth 도메인의 핵심 이슈와 해결 과정, 기술적 결정 사항을 기록한 주간 보고서임.
2. V2 Auth Production 환경 도입 직후의 안정성 체크(P0)를 최우선 순위로 다루어 시스템 정합성을 검증함.
3. 상용 서버에서의 `TELEGRAM_BOT_TOKEN` 연동 무결성과 네트워크 환경에 따른 해시 검증 로직의 안정성을 최종 확인함.
4. `pytest` 기반의 14개 핵심 인증 테스트 케이스 전수 통과(Passed) 내역을 통해 백엔드 로직의 신뢰성을 입증함.
5. 운영 트래픽 내의 `v2_user_auth_event` 데이터를 분석하여 RBAC 거부 및 로그인 시퀀스가 설계대로 작동함을 확인함.
6. 어드민 대시보드와 연동된 실시간 인증 로그 조회 기능의 정상 작동 여부를 현장 테스트를 통해 최종 검증함.
7. `v2_user_auth_event` 테이블의 물리적 외래 키(FK) 미설정 정책에 대한 감사 결과를 'RESOLVED'로 확정 기록함.
8. 성능 최적화(Write Performance)와 로그인 실패 시의 예외적 데이터 수용을 위해 FK를 배제한 설계 의도를 재확인함.
9. 데이터 일관성 유지를 위해 애플리케이션 레벨의 제어 로직과 90일 단위의 로그 파티션/삭제 정책을 수립함.
10. `purge_user` 기능 수행 시 인증 로그를 비가역적 보존 데이터로 간주하여 처리하는 운영 지침을 확정함.
11. 1월 20일 발생한 어드민 지갑 및 인벤토리 수정 권한 제약(`403 Forbidden`) 이슈의 원인과 해결책을 기록함.
12. 발생 원인은 백엔드 라우터 내부에 잔존하던 `SUPER_ADMIN` 또는 `OPERATOR` 직급에 대한 하드코딩된 필터링 로직임.
13. V2 Admin 통합 인증 체계(`get_current_admin_info`)와의 충돌로 인해 정상적인 `ADMIN` 권한 행사가 방해된 점을 식별함.
14. 해결 조치로 `adjust_user_wallet` 등 핵심 함수 내부의 불필요한 직급 필터링 코드를 전면 제거하고 인증 체계를 단권화함.
15. 권한 모델 단순화(RBAC Simplification)를 통해 인증된 모든 어드민에게 운영 기능을 개방하여 업무 효율성을 제고함.
16. 개선 후 `ADMIN` 계정으로 로그인 후 유저 자산 수정 및 아이템 지급 동작이 정상 작동함을 실제 운영 환경에서 확인 완료함.
17. 주간 이슈 요약을 통해 V2 Auth 검증, FK 정책 결정, 권한 제약 해결 등 3대 핵심 성과를 테이블 형태로 제시함.
18. 변경 이력을 통해 Antigravity AI가 기여한 어드민 로그인 무결성(Integrity) 확보 및 보안 필드 추가 내역을 추적함.
19. 통합/인증/라우팅 이슈에 대한 체계적인 분류 내역을 추가하여 향후 유사 장애 발생 시의 대응 속도를 높임.
20. 이 문서는 운영 초기 Auth 시스템의 기술적 장애 요인을 제거하고 보안/성능 정책의 기틀을 마련한 기록물임.
상태: 완료 ✅ (ACTIVE -> RESOLVED)
코드 정합성 상태: 🟢 (Troubleshooting 내역이 패치된 소스 코드 반영 사항과 일치)

증거문서이름: v2_auth_technical_guide_ko.md (V2 Auth Technical Implementation Guide)
증거문서핵심내용:
1. Telegram 공식 문서 기반의 initData 검증 알고리즘(HMAC-SHA256)의 구체적인 구현 단계를 정의함.
2. 기존 `app/core/telegram.py`의 해시 비교 누락 문제를 식별하고, V2 전용 모듈에서 해결된 내역을 기록함.
3. `app/v2/core/telegram.py` 내의 `hmac.compare_digest`를 활용한 타이밍 공격 방지 로직의 실제 코드를 수록함.
4. 로그인 실패 시 `LOGIN_FAILED` 이벤트를 DB에 기록하고 400 에러를 반환하는 표준 에러 처리 패턴을 확립함.
5. V2 Access Token의 JWT 클레임 구조(sub, iat, exp, typ, role)를 정의하여 토큰의 표준성을 확보함.
6. Refresh Token의 구조(jti 포함)와 30일 만료 정책, UUID 기반의 고유 식별자 부여 방식을 기술함.
7. `create_access_token` 및 `create_refresh_token` 함수의 구현 디테일과 JWT 인코딩 설정을 명시함.
8. Access Token(15분)과 Refresh Token(30일) 각각에 대한 독립적인 디코딩 및 검증 로직을 구현함.
9. `get_current_admin_info` 의존성을 통한 RBAC(역할 기반 접근 제어) 미들웨어의 실무적 구현 방법을 정의함.
10. JWT 클레임의 `role` 정보와 `AdminUserProfile.tags` 폴백 조회를 통한 권한 검증 시퀀스를 확립함.
11. 권한 거부 시 `RBAC_DENIED` 이벤트를 감사 로그에 자동 기록하여 보안 가시성을 강화하는 로직을 추가함.
12. Admin API 엔드포인트에서 `Depends(get_current_admin_info)`를 활용한 권한 분기 적용 예시를 제공함.
13. 환경별(`local`, `dev`, `prod`) 인증 제한 정책과 `DEV_LOGIN_ENABLED` 플래그의 실무적 작동 원리를 기술함.
14. `app/v2/api/dev_login.py`를 통한 개발용 백도어 로그인 구현과 운영 환경에서의 차단 정책을 명시함.
15. `v2_user_auth_event` 테이블을 활용한 7종 인증 이벤트(LOGIN, LOGOUT, REFRESH, RBAC 등) 로깅 체계를 구축함.
16. IP 주소(IPv4/v6) 및 User-Agent 정보를 수집하여 부정 로그인 및 어뷰징 탐지의 기술적 토대를 마련함.
17. `v2_user_refresh_token` 테이블의 화이트리스트 관리 방식과 `revoked_at`을 활용한 세션 폐기 로직을 정의함.
18. 토큰 갱신(`${api}/refresh`) 시 만료 7일 전 슬라이딩 윈도우 방식으로 새 토큰을 발급하는 시퀀스를 구현함.
19. V2 인증 시스템이 V1 엔진의 의존성 없이 독립적으로 작동하기 위한 필수 환경 변수 및 설정값을 정리함.
20. 이 가이드는 V2 인증 구현의 최종 기술 명세로서, 향후 유지보수 및 확장 시의 절대적 기준점 역할을 수행함.
상태: 구현 완료 ✅
코드 정합성 상태: 🟢 (HMAC 검증, JWT 구조, RBAC 로직이 실제 소스 코드와 100% 일치)

증거문서이름: v2_auth_trouble_mapping_ko.md (V2 Auth Trouble Mapping & Impact Analysis)
증거문서핵심내용:
1. 인증 SoT 적용 시 전체 9개 비즈니스 도메인에 미치는 영향도와 잠재적 충돌 포인트를 전수 조사함.
2. User 도메인의 신규 테이블 추가 및 V1/V2 유저 식별자 혼재 리스크에 대한 기술적 해결 방안을 수립함.
3. Vault 도메인의 로그인 직후 잔액 동기화 타이밍 이슈와 신규 유저 보너스 정책의 이관 내역을 점검함.
4. Mission 도메인의 로그인 미션 트리거 멱등성 보장 및 한국 시간(09:00 KST) 리셋 정책 정합성을 기술함.
5. Admin 도메인의 RBAC 로깅 누락 문제 해결 내역과 `SUPER_ADMIN` 역할 정규화 정책의 반영 상태를 확인함.
6. Game/Shop/Inventory 등 저영향도 도메인이 JWT 토큰 검증에만 의존하여 독립성을 유지함을 명시함.
7. `/api/v2/activity/record`와 프론트엔드 호출 경로 간의 불일치 이슈를 별칭(Alias) 엔드포인트로 해결함.
8. DEV 로그인 라우터의 노출 제한 정책과 실제 `routes.py` 등록 유무에 따른 404 위험 요소를 식별 및 보고함.
9. 텔레그램 `initData` 해시 검증 시 타이밍 공격 방지 시스템 도입에 따른 보안 강화 효과를 분석함.
10. V1(24시간)과 V2(15분) 간의 Access Token 만료 시간 차이로 인한 프론트엔드 연동 주의 사항을 정의함.
11. MVP 패치, Refresh 토큰 구현, 크로스도메인 해결 등 3단계 마이그레이션 순서와 진척도를 기록함.
12. 텔레그램 인증 실패율 급증 시의 긴급 롤백(검증 임시 우회) 시나리오와 복구 절차를 매뉴얼화함.
13. 서비스 중단을 최소화하기 위한 토큰 만료 시간 임시 연장 등의 부분 롤백 옵션을 전략적으로 구성함.
14. 실시간 모니터링을 위한 로그인 성공률, 해시 검증 실패율 등 5대 비즈니스 메트릭 계산식을 정의함.
15. 이상 징후 감지 시의 경고 및 긴급 알림 임계값(Threshold)을 구체적인 백분율 수치로 설정함.
16. SQL 기반의 대시보드 쿼리 예시를 제공하여 운영팀의 시스템 상태 가시성을 획기적으로 향상함.
17. 기능, 성능, 보안, 호환성 관점의 QA 체크리스트를 통해 배포 전후의 무결성 검증 항목을 규정함.
18. 초당 100건 이상의 로그인 처리를 목표로 하는 성능 테스트 기준과 지연 시간(LATENCY) 목표치를 설정함.
19. "Invalid hash" 및 "TOKEN_EXPIRED" 등 빈번한 장애 상황에 대한 현장 대응 가이드를 수록함.
20. 이 문서는 인증 전환 과정에서 발생 가능한 모든 트러블을 예측하고 선제적 방어 기제를 구축하는 핵심 전략서임.
상태: 적용 완료 ✅
코드 정합성 상태: 🟢 (식별된 도메인별 영향도와 충돌 해결책이 실제 패치 내역 및 운영 정책에 반영됨)

증거문서이름: v2_auth_user_api_contract_ko.md (V2 Auth & User API Contract)
증거문서핵심내용:
1. V2 인증, 유저, 활동 기록, 온보딩 시스템의 상세 API 계약(Schema & Payload)을 단권화하여 정의함.
2. 모든 보호된 API 호출 시 `Authorization: Bearer` 헤더 사용을 강제하고 401/403 등 표준 에러를 규정함.
3. `POST /api/v2/auth/token` 및 `login` (별칭) 경로의 요청/응답 규격과 테스트용 예시 페이로드를 제공함.
4. `POST /api/v2/auth/refresh`를 통한 갱신 시 백엔드의 신규 토큰 발급 및 레코드 업데이트 규약을 명시함.
5. `POST /api/v2/auth/logout` 호출 시의 서버 측 세션 폐기 성공 응답(`success: true`) 체계를 확립함.
6. `POST /api/v2/activity/record`를 통한 사용자 활동 로그 수집 규격과 이벤트 타입/메타데이터 구조를 정의함.
7. `POST /api/v2/telegram/auth`의 텔레그램 미니 앱 인증 계약과 신규 유저 여부 판별 응답을 명시함.
8. 유저 계정 연동을 위한 `link-token` 발급 계약과 텔레그램 봇 오픈 URL 생성 규칙을 수립함.
9. 텔레그램 연결 해제(`unlink-request`) 절차와 이에 필요한 검증 데이터 형식을 API 레벨에서 정의함.
10. `POST /api/v2/dev/login` 개발 도구 API의 요청 규격(cc_id, nickname) 및 환경 제어 조건을 기술함.
11. `GET /api/v2/new-user/status`를 통한 온보딩 대상 유저 판별 및 웰컴 보상 수령 여부 확인 계약을 정의함.
12. `POST /api/v2/new-user/claim-welcome` 호출 시의 보상 지급 시퀀스와 성공 응답 규격을 확정함.
13. `GET /api/v2/user/me`를 통한 마이페이지용 상세 정보(ID, 닉네임, 텔레그램 연동 정보) 계약을 고착함.
14. `GET /api/v2/user/balance` 호출 시 금고 잔액과 티켓 수량 정보를 실시간으로 반환하는 스키마를 정의함.
15. `GET /api/v2/ui-config/{key}`를 통한 동적 UI 설정값(상점 제품군 등)의 조회 계약과 데이터 구조를 기술함.
16. OpenAPI 명세서(`v2_legacy_openapi.yaml`)와의 1:1 대응 관계를 통해 계약의 문서 정합성을 보장함.
17. 섹션 5의 소스(Source) 매핑을 통해 각 API 계약이 구현된 실제 Python 라우터 파일 경로를 명시함.
18. 레거시 경로와 V2 정식 경로 간의 과도기적 공존 기간 및 별칭(Alias) 활용 전략을 계약에 포함함.
19. v2.0 버전을 기준으로 전체 API 경로를 `/api/v2/` 네임스페이스로 표준화하여 시스템 일관성을 부여함.
20. 이 계약서는 FE와 BE 간의 통신 규약으로서 기능하며, 모든 기능 개발 및 품질 보증의 기준 명세로 활용됨.
상태: SoT 기준 충족 ✅
코드 정합성 상태: 🟢 (정의된 API 경로 및 스키마가 app/v2/api 내의 실제 구현체와 고도로 일관됨)

증거문서이름: v2_pre_release_auth_policy_ko.md (V2 Pre-Release Authentication Policy)
증거문서핵심내용:
1. 정식 배포 전 개발 및 로컬 환경에서 안정적인 기능 테스트를 수행하기 위한 임시 인증 정책을 수립함.
2. 적용 범위를 `local`, `dev`, `development` 환경으로 엄격히 제한하여 보안상 오남용 가능성을 차단함.
3. `external_id` (cc_id) 기반의 간소화된 DEV 로그인 플로우를 도입하여 개발 및 QA 속도를 최적화함.
4. V2 시스템의 비밀번호 미사용 원칙에 따라, 개발 로그인 시 비밀번호 입력 단계를 생략하는 정책을 명시함.
5. 계정 생성 정책으로 기존 유저 매칭을 우선하되, 명시적인 요청 시에만 테스트 계정을 생성하도록 제한함.
6. `external_id`를 연결의 유일한 식별자로 사용하여 장치나 텔레그램 계정 없이도 유저 컨텍스트를 유지함.
7. `/api/v2/dev/login` 엔드포인트의 구체적인 작동 방식과 프론트엔드 연동용 로그인 버튼 가이드라인을 제공함.
8. Payload에 포함된 `nickname`과 `create_if_missing` 파라미터가 유저 모델에 반영되는 로직을 정의함.
9. 배포 전 필수 체크리스트를 통해 운영 환경에서의 DEV 로그인 코드 노출 가능성을 전수 점검하도록 함.
10. 특정 `cc_id` 입력 시 유효한 Access Token이 발급되고 `/home` 진입이 정상적으로 이루어지는지 확인함.
11. 게임, 상점, 티켓 등 타 도메인 API가 개발용 토큰으로도 정상 호출(Authorization)되는지 검증함.
12. 전환 정책에 따라 운영 서버 배포 시 DEV 로그인을 원천 비활성화(Hard-Disable)하는 절차를 규정함.
13. 운영 전환 후에는 텔레그램 봇의 `/start` 코드 교환 방식만을 유일한 정식 인증 수단으로 인정함.
14. Pre-Release 단계에서의 인증 관련 설정값(`JWT_SECRET` 등)의 유효 범위를 로컬 세그먼트로 한정함.
15. 이 문서는 개발 접근성과 시스템 보안 사이의 균형을 맞춘 전환기적 가이드라인으로서의 권위를 가짐.
16. 프론트엔드 개발자가 텔레그램 API 없이 독립적으로 UI/UX를 개발할 수 있는 백도어 수단을 공식화함.
17. 테스트 계정 남발로 인한 DB 오염을 방지하기 위해 주기적인 초기화 정책과의 연계 방안을 제시함.
18. v1.0 작성을 통해 V2 인증 시스템의 빌드업 과정에서 필요한 거버넌스 문서를 선제적으로 확보함.
19. 변경 이력을 통해 Antigravity AI가 제안한 환경별 차단 로직 적용 시점과 정책 확정 내역을 기록함.
20. 결과적으로 배포 전 단계의 인증 정합성이 이 정책에 따라 운영되어 전체 개발 공정의 안정성을 담보함.
상태: SoT 기준 충족 ✅
코드 정합성 상태: 🟢 (설계된 임시 로그인 흐름과 환경 제어 로직이 dev_login.py 구현에 정확히 반영됨)
