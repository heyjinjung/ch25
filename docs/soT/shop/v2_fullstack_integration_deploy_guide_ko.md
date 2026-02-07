문서 타입: 가이드
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Deploy Guide

## 1. 목적 (Purpose)
V2 풀스택 연동을 빠르게 배포 가능한 상태로 만드는 최소 절차를 정의한다.

## 2. 범위 (Scope)
- 배포 전 필수 점검
- 최소 통합 테스트 세트
- 증거 수집 및 로그 기록

## 3. 준비물 (Prerequisites)
- V2 OpenAPI 최신본 확인
- FE 라우팅 SoT 최신본 확인
- 핵심 계약 문서(게임/인증/Golden) 최신본 확인

## 4. 배포 전 최소 점검 (Checklist)
- [ ] v1 경로 참조 제거 여부 확인
- [ ] 공통 에러 포맷 반환 확인
- [ ] 인증/권한 토큰 처리 확인
- [ ] KST/09:00 리셋 기준 준수 확인

## 5. 최소 통합 테스트 세트
### 5.1 백엔드 (pytest)
```bash
pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py
pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py
pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py
pytest -q tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py
```

### 5.2 프론트 (E2E)
```bash
npx playwright test tests/e2e/smoke --reporter=list
npx cypress run --spec "cypress/e2e/admin_nav_smoke.cy.ts"
```

## 6. 증거 수집 규칙
- API 요청/응답 스니펫
- DB SELECT 결과
- Redis keys (필요 시)
- Backend logs (tail 200)
- 프론트 스크린샷/네트워크 HAR

모든 증거는 테스트 로그 문서에 기록한다.

## 7. 배포 후 빠른 검증
- 주요 페이지 접근: /landing, /vault, /shop, /games, /missions, /admin
- 콘솔 오류 없음 확인
- 주요 API 5건 이상 응답 확인

## 8. 롤백 기준
- 사용자 자산 불일치
- 중복 차감/중복 지급
- 인증 토큰 오류로 전체 진입 실패

## 9. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
