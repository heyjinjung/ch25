문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: FRONTEND
상태: 진행 중 ⏳

# W06 FRONTEND 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 9 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) FRONTEND 리포트](./archive/weekly/W05_FRONTEND_troubleshooting.md)
- [V2 Admin Frontend SoT Verification Plan](../00_sot_meta/v2_admin_frontend_sot_verification_plan_ko.md)
- [V2 User Frontend SoT Verification Plan](../00_sot_meta/v2_user_frontend_sot_verification_plan_ko.md)

---

## 🔍 주간 이슈 내역

### 02-04 - FRONTEND/BUILD: PasteImportPage.tsx TS6133 (unused React import)로 빌드 실패 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 프론트엔드 빌드(TypeScript) |
| HTTP Status | N/A (빌드 에러) |
| 영향 범위 | 프론트 빌드 전체 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `PasteImportPage.tsx`에서 `React`를 import 했지만 실제로 사용하지 않아 `TS6133`가 발생.
- Vite/React 환경에서는 JSX 사용을 위해 `React` 명시 import가 필수는 아니며, 사용하지 않는 import는 빌드/타입체크에서 실패 원인이 됨.

**해결 방법**
- 사용하지 않는 `React` import 제거.

**수정 파일**
- [src/v2/admin/pages/ops/PasteImportPage.tsx](../../../src/v2/admin/pages/ops/PasteImportPage.tsx)

**검증 방법**
- `npm run build` 통과 확인

**🏷️ 태그**
`P1` `FRONTEND` `BUILD` `TSC` `TS6133` `✅해결완료`

---

### 02-04 - FRONTEND/ADMIN: 붙여넣기 Import 시간정보 손실/선택 불가 개선 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 붙여넣기 Import (DAILY_DEPOSIT) |
| HTTP Status | 200 (Logic/UX 문제) |
| 영향 범위 | 어드민 Import 운영 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 일부 입력 포맷에서 시간 정보가 소실되어 `deposit_at=00:00:00`으로 저장됨.
- 미리보기에서 상태만 확인 가능하고, 운영자가 “원하는 행만” 선택해 Import할 수 없었음.

**해결 방법**
- 시간 추출 로직 보강: 시간(`:`) 포함 필드 우선 사용
- 선택적 Import 지원: 체크박스 UI + `selected_indices` 파라미터 추가

**수정 파일**
- [app/v2/services/paste_import_service.py](../../../app/v2/services/paste_import_service.py)
- [app/v2/api/admin/csv_import_routes.py](../../../app/v2/api/admin/csv_import_routes.py)
- [src/v2/api/adminApi.ts](../../../src/v2/api/adminApi.ts)
- [src/v2/admin/pages/ops/PasteImportPage.tsx](../../../src/v2/admin/pages/ops/PasteImportPage.tsx)

**검증 방법**
1) 미리보기에서 각 행 상태가 노출되는지 확인
2) 체크박스로 일부 행만 선택 후 Import 실행되는지 확인
3) 시간 정보가 00:00:00으로 강제되지 않는지 확인

**🏷️ 태그**
`P1` `FRONTEND` `ADMIN` `PASTE_IMPORT` `DAILY_DEPOSIT` `✅해결완료`

---

### 02-03 - FRONTEND/ROUTING: /login 라우팅 정상화 (prod/test/dev 분리) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 로그인 라우팅 |
| HTTP Status | N/A (라우팅 정리) |
| 영향 범위 | 로그인 진입 경로 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 오픈 준비 과정에서 프로덕션/테스트/개발 로그인 페이지 진입 경로가 혼재되어 운영 혼선 가능성이 있었음.

**해결 방법**
- 라우팅을 목적별로 분리:
  - `/login` → `TelegramLoginPage` (프로덕션)
  - `/login/test` → `TelegramTestLoginPage` (테스트)
  - `/login/dev` → `DevLoginPage` (개발용 레거시)

**수정 파일**
- [src/v2/router/V2UserRoutes.tsx](../../../src/v2/router/V2UserRoutes.tsx)

**🏷️ 태그**
`P2` `FRONTEND` `ROUTING` `LOGIN` `✅해결완료`

### [02-05] - FRONTEND/BACKEND: /api/auth/token, /api/events/status, /api/ui-config 404

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 로그인, 골든아워 상태, 모달 표시 설정 |
| HTTP Status | 404 (Not Found) |
| 영향 범위 | 유저/어드민 공통 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 프론트 호출 경로가 V2 전용 백엔드와 불일치.
- `/api/events/status` 라우터가 main에 미등록.
- `/api/ui-config/*` 공개 라우트 부재.

**해결 방법**
- 프론트 로그인 경로를 `/api/v2/auth/token`으로 변경.
- main에 `/api/events/*`, `/api/ui-config/*` 공개 라우터 등록.

**수정 파일**
- [src/api/authApi.ts](../../../src/api/authApi.ts)
- [src/api/httpClient.ts](../../../src/api/httpClient.ts)
- [app/main.py](../../../app/main.py)
- [app/v2/api/ui_config_public_routes.py](../../../app/v2/api/ui_config_public_routes.py)

**검증 방법**
1) `/api/v2/auth/token` 200 응답 확인
2) `/api/events/status` 200/401 응답 확인(라우터 등록 확인)
3) `/api/ui-config/modal_visibility` 200 응답 확인

**🏷️ 태그**
`P1` `FRONTEND` `BACKEND` `ROUTING` `404` `✅해결완료`

### [02-05] - FRONTEND/ADMIN: 환전 붙여넣기 Import 실행 버튼 비활성

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 환전 붙여넣기 Import (PasteImportPage) |
| HTTP Status | 200 (Logic Error - 실행 버튼 비활성) |
| 영향 범위 | 어드민 환전 Import |
| 재현 빈도 | 항상 (환전 상태가 "환전완료"인 데이터) |

**근본 원인 (증거 기반)**
- 환전 상태가 "환전완료"인 행이 `정상`으로 인정되지 않아 미리보기에서 `SKIPPED_OLD`로 분류됨.
- 환전 미리보기 테이블에서 `NOT_FOUND` 행은 체크박스가 표시되지 않아 선택 불가.

**해결 방법**
- 환전 상태 허용값을 `정상/환전완료/완료`로 확장.
- 환전 미리보기에서 `NOT_FOUND`도 선택 가능하도록 체크박스 허용.

**수정 파일**
- [app/v2/services/paste_import_service.py](../../../app/v2/services/paste_import_service.py)
- [app/v2/api/admin/csv_import_routes.py](../../../app/v2/api/admin/csv_import_routes.py)
- [src/v2/admin/pages/ops/PasteImportPage.tsx](../../../src/v2/admin/pages/ops/PasteImportPage.tsx)

**검증 방법**
1) 환전 상태가 "환전완료"인 데이터로 미리보기 실행
2) 미리보기에서 선택 항목이 자동 선택되고 Import 버튼이 활성화되는지 확인

**🏷️ 태그**
`P1` `FRONTEND` `ADMIN` `PASTE_IMPORT` `WITHDRAWAL` `✅해결완료`

### [02-04] - FRONTEND/ADMIN: 레벨 컨피그 페이지 Safe Navigation 미적용

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 레벨 관리 페이지 (LevelConfigPage) |
| HTTP Status | 200 (Logic Error - 런타임 에러 가능성) |
| 영향 범위 | 어드민 레벨 설정 화면 |
| 재현 빈도 | 초기 로딩 시 또는 빈 데이터 응답 시 |

**근본 원인 (증거 기반)**
```typescript
// src/v2/admin/pages/game/LevelConfigPage.tsx:107-109
useEffect(() => {
  if (levels.length > 0) {  // ⚠️ levels가 undefined면 에러
    const maxLvl = Math.max(...levels.map((l) => l.level));
    const maxXP = Math.max(...levels.map((l) => l.requiredXp));  // ⚠️ requiredXp 없으면 NaN
```

**문제점**:
1. `levels` 배열이 `undefined`일 경우 `.length` 접근 시 **TypeError** 발생
2. `requiredXp` 필드가 없거나 `null`일 경우 `Math.max(...)`에서 **NaN** 발생
3. 백엔드 API `/api/v2/admin/users/level` 호출 시 **401 Unauthorized** 발생 (인증 토큰 만료 시)

**해결 방법**
Safe Navigation 패턴 적용:
```typescript
useEffect(() => {
  if (levels?.length > 0) {  // ✅ Optional chaining
    const maxLvl = Math.max(...levels.map((l) => l.level ?? 1));  // ✅ Nullish coalescing
    const maxXP = Math.max(...levels.map((l) => l.requiredXp ?? 0));  // ✅ Default 0
    setGlobalConfig({
      maxLevel: maxLvl,
      maxXp: maxXP,
    });
  }
}, [levels]);
```

**수정 파일**
- `src/v2/admin/pages/game/LevelConfigPage.tsx` (useEffect 로직)

**검증 방법**
```bash
# 타입 체크 (빌드 시 에러 확인)
npx tsc --noEmit

# 프론트엔드 빌드 (실제 동작 확인)
npm run build  # ✅ 성공 (2026-02-04)
```

**검증 결과 (2026-02-04)**
- Safe Navigation 적용 완료 ✅
- `levels?.length` Optional chaining 적용 ✅
- `l.level ?? 1`, `l.requiredXp ?? 0` Nullish coalescing 적용 ✅
- 빌드 성공 확인 ✅
- 런타임 에러 방지 완료 ✅

**추가 발견 사항**
- 백엔드 로그에서 `GET /api/v2/admin/users/level?cc_id=admin` **401 Unauthorized** 발견
- 인증 토큰 만료 시 페이지 로딩 실패 가능
- 해결: 프론트엔드 `v2Client` 인터셉터가 401 시 자동 로그아웃 처리 중 (정상)

**🏷️ 태그**
`P2` `FRONTEND` `ADMIN` `SAFE_NAVIGATION` `TYPE_SAFETY` `✅해결완료`

---

### 02-04 - FRONTEND/BACKEND: 레벨 화면 미노출 (level-xp 404) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 레벨 화면(Level Tower) |
| HTTP Status | 404 (Not Found) |
| 영향 범위 | 운영 유저 전체 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 운영 로그에 `GET /api/level-xp/status` 404 반복 발생.
- 프론트가 레거시 경로를 호출하고 있었고, V2 마이그레이션 정책상 `/api/v2`만 운영 중.

**해결 방법**
- 프론트 호출 경로를 `/api/v2/level-xp/status`로 전환.
- 레거시 별칭(`/api/level-xp/status`) 라우팅 제거.
- 관련 파일: [src/v2/api/missionApi.ts](../../../src/v2/api/missionApi.ts), [app/v2/api/level_xp_routes.py](../../../app/v2/api/level_xp_routes.py), [app/v2/api/routes.py](../../../app/v2/api/routes.py), [app/main.py](../../../app/main.py)

**검증 방법**
- 운영에서 `GET /api/v2/level-xp/status` 200 응답 확인.
- 텔레그램 인앱 레벨 화면 정상 노출 확인.

### 02-04 - FRONTEND/UX: 잠재 유저 매칭 페이지 통계 카드 필터링 기능 추가 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | Admin 잠재 유저 매칭 통계 카드 (전체/연결됨/대기중/무시됨) |
| HTTP Status | N/A (UI 개선) |
| 영향 범위 | 어드민 운영자 |
| 재현 빈도 | 항상 |

**요구사항**
- 상단 통계 카드 클릭 시 해당 상태에 맞는 목록으로 필터링되어 상세 내역이 표시되어야 함.
- 현재는 단순 통계 수치만 보여주고 있음.

**해결 방법**
- `viewStatus` 상태 도입 (`ALL` \| `PENDING` \| `IGNORED` \| `LINKED`).
- 통계 카드 클릭 핸들러 구현:
  - **전체**: `prospects` 탭 + `includeIgnored=true` + `viewStatus='ALL'`
  - **연결됨**: `linked` 탭으로 전환 + `viewStatus='LINKED'`
  - **대기중**: `prospects` 탭 + `includeIgnored=false` + `viewStatus='PENDING'`
  - **무시됨**: `prospects` 탭 + `includeIgnored=true` + `viewStatus='IGNORED'` (클라이언트 필터링)
- 관련 파일: [src/v2/admin/pages/prospect/ProspectLinkingPage.tsx](../../../src/v2/admin/pages/prospect/ProspectLinkingPage.tsx)

**검증 방법**
- 각 통계 카드 클릭 시 하단 리스트가 올바르게 필터링되는지 확인.
- "무시됨" 클릭 시 무시된 항목만 리스트에 뜨는지 확인.

---

### 02-04 - FRONTEND/AUTH: DEV 로그인 엔드포인트 404 (v2Client response error) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2 유저 로그인(개발용 DEV 로그인 버튼) |
| HTTP Status | 404 (Not Found) |
| 영향 범위 | DEV 로그인 버튼/테스트 계정 생성 시도 사용자 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 프론트는 DEV 로그인 요청을 `/api/v2/dev/login`으로 전송함.
- V2 라우터 등록 목록에 `dev_login` 라우터가 포함되지 않아 404가 반환됨.
- 관련 파일: [src/v2/pages/auth/V2UserLoginPage.tsx](../../../src/v2/pages/auth/V2UserLoginPage.tsx#L57), [app/v2/api/routes.py](../../../app/v2/api/routes.py#L84-L93), [app/v2/api/dev_login.py](../../../app/v2/api/dev_login.py#L1)

**해결 방법**
- 운영 환경에서는 DEV 로그인 기능을 사용하지 않음(정상 동작).
- DEV 기능이 필요하면 dev 전용으로 라우터를 포함하거나, 프론트에서 DEV 버튼 노출을 환경변수로 제한.

**검증 방법**
- DEV 버튼 미노출/비활성화 시 콘솔 404 로그가 발생하지 않는지 확인.
- DEV 라우터 포함 시 `/api/v2/dev/login` 응답이 200/403(DEV_LOGIN_DISABLED)로 반환되는지 확인.

### 02-04 - FRONTEND/BUILD: CSVImportPage 타입 불일치로 빌드 실패 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | Admin CSV Import 페이지 빌드 |
| HTTP Status | N/A (빌드 에러) |
| 영향 범위 | 프론트 빌드 전체 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `CSVImportPage.tsx`에서 `processed_count`, `total_amount`, `unique_users`, `not_found_count`, `unmatched_details` 사용
- `CSVImportResult` 타입 정의에 해당 필드가 누락되어 TS2339/TS2551 발생

**해결 방법**
- `CSVImportResult`에 HQ_DAILY 응답 필드 추가
- 관련 파일: [src/v2/api/adminApi.ts](../../../src/v2/api/adminApi.ts)

**검증 방법**
- `npm run build` 통과 확인

### 02-03 - FRONTEND/UX: 신규 가입 CC 닉네임 입력 필드 대비 부족 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2TelegramLoginPage 닉네임 입력 필드 |
| HTTP Status | N/A (UI 문제) |
| 영향 범위 | 신규 가입 전체 유저 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 입력 필드 배경(`bg-obsidian-card`)과 페이지 배경이 거의 동일하여 시각적 구분 불가
- border도 `border-obsidian-border`로 너무 희미함

**해결 방법**
- 입력 필드 스타일 변경:
  - `bg-obsidian-card` → `bg-white/10`
  - `border border-obsidian-border` → `border-2 border-white/30`
  - focus 시 `border-amber-400` + `ring-2 ring-amber-400/50`
- 관련 파일: [src/v2/pages/auth/V2TelegramLoginPage.tsx](../../../src/v2/pages/auth/V2TelegramLoginPage.tsx#L311-L320)

**검증 방법**
- 텔레그램 인앱에서 입력 필드가 명확하게 보이는지 확인
- 입력 시 amber 포커스 링이 표시되는지 확인

---

### 02-03 - FRONTEND/TS: Telegram 타입 정의 인식 오류 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2TelegramLoginPage 빌드 |
| HTTP Status | N/A (타입 에러) |
| 영향 범위 | 빌드 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `window.Telegram` 타입이 `src/types/telegram.d.ts`에 정의되어 있으나 파일에서 인식 못함
- 에러: `'Window & typeof globalThis' 형식에 'Telegram' 속성이 없습니다.`

**해결 방법**
- 파일 상단에 `/// <reference types="../../../types/telegram" />` 추가
- 관련 파일: [src/v2/pages/auth/V2TelegramLoginPage.tsx](../../../src/v2/pages/auth/V2TelegramLoginPage.tsx#L9)

**검증 방법**
- `npm run build` 또는 `tsc --noEmit` 통과 확인

---

### 02-02 - FRONTEND/UX: 텔레그램 인앱에서 스트릭 모달 레이아웃 깨짐

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 연속 스트릭 모달 UI |
| HTTP Status | 200 (UI Layout Error) |
| 영향 범위 | 텔레그램 인앱 뷰 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 모달 컨테이너가 `100dvh` 기준으로 계산되어 TMA 뷰포트에서 상/하단 잘림 발생.
- 관련 코드: [src/v2/components/mission/V2AttendanceStreakModal.tsx](../../src/v2/components/mission/V2AttendanceStreakModal.tsx)

**해결 방법**
- `var(--tg-viewport-height,100dvh)` 기반 max-height 적용.
- 외부 컨테이너 overflow 차단, 내부 스크롤로 분리.

**검증 방법**
- 텔레그램 인앱 뷰에서 모달 전체가 표시되고 CTA 버튼이 화면 내에 고정되는지 확인.

---

## 📝 관리 가이드
- API 연동, UI 컴포넌트, 성능 최적화 확인
