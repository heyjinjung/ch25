문서 타입: 가이드
버전: v1.1
작성일: 2026-02-01
작성자: GitHub Copilot
대상: V2 운영/개발 담당자
상태: SoT

# V2 트러블슈팅 운영 가이드

V2 시스템 운영 중 발생하는 문제를 **도메인별 주간 문서**로 관리합니다.

## 📌 운영 정책 (v1.1, 2026-02-01)

### 🚀 Quick Navigation
- [현재 주차 (W06)](#-현재-주차-w06-02-03--02-09)
- [지난 주차 아카이브 (W05)](#-지난-주차-아카이브-w05-01-27--02-02)
- [SoT/Core 격상 문서](#-sotcore-격상-문서-영구-보존)

---

### 프론트 UX 공통 규칙 (Shop/Inventory)
- **기프티콘 실사용 안내**: `reward_type` 또는 `item_type`에 `GIFTICON`이 포함되면 아래 문구를 노출한다.
   - 문구(원문 유지): `cc지민 모든 기프트콘은 2만부터 사용가능하십니다`
   - 구현 파일: [src/v2/pages/shop/ExchangePage.tsx](../../../src/v2/pages/shop/ExchangePage.tsx), [src/v2/pages/inventory/InventoryPage.tsx](../../../src/v2/pages/inventory/InventoryPage.tsx)
- **BENEFITS_SUSPENDED(403) 전용 안내 + 딥링크**: 상점 구매 API에서 `HTTP 403` + `detail=BENEFITS_SUSPENDED` 수신 시 전용 바텀시트를 노출하고 외부 링크를 제공한다.
   - 구현 파일: [src/v2/pages/shop/ExchangePage.tsx](../../../src/v2/pages/shop/ExchangePage.tsx)
   - 링크 오픈 규칙(TMA 우선): [src/v2/utils/openExternal.ts](../../../src/v2/utils/openExternal.ts)
   - 환경변수(선택): `VITE_CC_DEPOSIT_URL` (기본: `https://ccc-010.com`), `VITE_TELEGRAM_OFFICIAL_CHANNEL_URL` (기본: `https://t.me/cc_jm_official`)

### 도메인 분류
| 코드 | 도메인명 | 범위 |
|---|---|---|
| `AUTH` | 인증/보안 | 로그인, JWT, Telegram Auth, RBAC |
| `GAME` | 게임 | Dice, Roulette, Lottery, Golden Hour |
| `MISSION` | 미션/스트릭 | 일일/주간/이벤트 미션, 연속 출석 |
| `VAULT` | 금고/경제 | Vault, 포인트, 재화, 출금 |
| `INVENTORY` | 인벤토리/상점 | 아이템, 티켓, 상점 주문 |
| `DB` | DB/마이그레이션 | Alembic, FK, 스키마, 데이터 정합성 |
| `INFRA` | 인프라/배포 | Docker, CI/CD, Sentry, 서버 |
| `FRONTEND` | 프론트엔드 | React, API 연동, UI 버그 |

### 주간 운영 사이클
1. **월~토**: 이슈 발생 시 해당 도메인 주간 문서에 추가
2. **일요일**: 주간 정리
   - 반복/핵심 이슈 → **SoT/Core 격상**
   - 단발성 이슈 → **archive/ 이동**
   - 새 주차 문서 생성

### 파일 명명 규칙
```
W{주차}_{도메인코드}_troubleshooting.md
예: W05_AUTH_troubleshooting.md
```

### SoT 우선순위 (필수)
1. **learned_ 최신 문서** (가장 우선)
2. docs/v2_specs/ 내 최신 SoT 문서
3. 레거시 문서/운영 메모

**참조 기준 문서**
- 인덱스: [docs/v2_specs/00_sot_meta/00_INDEX.md](../00_sot_meta/00_INDEX.md)
- learned 통합 컨텍스트: [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md)

**기술 기준문서 (필수 참조)**
- learned_ 도메인별 최신 문서: [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_](../00_sot_meta/00_A_sot_code_ops_chk/learned_)
- learned 통합 컨텍스트: [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md)
- 00_A_sot_code_ops_chk 전체 문서: [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk](../00_sot_meta/00_A_sot_code_ops_chk)
- 인덱스 최신 변경 이력: [docs/v2_specs/00_sot_meta/00_INDEX.md](../00_sot_meta/00_INDEX.md)

---

## 📅 현재 주차 문서 (W06: 02-03 ~ 02-09)

| 도메인 | 문서 | 이슈 수 |
|---|---|---|
| AUTH | [W06_AUTH_troubleshooting.md](./W06_AUTH_troubleshooting.md) | 0 |
| VAULT | [W06_VAULT_troubleshooting.md](./W06_VAULT_troubleshooting.md) | 0 |
| GAME | [W06_GAME_troubleshooting.md](./W06_GAME_troubleshooting.md) | 0 |
| MISSION | [W06_MISSION_troubleshooting.md](./W06_MISSION_troubleshooting.md) | 0 |
| DB | [W06_DB_troubleshooting.md](./W06_DB_troubleshooting.md) | 0 |
| INFRA | [W06_INFRA_troubleshooting.md](./W06_INFRA_troubleshooting.md) | 0 |
| FRONTEND | [W06_FRONTEND_troubleshooting.md](./W06_FRONTEND_troubleshooting.md) | 0 |

---

## 🗄️ 지난 주차 아카이브 (W05: 01-27 ~ 02-02)

| 도메인 | 문서 | 이슈 수 |
|---|---|---|
| AUTH | [W05_AUTH_troubleshooting.md](./archive/weekly/W05_AUTH_troubleshooting.md) | 2 |
| VAULT | [W05_VAULT_troubleshooting.md](./archive/weekly/W05_VAULT_troubleshooting.md) | 4 |
| GAME | [W05_GAME_troubleshooting.md](./archive/weekly/W05_GAME_troubleshooting.md) | 7 |
| MISSION | [W05_MISSION_troubleshooting.md](./archive/weekly/W05_MISSION_troubleshooting.md) | 7 |
| DB | [W05_DB_troubleshooting.md](./archive/weekly/W05_DB_troubleshooting.md) | 4 |
| INFRA | [W05_INFRA_troubleshooting.md](./archive/weekly/W05_INFRA_troubleshooting.md) | 7 |
| FRONTEND | [W05_FRONTEND_troubleshooting.md](./archive/weekly/W05_FRONTEND_troubleshooting.md) | 6 |

---

## 📚 SoT/Core 격상 문서 (영구 보존)

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
- [에러 대응 체크리스트](./20260130_error_triage_checklist.md) - 이슈 분류 및 대응 절차
- [V2 도메인 FK 전수 감사 (01-31)](./W05_DB_troubleshooting.md#01-31---db-v2-도메인-전수-fk-정합성-감사) - 데이터 무결성 점검 결과

### 🔧 개발 환경
- [Alembic Legacy Migration](./v2_troubleshooting_20260120_alembic_legacy_ko.md) - DB 마이그레이션 오류

---

## 🗄️ 아카이브

과거 주차 문서는 [archive/](./archive/) 폴더에서 확인하세요.

---

## 🎯 문제별 빠른 검색

### 게임 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| 골드키/다이아키 티켓이 차감되지 않음 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#1-골드키다이아키-티켓이-차감되지-않는-문제) | P0 |
| 룰렛 Config 조회 실패 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#3-룰렛-config-조회-실패) | P0 |
| Premium 룰렛 접근 제어 오류 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#4-premium-룰렛-접근-제어-오류) | P1 |
| 주사위 골든아워 미적용 | [W05_GAME_troubleshooting.md](./archive/weekly/W05_GAME_troubleshooting.md#01-31---game-주사위-게임-골든아워-미적용-문제) | P1 |
| 복권 퍼즐조각 미지급 (Reward 0) | [W05_GAME_troubleshooting.md](./archive/weekly/W05_GAME_troubleshooting.md#01-31---game-복권-퍼즐조각-미지급-및-보상-금액-0-설정-오류) | P1 |
| 신규 채널 가입 미션 UI 비활성 | [W05_MISSION_troubleshooting.md](./archive/weekly/W05_MISSION_troubleshooting.md#01-31---missionfrontend-신규-채널-가입-미션-ui-비활성화) | P1 |

### 백엔드 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| FastAPI 서버 시작 실패 | [백엔드 런타임](./v2_troubleshooting_20260120_backend_runtime_ko.md) | P0 |
| DB 연결 오류 | [백엔드 런타임](./v2_troubleshooting_20260120_backend_runtime_ko.md) | P0 |
| SOT Import 리팩터링 후 ImportError | [W05_INFRA_troubleshooting.md](./archive/weekly/W05_INFRA_troubleshooting.md#02-01---infrabackend-sot-import-리팩터링-후-누락된-re-export) | P0 |
| Redis 연결 실패 | [백엔드 런타임](./v2_troubleshooting_20260120_backend_runtime_ko.md) | P1 |
| Alembic Migration 충돌 | [Alembic Legacy](./v2_troubleshooting_20260120_alembic_legacy_ko.md) | P1 |
| Sentry Logs 탭 온보딩 화면 고정 | [W05_INFRA_troubleshooting.md](./archive/weekly/W05_INFRA_troubleshooting.md#01-31---infra-sentry-log-monitoring-logs-탭-활성화) | P2 |
| 게임 API ModuleNotFoundError | [W05_GAME_troubleshooting.md](./archive/weekly/W05_GAME_troubleshooting.md#01-31---game-게임-api-modulenotfounderror-v2_user-경로-오류) | P0 |
| CSV Import 한글 헤더 오류 및 오타 | [W05_INFRA_troubleshooting.md](./archive/weekly/W05_INFRA_troubleshooting.md#02-01---infrabackend-csv-import-한글-헤더-지원-및-import-오류-수정) | P1 |
| CSV Import HQ_MARGIN 결과 화면 오류 | [W05_FRONTEND_troubleshooting.md](./archive/weekly/W05_FRONTEND_troubleshooting.md#02-02---frontendbackend-csv-import-hq_margin-타입-결과-화면-오류-tolocalestring-undefined) | P1 |

### 프론트엔드 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| npm start/dev 실행 오류 | [프론트엔드 시작](./v2_troubleshooting_20260120_frontend_startup_ko.md) | P0 |
| Cannot read property of undefined | [Undefined 오류](./v2_troubleshooting_20260120_undefined_error_ko.md) | P1 |
| 빌드 실패 (Vite/Webpack) | [프론트엔드 시작](./v2_troubleshooting_20260120_frontend_startup_ko.md) | P1 |
| MissionManagerPage 파일 비대화 (2944줄) | [W05_FRONTEND_troubleshooting.md](./archive/weekly/W05_FRONTEND_troubleshooting.md#02-01---frontendrefactor-missionmanagerpage-대규모-리팩토링-2944284줄-90-감소) | P2 |
| CSV Import 결과 화면 toLocaleString 오류 | [W05_FRONTEND_troubleshooting.md](./archive/weekly/W05_FRONTEND_troubleshooting.md#02-02---frontendbackend-csv-import-hq_margin-타입-결과-화면-오류-tolocalestring-undefined) | P1 |

### 권한/보안 관련
| 문제 | 문서 | 우선순위 |
|------|------|---------|
| 403 Forbidden 오류 | [권한/제한](./v2_troubleshooting_20260120_permission_restriction_ko.md) | P1 |
| 403 BENEFITS_SUSPENDED (상점 구매 제한) | [권한/제한](./v2_troubleshooting_20260120_permission_restriction_ko.md) | P1 |
| VIP/WHALE 접근 제어 | [게임 토큰 이슈](./v2_troubleshooting_game_token_issues_ko.md#4-premium-룰렛-접근-제어-오류) | P1 |

---

## 🔍 에러 메시지로 찾기

### 자주 보이는 에러 메시지

```
NameError: name 'Session' is not defined
→ 해결: W05_FRONTEND - CSV Import HQ_MARGIN 타입 결과 화면 오류
→ 조치: hq_margin_import_service.py에 Session import 추가
```

```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
→ 해결: W05_FRONTEND - CSV Import HQ_MARGIN 타입 결과 화면 오류
→ 조치: CSVImportPage.tsx에서 nullish coalescing(??) 적용 및 타입별 분기 처리
```

```
ImportError: cannot import name 'SurveyQuestionType' from 'app.v2.models'
→ 해결: W05_INFRA - SOT Import 리팩터링 후 re-export 누락
→ 조치: app/v2/models/__init__.py에 누락된 Enum 추가
```

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

```
HTTP 403 + detail=BENEFITS_SUSPENDED
→ 정상 동작: Strict Vault Policy(최근 7일 무입금)로 상점 구매가 차단됨
→ FE 동작: 구매 제한 안내 바텀시트 노출 + "입금하러 가기" 딥링크 제공
→ 관련: src/v2/pages/shop/ExchangePage.tsx, src/v2/utils/openExternal.ts
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

### 업데이트/작성 원칙 (SoT 기반)
1. **증거 기반 작성**: 로그, Stack Trace, DB 제약조건(FK/UNIQUE/CHECK), 실제 API 응답을 근거로 기록.
2. **정책 우선순위 준수**: learned_ 최신 문서가 SoT보다 우선. 충돌 시 learned_ 기준으로 정렬.
3. **풀스택 검증**: DB/Migration → Data Integrity → API/Frontend 순서로 교차 검증.
4. **KST/운영일 준수**: 시간 기준은 **Asia/Seoul, 09:00 리셋**을 명시.
5. **민감정보 제거**: 토큰/비밀번호/내부 IP/개인정보는 마스킹.
6. **인덱스 갱신**: 신규/핵심 이슈는 [00_INDEX.md](../00_sot_meta/00_INDEX.md) 변경 이력에 반영.
7. **FE UX 포함**: 사용자에게 노출되는 안내문구/버튼/딥링크는 **문구 원문**, **트리거 조건(HTTP status + detail)**, **대상 화면**, **환경변수 키/기본값**을 함께 기록.

### 업데이트 절차
1. **증상 정의** (아래 표)
2. **근거 수집** (로그/제약조건/응답 캡처)
3. **원인 분석** (RCA, 정책/구현 충돌 여부)
4. **즉시 조치/영구 조치** 구분
5. **검증 방법** 및 재현 절차 기록
6. **연관 문서 링크** (SoT/learned_/코드 경로)
7. **운영 서버 확인** (필요 시)
   - SSH 접속 후 백엔드 로그 확인
   - 명령 예시:

```bash
ssh -i C:\Users\JAVIS\.ssh\id_ed25519_vultr root@149.28.135.147 "docker logs xmas-backend --tail=200"
```

### 템플릿

```markdown
# [문제 유형] 트러블슈팅 가이드

**작성일:** YYYY-MM-DD
**우선순위:** P0/P1/P2

## 증상 정의 (필수)
| 항목 | 내용 |
|---|---|
| 대상 기능 | 예: 룰렛 게임 실행, 인벤토리 진입 |
| HTTP Status | 500 / 400 / 200(Logic Error) |
| 영향 범위 | 특정 유저(ID=15) / 전체 |
| 재현 빈도 | 항상 / 간헐적 |

## 증상
- 구체적인 증상 나열
- 에러 메시지

## 근본 원인 (증거 기반)
- 기술적 원인 설명
- 코드/시스템 레벨 분석
- 로그/Stack Trace 캡처
- DB 제약조건(FK/UNIQUE/CHECK) 위반 여부

## 해결 방법
### Immediate Fix
- 즉시 적용 가능한 해결책

### Long-term Fix
- 근본적 해결을 위한 장기 대응

## 검증 방법
- 수정 후 테스트 절차
- DB/Migration/데이터/API/프론트 검증 결과
- KST 09:00 기준 리셋 구간 확인

## 예방 가이드라인
- 재발 방지를 위한 지침

## 관련 문서 (SoT/learned)
- 문서 링크
- 코드 경로 링크
```

### 문서 작성 시 주의사항

- [ ] 제목은 명확하고 검색 가능하게
- [ ] 우선순위 명시 (P0/P1/P2)
- [ ] 코드 예제는 실행 가능한 형태로
- [ ] 스크린샷 또는 로그 예제 포함
- [ ] 관련 문서 링크 제공
- [ ] 검증 방법 필수 포함
- [ ] KST 09:00 리셋 정책 명시
- [ ] DB 제약조건/데이터 정합성 근거 포함
- [ ] learned_ 최신 문서 기준 반영

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

**최종 업데이트:** 2026-02-01
**관리자:** DevOps Team
