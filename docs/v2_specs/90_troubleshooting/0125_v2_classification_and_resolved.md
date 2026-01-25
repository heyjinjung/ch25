# 0125 v2 이슈 분류 및 종결 요약

- 작성일: 2026-01-25
- 작성자: GitHub Copilot
- 목적: `0125_v2_troubleshooting.md` 및 관련 문서에서 접수된 이슈를 유형별로 정리하고, 수정 완료(또는 작업 상태)를 기록합니다.

---

## 요약
접수된 이슈들을 다음 7개 유형으로 분류했습니다. 각 유형별로 대표 증상, 조치(요약), 검증 방법, 관련 변경 파일을 포함합니다. 모든 항목은 이미 **수정 완료** 혹은 **작업 중** 상태로 반영되었습니다.

### 1) 백엔드 API 오류 / Validation (상태: 수정 완료)
- 대표 증상: 400/422/500 응답 (예: `POST /api/v2/roulette/play` 400, `PUT /api/v2/admin/game/dice/config/1` 422, `POST /api/v2/admin/game/lottery/config/1/prize` 500)
- 조치: 요청 유효성 강화, 예외 처리 보강, 상세 4xx 표준화
- 검증: 통합 테스트 및 수동 curl 호출, backend 로그 확인
- 참고 파일: `app/v2/api/admin/game_config_routes.py`, `app/v2/services/v2_lottery_game_service.py`

### 2) 게임 로직 / 설정 불일치 (상태: 수정 완료)
- 대표 증상: 주사위 확률 단위 불일치, 룰렛/복권 설정 누락으로 400 에러
- 조치: 단위/매핑 정규화, status/play fallback 추가, INVALID config 안전 처리
- 검증: `/api/v2/{dice,roulette,lottery}/status` 정상 응답 및 플레이 정상 동작
- 참고 파일: `app/v2/services/v2_roulette_game_service.py`, `src/v2/api/adminApi.ts`

### 3) 프론트 UI / 인코딩 문제 (상태: 수정 완료/진행)
- 대표 증상: 드롭다운 텍스트 색(다크테마), 한글 깨짐, SVG 렌더 에러, 미션 UI 불완전
- 조치: CSS/Tailwind 보정, i18n/폰트 점검, SVG 안전 처리, 미션 UI 재설계
- 검증: UI 수동 검증(다크테마 포함), 콘솔 에러 없음
- 참고 파일: `src/v2/admin/components/ui/select.tsx`, `src/v2/components/vault/WithdrawalRulesChecklist.tsx`

### 4) 어드민 기능 누락/비정상 (상태: 수정 완료)
- 대표 증상: 레벨관리(유저 레벨/XP 조정) 부재, 금고 강제조정 UI 부재, 미션 CRUD 미동작
- 조치: API/UI 추가 및 저장 흐름 복구
- 검증: 어드민 저장→재조회 반영 확인, 관련 테스트
- 참고 파일: `src/v2/admin/pages/game/LevelConfigPage.tsx`, `src/v2/admin/pages/economy/VaultControlPage.tsx`

### 5) 통합/인증/라우팅 문제 (상태: 수정 완료)
- 대표 증상: v1/v2 경로 혼선, 어드민 토큰 누락(로그인 루프)
- 조치: 클라이언트 라우팅 정합화 및 토큰 전파 로직 수정
- 검증: 어드민 페이지 로드 시 모든 `/api/v2/admin/*` 호출에 Authorization 포함
- 참고 파일: `src/v2/api/client.ts`, `src/v2/api/adminApi.ts`

### 6) 상점/인벤토리(비즈니스 검증) (상태: 수정 완료)
- 대표 증상: 구매/사용 실패(`INSUFFICIENT_BALANCE`, `INVALID_VOUCHER_TYPE`)
- 조치: 서버 detail 기반 UX 안내 보강, 바우처 타입 검증
- 검증: 구매 실패 시 UI 에러 메시지 확인
- 참고 파일: `src/v2/pages/shop/ExchangePage.tsx`, `src/v2/pages/inventory/InventoryPage.tsx`

### 7) 빌드 / 테스트 / 검증 (상태: 수정 완료)
- 대표 증상: `ignoreDeprecations` 값 오류 등 빌드 실패
- 조치: `tsconfig.json` 수정 및 검증 스모크 보강
- 검증: `npm run build` 성공, pytest 통과

---

## 권장 후속(간단)
- 문서화 유지: 본 파일을 SoT에 링크하고, 각 이슈별 PR/커밋 링크를 추적하여 update 기록 유지
- 검증 자동화: 주요 P0 엔드포인트에 대한 smoke tests(헬스체크 스크립트) 추가

---

문서 저장 완료: `docs/v2_specs/90_troubleshooting/0125_v2_classification_and_resolved.md`

원하시면 이 내용을 `0125_v2_troubleshooting.md` 및 `v2_game_failures_for_ai_20260124.md`의 상단 요약(또는 결론 섹션)으로 동기화해 드리겠습니다.