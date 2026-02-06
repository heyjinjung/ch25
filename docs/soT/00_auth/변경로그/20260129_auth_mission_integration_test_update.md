문서 타입: learned_ 패치 노트
버전: v1.0
작성일: 2026-01-29
작성자: GitHub Copilot
대상: BE/QA
상태: 적용 완료 ✅

---

# 20260129 Auth+Mission 통합 테스트 정렬 및 DEV 로그인 라우터 정합성 업데이트

## 1. 목적
- Auth/미션 통합 테스트를 **SoT/구현 기준**으로 정렬한다.
- DEV 로그인 라우터 노출 조건을 **v2 라우팅 구조**와 일치시킨다.

## 2. 배경 및 문제
- `/api/v2/dev/login` 404가 라우터 누락으로 오해됨.
- 실제 원인은 **create_if_missing 기본값 False**에 따른 `USER_NOT_FOUND(404)` 정상 동작이었음.
- 테스트 환경에서 ENV가 dev로 보장되지 않아 DEV 라우터 노출이 흔들릴 수 있었음.

## 3. 핵심 정렬 결과 (SoT 기준)
- DEV 로그인은 **dev 환경(local/dev/development)** 에서만 노출.
- `POST /api/v2/dev/login` 요청 시:
  - `create_if_missing=True` → 신규 유저 생성 후 200
  - 기본값(False) → 유저 없으면 404
  - `cc_id` 공백/누락 → 400(MISSING_CC_ID)
- 미션 클레임은 `/api/v2/mission/{mission_id}/claim` + `X-Idempotency-Key` 필수

## 4. 변경 내용
### 4.1 라우팅 정합성
- v2 routes 내부에서 DEV 라우터 중복 등록 제거
- DEV 라우터 노출은 **api_router의 env 게이트**만 사용

### 4.2 테스트 정렬
- DEV 로그인 성공 시나리오에 `create_if_missing=True` 명시
- 유저 미존재 404 시나리오를 명시 테스트로 분리
- `cc_id` 공백 입력 시 400 검증
- 미션 클레임 경로/Idempotency Key 정합 유지

### 4.3 테스트 환경
- 테스트 실행 시 ENV를 `dev`로 강제하여 DEV 라우터 노출 보장

## 5. 변경 파일
- app/v2/api/routes.py
- tests/conftest.py
- tests/v2_tests/phase2_core/test_auth_mission_integration.py

## 6. 검증
- pytest tests/v2_tests/phase2_core/test_auth_mission_integration.py
- 결과: 5 passed

## 7. 결론
- **코드 로직 변경은 불필요**, 테스트 입력/환경/기대값 정렬이 핵심이었다.
- DEV 로그인 404는 정책대로 `USER_NOT_FOUND`가 반환된 정상 동작이다.

---

## 변경 이력
- v1.0 (2026-01-29, GitHub Copilot): 최초 작성
