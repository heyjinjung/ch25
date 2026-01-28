문서 타입: 트러블슈팅 가이드
버전: v1.0
작성일: 2026-01-28
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

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

### 2.4 Admin 도메인

**영향도**: 🟡 중간

#### 예상 충돌

| 항목 | 충돌 내용 | 해결 방안 |
|------|----------|----------|
| RBAC 로깅 | 권한 거부 시 이력 미기록 | RBAC_DENIED 이벤트 추가 |
| 역할 정규화 | SUPER_ADMIN → ADMIN 변환 확인 | 기존 로직 유지 |

#### 수정 포인트

| 파일 | 변경 내용 |
|------|----------|
| `app/api/deps.py` | get_current_admin_info에서 RBAC_DENIED 이벤트 기록 |

#### 테스트 필요

- [ ] RBAC 없는 토큰으로 Admin API 호출 → 403 + 이벤트 기록
- [ ] SUPER_ADMIN 토큰 → ADMIN으로 정규화 확인

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

### 3.1 Activity 경로 불일치

**충돌 지점**:
- FE: `src/api/activityApi.ts` → `/api/activity/record`
- BE: `app/v2/api/activity_routes.py` → `/api/v2/activity/ingest`

**해결 방안**:

| 옵션 | 내용 | 장단점 |
|------|------|--------|
| A (권장) | FE 경로 변경 → `/api/v2/activity/ingest` | FE 배포 필요, 깔끔한 v2 통일 |
| B | BE 별칭 추가 → `/api/activity/record` | 레거시 경로 유지, 향후 정리 필요 |

**예상 부작용**:
- 옵션 A: FE 배포 필요
- 옵션 B: 레거시 경로가 계속 남음

---

### 3.2 DEV 로그인 환경 제한 불일치

**충돌 지점**:
- `app/v2/api/dev_login.py`: `settings.env not in ["local", "development", "dev"]`
- `app/core/config.py`: 명시적 `DEV_LOGIN_ENABLED` 플래그 없음

**해결 방안**:
1. `config.py`에 `dev_login_enabled: bool` 플래그 추가
2. PROD 배포 시 `DEV_LOGIN_ENABLED=false` 환경변수 설정

**예상 부작용**:
- 플래그 누락 시 PROD에서 DEV 로그인 노출 위험

---

### 3.3 Telegram initData hash 검증 누락

**충돌 지점**:
- `app/core/telegram.py` Line 35: calculated_hash 계산 후 비교문 없음

**해결 방안**:
```python
# app/v2/core/telegram.py (신규)
if calculated_hash != hash_val:
    raise ValueError("Invalid hash")
```

**예상 부작용**:
- 기존 개발 환경에서 무효한 initData로 접근하던 케이스 차단
- TEST_MODE에서는 우회 가능

---

### 3.4 Access Token 만료 시간 변경

**충돌 지점**:
- 현재: `JWT_EXPIRE_MINUTES=1440` (24시간)
- 권장: 15분

**해결 방안**:
1. 점진적 변경: 1440 → 60 → 15분
2. Refresh Token 구현 후 변경

**예상 부작용**:
- 기존 발급된 토큰이 예상보다 빨리 만료
- FE에서 401 처리 + Refresh 로직 필요

---

## 4. 마이그레이션 순서

### Phase 1: 긴급 패치 (MVP 전)

```
1. app/v2/core/telegram.py 생성
   - hash 비교 로직 추가

2. app/v2/models/auth_event.py 생성
   - V2UserAuthEvent 모델 정의

3. Alembic Migration 실행
   - v2_user_auth_event 테이블 생성

4. app/v2/api/telegram_routes.py 생성
   - V2 Telegram 인증 엔드포인트
   - 로그인 이벤트 기록

5. app/v2/api/__init__.py 수정
   - telegram_routes 등록
```

### Phase 2: Refresh Token (MVP 후)

```
1. app/v2/models/refresh_token.py 생성
   - V2UserRefreshToken 모델 정의

2. Alembic Migration 실행
   - v2_user_refresh_token 테이블 생성

3. app/v2/services/auth_service.py 확장
   - create_refresh_token()
   - refresh_access_token()
   - revoke_refresh_token()

4. app/v2/api/auth_routes.py 수정
   - /refresh 구현
   - /logout 구현

5. FE 수정
   - 401 시 Refresh 호출 로직
```

### Phase 3: 세션/디바이스 관리 (미래)

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

## 9. 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-01-28 | GitHub Copilot | 최초 작성 |
