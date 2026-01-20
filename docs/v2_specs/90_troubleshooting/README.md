# V2 트러블슈팅 가이드 모음

V2 시스템 운영 중 발생할 수 있는 주요 문제와 해결 방법을 정리한 문서 모음입니다.

---

## 📋 빠른 링크

### 🚨 긴급 대응 (P0)
- [게임 토큰 관련 이슈](./v2_troubleshooting_game_token_issues_ko.md) - 티켓 차감 안 됨, 룰렛 입장 불가 등
- [백엔드 런타임 오류](./v2_troubleshooting_20260120_backend_runtime_ko.md) - 서버 실행 실패, DB 연결 오류 등

### ⚠️ 일반 오류 (P1)
- [프론트엔드 시작 오류](./v2_troubleshooting_20260120_frontend_startup_ko.md) - npm start 실패, 빌드 에러
- [Undefined 참조 오류](./v2_troubleshooting_20260120_undefined_error_ko.md) - Cannot read property of undefined
- [권한/제한 오류](./v2_troubleshooting_20260120_permission_restriction_ko.md) - 403 Forbidden, 접근 거부

### 📚 운영 가이드
- [CSV Import Pipeline](./v2_csv_import_pipeline_guide_ko.md) - 외부 카지노 로그 통합
- [Golden 실시간 모니터링](./v2_golden_realtime_monitoring_guide_ko.md) - WebSocket 스트리밍, 인터벤션 로그

### 🔧 개발 환경
- [Alembic Legacy Migration](./v2_troubleshooting_20260120_alembic_legacy_ko.md) - DB 마이그레이션 오류

---

## 🎯 문제별 빠른 검색

### 게임 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| 골드키/다이아키 티켓이 차감되지 않음 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#1-골드키다이아키-티켓이-차감되지-않는-문제) | P0 |
| 룰렛 Config 조회 실패 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#3-룰렛-config-조회-실패) | P0 |
| Premium 룰렛 접근 제어 오류 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#4-premium-룰렛-접근-제어-오류) | P1 |

### 백엔드 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| FastAPI 서버 시작 실패 | [백엔드 런타임](./v2_troubleshooting_20260120_backend_runtime_ko.md) | P0 |
| DB 연결 오류 | [백엔드 런타임](./v2_troubleshooting_20260120_backend_runtime_ko.md) | P0 |
| Redis 연결 실패 | [백엔드 런타임](./v2_troubleshooting_20260120_backend_runtime_ko.md) | P1 |
| Alembic Migration 충돌 | [Alembic Legacy](./v2_troubleshooting_20260120_alembic_legacy_ko.md) | P1 |

### 프론트엔드 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| npm start/dev 실행 오류 | [프론트엔드 시작](./v2_troubleshooting_20260120_frontend_startup_ko.md) | P0 |
| Cannot read property of undefined | [Undefined 오류](./v2_troubleshooting_20260120_undefined_error_ko.md) | P1 |
| 빌드 실패 (Vite/Webpack) | [프론트엔드 시작](./v2_troubleshooting_20260120_frontend_startup_ko.md) | P1 |

### 권한/보안 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| 403 Forbidden 오류 | [권한/제한](./v2_troubleshooting_20260120_permission_restriction_ko.md) | P1 |
| VIP/WHALE 접근 제어 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#4-premium-룰렛-접근-제어-오류) | P1 |

---

## 🔍 에러 메시지로 찾기

### 자주 보이는 에러 메시지

```
ValueError: 'GOLD_KEY' is not a valid GameTokenType
→ 해결: 게임 토큰 이슈 문서 참고
```

```
InvalidConfigError: ROULETTE_CONFIG_MISSING_GOLD_KEY_TICKET
→ 해결: 게임 토큰 이슈 - 룰렛 Config 조회 실패
```

```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
→ 해결: 백엔드 런타임 - DB 연결 오류
```

```
Cannot read property 'data' of undefined
→ 해결: Undefined 오류 문서
```

```
ForbiddenError: PREMIUM_ROULETTE_FORBIDDEN
→ 해결: 게임 토큰 이슈 - Premium 룰렛 접근 제어
```

---

## 📞 긴급 대응 프로세스

### P0 (Critical) - 즉시 대응 필요

1. **증상 확인** (1분)
   - 사용자 영향 범위 파악
   - 로그 확인

2. **임시 조치** (5분)
   - 롤백 또는 긴급 패치
   - 장애 공지

3. **근본 원인 분석** (30분)
   - 해당 트러블슈팅 문서 참고
   - 로그 상세 분석

4. **영구 수정** (2시간)
   - 코드 수정 및 테스트
   - 배포 및 모니터링

### P1 (High) - 1시간 내 대응

1. **문제 재현** (10분)
2. **해결 방법 확인** (20분)
3. **수정 및 검증** (30분)

### P2 (Medium) - 당일 대응

1. **이슈 트래킹 시스템 등록**
2. **해당 문서 참고하여 수정**
3. **다음 배포에 포함**

---

## 📝 새로운 트러블슈팅 문서 작성 가이드

### 템플릿

```markdown
# [문제 유형] 트러블슈팅 가이드

**작성일:** YYYY-MM-DD
**우선순위:** P0/P1/P2

## 증상
- 구체적인 증상 나열
- 에러 메시지

## 근본 원인
- 기술적 원인 설명
- 코드/시스템 레벨 분석

## 해결 방법
### Immediate Fix
- 즉시 적용 가능한 해결책

### Long-term Fix
- 근본적 해결을 위한 장기 대응

## 검증 방법
- 수정 후 테스트 절차

## 예방 가이드라인
- 재발 방지를 위한 지침
```

### 문서 작성 시 주의사항

- [ ] 제목은 명확하고 검색 가능하게
- [ ] 우선순위 명시 (P0/P1/P2)
- [ ] 코드 예제는 실행 가능한 형태로
- [ ] 스크린샷 또는 로그 예제 포함
- [ ] 관련 문서 링크 제공
- [ ] 검증 방법 필수 포함

---

## 🤝 기여하기

새로운 트러블슈팅 사례를 발견하셨나요?

1. 위 템플릿을 사용하여 문서 작성
2. `docs/v2_specs/90_troubleshooting/` 폴더에 저장
3. 이 README.md에 링크 추가
4. Pull Request 제출

---

## 📚 추가 리소스

- [V2 SoT 문서 모음](../README.md)
- [API 계약서](../03_api/)
- [게임 설계 문서](../02_game/)
- [코어 이코노미](../01_core/)

---

**최종 업데이트:** 2026-01-21
**관리자:** DevOps Team
