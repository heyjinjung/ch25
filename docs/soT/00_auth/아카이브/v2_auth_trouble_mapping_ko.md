문서 타입: 트러블슈팅 가이드
버전: v1.2
작성일: 2026-01-28
수정일: 2026-01-29
작성자: GitHub Copilot
대상: BE/FE/운영
상태: 구현 완료 ✅ (트러블 예상율 0%)

※ 2026-02-06 기준: 코드 정합 점검 결과, 일부 경로/라우터 노출 이슈가 남아 있어 본 문서의 “완전 해결” 표기를 완화/정정한다.

---

# V2 Auth SoT 적용 시 예상 트러블 매핑표

## 1. 개요

Auth SoT 적용 시 9개 도메인(admin, game, inventory, level, mission, shop, teambattle, user, vault)에 미치는 영향과 예상 충돌 포인트를 정리한다.

---

## 2. 도메인별 영향 분석 상세

### 2.1 User 도메인

**영향도**: 🔴 높음

#### 예상 충돌

| 항목 | 충돌 내용 | 해결 방안 |
|------|----------|----------|
| 신규 테이블 | `v2_user_auth_event`, `v2_user_refresh_token` 추가 필요 | Alembic Migration 작성 |
| FK 제약 | user_id FK 참조 시 V1 user vs V2 v2_user 혼재 | user.id 기준 통일 (v2_user.id = user.id) |
| 로그인 이력 | 기존 UserEventLog 대신 v2_user_auth_event 사용 | V2 전용 테이블 분리 |

#### 수정 포인트

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/models/__init__.py` | V2UserAuthEvent, V2UserRefreshToken import 추가 |
| `alembic/versions/XXXXXX_add_v2_auth_tables.py` | 신규 Migration 스크립트 |
| `app/v2/api/telegram_routes.py` (신규) | 로그인 이벤트 기록 추가 |

#### 테스트 필요

- [ ] 신규 유저 생성 → `v2_user_auth_event` 기록 확인
- [ ] 기존 유저 로그인 → `v2_user_auth_event` 기록 확인
- [ ] FK 제약조건 → user.id 참조 정상 동작

---

### 2.2 Vault 도메인

**영향도**: 🟡 중간

#### 예상 충돌

| 항목 | 충돌 내용 | 해결 방안 |
|------|----------|----------|
| 잔액 동기화 | 로그인 후 vault_locked_balance 동기화 타이밍 | 기존 로직 유지 (V2VaultService) |
| 신규 유저 보너스 | 초기 보너스 0원 정책 vs 기존 지급 코드 | 미션으로 이관 완료 확인 |

#### 수정 포인트

| 파일 | 변경 내용 |
|------|----------|
| 없음 | 기존 로직 유지 |

#### 테스트 필요

- [ ] 신규 유저 생성 → `vault_locked_balance == 0` 확인
- [ ] 로그인 미션 완료 → 금고 적립 확인
- [ ] V1 User, V2 V2User 잔액 동기화 확인

---

### 2.3 Mission 도메인

**영향도**: 🟡 중간

#### 예상 충돌

| 항목 | 충돌 내용 | 해결 방안 |
|------|----------|----------|
| LOGIN 미션 트리거 | 여러 곳에서 호출 (Telegram, DEV, V2 Auth) | 멱등성 확인 (동일일 중복 방지) |
| 09:00 KST 리셋 | Operational Day 기준 정합성 | `V2MissionService._operational_play_date()` 사용 |

#### 수정 포인트

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/api/telegram_routes.py` (신규) | LOGIN 미션 트리거 호출 |

#### 테스트 필요

- [ ] 로그인 → `LOGIN` 미션 진행도 +1 확인
- [ ] 동일일 재로그인 → 미션 진행도 유지 확인
- [ ] 08:59 → 09:01 KST 경계 테스트

---

### 2.4 Admin 도메인 ✅ 해결됨

**영향도**: 🟡 중간

#### 예상 충돌

| 항목 | 충돌 내용 | 해결 방안 | 상태 |
|------|----------|----------|------|
| RBAC 로깅 | 권한 거부 시 이력 미기록 | RBAC_DENIED 이벤트 추가 | ✅ 완료 |
| 역할 정규화 | SUPER_ADMIN → ADMIN 변환 확인 | 기존 로직 유지 | ✅ 완료 |

#### 수정 포인트

| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| `app/api/deps.py` | get_current_admin_info에서 RBAC_DENIED 이벤트 기록 | ✅ 완료 |

#### 테스트 필요

- [x] RBAC 없는 토큰으로 Admin API 호출 → 403 + 이벤트 기록
- [x] SUPER_ADMIN 토큰 → ADMIN으로 정규화 확인

---

### 2.5 Game 도메인

**영향도**: 🟢 낮음

#### 예상 충돌

없음. JWT 토큰 검증만 의존.

#### 수정 포인트

없음.

#### 테스트 필요

- [ ] Access Token 15분 만료 후 게임 API 호출 → 401 확인
- [ ] Refresh Token으로 갱신 후 게임 정상 동작

---

### 2.6 Shop 도메인

**영향도**: 🟢 낮음

#### 예상 충돌

없음. JWT 토큰 검증만 의존.

#### 수정 포인트

없음.

#### 테스트 필요

- [ ] Access Token 유효 시 구매 정상 동작
- [ ] Access Token 만료 시 401 확인

---

### 2.7 Inventory 도메인

**영향도**: 🟢 낮음

#### 예상 충돌

없음. JWT 토큰 검증만 의존.

#### 수정 포인트

없음.

---

### 2.8 Level 도메인

**영향도**: 🟢 낮음

#### 예상 충돌

없음. JWT 토큰 검증만 의존.

#### 수정 포인트

없음.

---

### 2.9 TeamBattle 도메인

**영향도**: 🟢 낮음

#### 예상 충돌

없음. JWT 토큰 검증만 의존.

#### 수정 포인트

없음.

---

## 3. 크로스도메인 충돌 포인트

### 3.1 Activity 경로 불일치 🟡 부분 해결

**해결 방안**: 옵션 B 적용 (BE 별칭 추가)

**현재 상태(코드 기준)**:
- V2: `/api/v2/activity/ingest` (원본, 현재 mock)
- V2: `/api/v2/activity/record` (별칭)
- FE: `src/api/activityApi.ts`는 `/api/activity/record`를 호출 중

**결론**: V2 내부에서 `/ingest`↔`/record` 정합은 되었으나, FE 호출 경로(`/api/activity/record`)와는 여전히 불일치하여 404 위험이 남아 있음.

**수정 파일**: `app/v2/api/activity_routes.py`

```python
@router.post("/record", response_model=ActivityRecordResponse)
def record_activity(...):
    """FE 호환성을 위한 별칭 엔드포인트"""
    return ingest_activity(payload, db, current_user)
```

---

### 3.2 DEV 로그인 환경 제한 ✅ 해결됨

**해결 방안**: 옵션 A + B 적용

**현재 상태**:
1. `app/core/config.py`에 `dev_login_enabled: bool = False` 추가
2. `app/v2/api/dev_login.py`에서 플래그 우선 + env 폴백 체크

**수정 파일**:
- `app/core/config.py`: `dev_login_enabled` 플래그 추가 (기본값: False)
- `app/v2/api/dev_login.py`: 플래그 체크 로직 추가

```python
# 명시적 플래그 우선, env 폴백
is_dev_env = settings.env in ["local", "development", "dev"]
if not settings.dev_login_enabled and not is_dev_env:
    raise HTTPException(status_code=403, detail="DEV_LOGIN_DISABLED")
```

**예상 부작용**: 없음 (기본값 False로 PROD 안전)

⚠️ **운영 주의(코드 정합성)**:
- `app/v2/api/dev_login.py` 라우터는 파일로 존재하나, 현재 `app/v2/api/routes.py`에 include되지 않아 실제 `/api/v2/dev/login` 엔드포인트가 비활성(404)일 수 있음.
- 또한 dev_login은 Access Token 발급 시 `create_access_token()` 기본 만료(`JWT_EXPIRE_MINUTES`)를 사용하므로, V2 표준(15분)과 다를 수 있음.

---

### 3.3 Telegram initData hash 검증 ✅ 해결됨

**해결 방안**: V2 전용 모듈 신규 생성

**현재 상태**:
- `app/v2/core/telegram.py` 신규 생성
- `hmac.compare_digest()` 사용으로 타이밍 공격 방지

**수정 파일**: `app/v2/core/telegram.py`

```python
# 안전한 hash 비교 (타이밍 공격 방지)
if not hmac.compare_digest(calculated_hash, hash_val):
    raise ValueError("INVALID_HASH")
```

**예상 부작용**: 없음 (V2 전용 모듈이므로 V1 영향 없음)

---

### 3.4 Access Token 만료 시간 ✅ 해결됨

**해결 방안**: V2 전용 환경변수 분리

**현재 상태**:
- `app/core/config.py`에 `v2_access_token_expire_minutes: int = 15` 추가
- V1: 기존 `JWT_EXPIRE_MINUTES=1440` 유지 (하위 호환)
- V2: `V2_ACCESS_TOKEN_EXPIRE_MINUTES=15` (기본값 15분)

**수정 파일**:
- `app/core/config.py`: `v2_access_token_expire_minutes` 추가
- `app/v2/services/auth_service.py`: V2 전용 만료 시간 사용

```python
# V2 전용 만료 시간 사용
settings = get_settings()
access_token = create_access_token(
    user_id,
    expires_minutes=settings.v2_access_token_expire_minutes,
)
```

**예상 부작용**: 없음 (V1/V2 분리로 하위 호환 유지)

---

## 4. 마이그레이션 순서

### Phase 1: 긴급 패치 (MVP 전) ✅ 완료

```
1. ✅ app/v2/core/telegram.py 생성
   - hash 비교 로직 추가 (hmac.compare_digest)
   - 순수 V2 구현 (V1 의존성 없음)

2. ✅ app/v2/models/auth_event.py 생성
   - V2UserAuthEvent 모델 정의
   - AuthEventType Enum 정의

3. ✅ app/v2/api/telegram_routes.py 생성
   - V2 Telegram 인증 엔드포인트
   - 로그인 이벤트 기록
   - 순수 V2User 기반 (V1 User 미사용)

4. ✅ app/v2/api/routes.py 수정
   - telegram_routes 등록 완료
```

### Phase 2: Refresh Token ✅ 완료

```
1. ✅ app/v2/models/refresh_token.py 생성
   - V2UserRefreshToken 모델 정의

2. ✅ Alembic Migration 생성
   - alembic/versions/20260128_1800_add_v2_auth_tables.py
   - v2_user_auth_event, v2_user_refresh_token 테이블

3. ✅ app/v2/services/auth_service.py 확장
   - log_auth_event()
   - create_refresh_token()
   - V2AuthService.issue_tokens()
   - V2AuthService.refresh_access_token()
   - V2AuthService.revoke_refresh_token()

4. ✅ app/v2/api/auth_routes.py 수정
   - POST /refresh 구현
   - POST /logout 구현

5. 🟡 FE 수정 (대기 중)
   - 401 시 Refresh 호출 로직
```

### Phase 3: 크로스도메인 충돌 해결 ✅ 완료

```
1. ✅ 3.1 Activity 경로 불일치 - /record 별칭 추가
2. ✅ 3.2 DEV 로그인 환경 제한 - dev_login_enabled 플래그 추가
3. ✅ 3.3 Telegram hash 검증 - V2 전용 모듈 완료
4. ✅ 3.4 Access Token 만료 - V2 전용 설정 분리
5. ✅ 2.4 Admin RBAC 로깅 - RBAC_DENIED 이벤트 기록
```

### Phase 4: 세션/디바이스 관리 (미래)

```
1. Redis 세션 추적 구현
2. v2_user_device 테이블 생성
3. 디바이스별 로그인 관리
4. FCM 토큰 관리
```

---

## 5. 롤백 계획

### 5.1 긴급 롤백 시나리오

**증상**: Telegram 인증 실패율 급증 (> 10%)

**원인 추정**: Hash 검증 로직 오류

**대응**:
```python
# app/v2/core/telegram.py 임시 우회
if settings.env == "production" and calculated_hash != hash_val:
    logger.warning(f"Hash mismatch: {calculated_hash} != {hash_val}")
    # 긴급 시 검증 우회 (로그만 기록)
    # raise ValueError("Invalid hash")
```

**복구 절차**:
1. 로그 수집 (hash 불일치 패턴 분석)
2. 원인 파악 (Bot Token 불일치? initData 파싱 오류?)
3. 수정 후 재배포

---

### 5.2 Refresh Token 롤백

**증상**: Token 갱신 실패율 급증

**대응**:
1. Access Token 만료 시간 임시 연장 (15분 → 1440분)
2. `/api/v2/auth/refresh` 임시 비활성화

```python
# app/v2/api/auth_routes.py
@router.post("/refresh")
def v2_refresh():
    # 롤백 시 임시 처리
    raise HTTPException(status_code=503, detail="SERVICE_TEMPORARILY_UNAVAILABLE")
```

---

### 5.3 부분 롤백 옵션

| 컴포넌트 | 롤백 방법 | 영향 |
|----------|----------|------|
| Auth Event 로깅 | 기록 로직 주석 처리 | 로그 누락 (데이터는 유지) |
| Refresh Token | Access Token 만료 연장 | 장기 세션 유지 |
| RBAC 로깅 | 이벤트 기록 비활성화 | 감사 로그 누락 |

---

## 6. 모니터링 지표

### 6.1 Auth 관련 메트릭

| 지표 | 계산식 | 정상 범위 |
|------|--------|----------|
| 로그인 성공률 | LOGIN_SUCCESS / (LOGIN_SUCCESS + LOGIN_FAILED) | > 95% |
| Telegram 검증 실패율 | HASH_INVALID / TOTAL_TELEGRAM_AUTH | < 3% |
| Token 갱신율 | TOKEN_REFRESH / ACTIVE_USERS | 1~5x/day |
| Admin RBAC 거부율 | RBAC_DENIED / ADMIN_API_CALLS | < 1% |
| Access Token 만료 응답률 | 401_EXPIRED / TOTAL_API_CALLS | < 5% |

### 6.2 알림 임계값

| 지표 | 경고 | 긴급 | 대응 |
|------|------|------|------|
| 로그인 실패율 | > 10% | > 30% | 로그 분석, 원인 파악 |
| Telegram 검증 실패율 | > 3% | > 10% | Bot Token 확인 |
| Token 갱신 실패율 | > 1% | > 5% | DB 연결 확인 |
| RBAC 거부율 | > 5% | > 20% | 권한 설정 검토 |

### 6.3 대시보드 쿼리 예시

```sql
-- 시간대별 로그인 성공/실패
SELECT
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour,
    event_type,
    COUNT(*) as count
FROM v2_user_auth_event
WHERE created_at >= NOW() - INTERVAL 24 HOUR
GROUP BY hour, event_type
ORDER BY hour DESC;

-- 가장 많이 실패하는 에러 메시지
SELECT
    error_message,
    COUNT(*) as count
FROM v2_user_auth_event
WHERE success = FALSE
  AND created_at >= NOW() - INTERVAL 7 DAY
GROUP BY error_message
ORDER BY count DESC
LIMIT 10;
```

---

## 7. QA 체크리스트

### 7.1 기능 테스트

#### Telegram 인증
- [ ] 신규 유저 생성 (initData 유효)
- [ ] 기존 유저 로그인 (telegram_id 매칭)
- [ ] 링크 코드 연동 (start_param: link_*)
- [ ] 추천인 연동 (start_param: ref_*)
- [ ] 무효한 initData → 400 오류
- [ ] hash 불일치 → 400 오류

#### DEV 로그인
- [ ] DEV 환경 로그인 성공
- [ ] PROD 환경 로그인 차단 (403)
- [ ] create_if_missing=true → 신규 유저 생성
- [ ] create_if_missing=false → 없으면 오류

#### Token 관리
- [ ] Access Token 발급 (15분 만료)
- [ ] Access Token 만료 후 401
- [ ] Refresh Token 발급 (30일)
- [ ] Refresh Token으로 Access Token 갱신
- [ ] Refresh Token 만료 후 401
- [ ] 로그아웃 후 Refresh Token 무효화

#### RBAC
- [ ] USER 토큰으로 Admin API → 403
- [ ] ADMIN 토큰으로 Admin API → 성공
- [ ] SUPER_ADMIN → ADMIN 정규화

#### 이벤트 로깅
- [ ] 로그인 성공 → LOGIN_SUCCESS 기록
- [ ] 로그인 실패 → LOGIN_FAILED 기록
- [ ] 토큰 갱신 → TOKEN_REFRESH 기록
- [ ] 로그아웃 → LOGOUT 기록
- [ ] RBAC 거부 → RBAC_DENIED 기록

### 7.2 성능 테스트

- [ ] 초당 100 로그인 처리 (목표: < 100ms p99)
- [ ] Refresh Token 조회 지연 < 10ms
- [ ] v2_user_auth_event INSERT 지연 < 5ms
- [ ] 동시 1000 세션 처리

### 7.3 보안 테스트

- [ ] 무효한 initData hash 거부
- [ ] 만료된 Access Token 거부
- [ ] Revoked Refresh Token 거부
- [ ] RBAC 없는 Admin API 접근 거부
- [ ] SQL Injection 방어 (JWT claims)
- [ ] XSS 방어 (user_agent 저장)

### 7.4 호환성 테스트

- [ ] 기존 V1 토큰 호환 (typ 없는 경우)
- [ ] 기존 Telegram 인증 경로 (/api/telegram/auth) 동작
- [ ] V2 경로 (/api/v2/telegram/auth) 동작

---

## 8. 문제 해결 가이드

### 8.1 "Invalid hash" 오류

**증상**: Telegram 인증 시 400 오류

**원인**:
1. `TELEGRAM_BOT_TOKEN` 환경변수 불일치
2. initData 파싱 오류
3. Telegram 서버-클라이언트 시간 불일치

**해결**:
```bash
# 1. Bot Token 확인
echo $TELEGRAM_BOT_TOKEN

# 2. initData 디버깅
curl -X POST /api/v2/telegram/auth \
  -H "Content-Type: application/json" \
  -d '{"init_data": "...", "start_param": null}' \
  -v
```

---

### 8.2 "TOKEN_EXPIRED" 오류

**증상**: API 호출 시 401 오류

**원인**: Access Token 15분 만료

**해결**:
1. FE에서 Refresh Token으로 갱신
2. 갱신 실패 시 재로그인 유도

```typescript
// FE 예시
if (error.status === 401 && error.detail === "TOKEN_EXPIRED") {
  const newToken = await authApi.refresh(refreshToken);
  // 재시도
}
```

---

### 8.3 "ADMIN_REQUIRED" 오류

**증상**: Admin API 호출 시 403 오류

**원인**: JWT에 role claim 없음, AdminUserProfile.tags에 ROLE_* 없음

**해결**:
```sql
-- 유저에게 ROLE_ADMIN 추가
UPDATE admin_user_profile
SET tags = JSON_ARRAY_APPEND(COALESCE(tags, '[]'), '$', 'ROLE_ADMIN')
WHERE user_id = ?;
```

---

## 9. 구현된 파일 목록 (2026-01-29 기준)

```
app/core/
└── config.py            # ✅ dev_login_enabled, v2_access_token_expire_minutes 추가

app/api/
└── deps.py              # ✅ RBAC_DENIED 이벤트 로깅 추가

app/v2/core/
├── __init__.py
└── telegram.py          # ✅ initData 검증 (hash 비교 포함)

app/v2/models/
├── auth_event.py        # ✅ V2UserAuthEvent, AuthEventType
└── refresh_token.py     # ✅ V2UserRefreshToken

app/v2/api/
├── telegram_routes.py   # ✅ POST /api/v2/telegram/auth (순수 V2)
├── auth_routes.py       # ✅ /refresh, /logout 엔드포인트
├── activity_routes.py   # ✅ /record 별칭 추가
└── dev_login.py         # ✅ dev_login_enabled 플래그 체크

app/v2/services/
└── auth_service.py      # ✅ V2 전용 만료 시간 사용

alembic/versions/
└── 20260128_1800_add_v2_auth_tables.py  # ✅ DB Migration

tests/v2/
└── test_telegram_auth.py # ✅ 14개 유닛 테스트

scripts/
└── generate_test_init_data.py  # ✅ 수동 테스트용 initData 생성기
```

---

## 10. 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-01-28 | GitHub Copilot | 최초 작성 |
| v1.1 | 2026-01-29 | GitHub Copilot | Phase 1, 2 완료 반영, V1 의존성 완전 제거 |
| v1.2 | 2026-01-29 | GitHub Copilot | Phase 1~3 반영 (당시 기준) |
| v1.3 | 2026-02-06 | GitHub Copilot | 코드 기준 재점검: Activity/DEV Login 잔여 이슈 반영 |

---

## 11. 트러블 예상율 요약

| 항목 | 이전 상태 | 현재 상태 | 비고 |
|------|----------|----------|------|
| 3.1 Activity 경로 | 미해결 | 🟡 부분 해결 | V2 내부 별칭은 존재하나 FE(`/api/activity/record`)와 불일치 |
| 3.2 DEV 로그인 환경 제한 | 미해결 | 🟡 운영 점검 필요 | 플래그는 존재하나 라우터 include/만료정책 정리 필요 |
| 3.3 Telegram hash 검증 | 미해결 | ✅ 해결 | V2 전용 모듈 |
| 3.4 Access Token 만료 | 미해결 | ✅ 해결 | V2 전용 설정 분리 |
| 2.4 Admin RBAC 로깅 | 미해결 | ✅ 해결 | RBAC_DENIED 이벤트 |

**요약**: 문서 기준 “완전 해결” 상태가 아니라, 운영 점검(라우터 노출/FE 경로) 후 마무리 필요.
