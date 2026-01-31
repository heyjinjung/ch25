문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: AUTH (인증/보안)
상태: ACTIVE

# W05 AUTH 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | V2 Auth Production 검증 완료 | ✅ RESOLVED |
| 01-31 | v2_user_auth_event FK 정책 결정 | ✅ RESOLVED |

---

## 01-31 - V2 Auth Production 검증 완료

### 증상
- V2 Telegram 인증 시스템 프로덕션 배포 후 정상 작동 확인 필요

### 검증 항목
1. **보안**: `initData` Hash 검증 (Timing Attack 방지) - `hmac.compare_digest()` 사용 확인
2. **설정**: Telegram Bot Token 프로덕션 환경 적용 확인
3. **테스트**: `pytest tests/v2/test_telegram_auth.py` - 14/14 PASSED
4. **로깅**: `v2_user_auth_event` 테이블 기록 정상 (LOGIN_SUCCESS: 15, RBAC_DENIED: 68)
5. **정책**: JWT 15분, Refresh Token 30일, Sliding Window 7일

### 결론
✅ V2 Auth Native 전환 완료 및 안정화 확인

### 관련 파일
- `app/v2/core/telegram.py`
- `app/v2/services/auth_service.py`
- `tests/v2/test_telegram_auth.py`

---

## 01-31 - v2_user_auth_event FK 정책 결정

### 증상
- `v2_user_auth_event` 테이블에 `user_id` FK 제약조건 미설정
- 데이터 무결성 우려 제기

### 원인 분석
- 의도적 설계 결정:
  - 인증 로그는 초당 수백건 발생 가능 (성능 우선)
  - `user_id=0`인 실패 로그 존재 (FK 제약 불가)
  - 90일 자동 삭제 정책으로 데이터 관리

### 해결
- **FK 미설정 유지** 결정
- 대신 주기적 데이터 정합성 모니터링 권장

### 관련 파일
- `alembic/versions/20260128_1800_add_v2_auth_tables.py`
- `docs/v2_specs/90_troubleshooting/20260131_mission_login_v2_fk_patch.md`

---

## 변경 이력
- 2026-01-31: W05 AUTH 문서 생성, 기존 분산 문서 통합
