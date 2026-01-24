# V2 검증 체크리스트 (한국어)

목적: V2 전용 검증을 일관되게 수행하기 위한 최소 체크리스트입니다. 각 항목은 실행 명령과 증거(로그/DB/스크린샷)를 남겨야 합니다.

## 환경 준비
- [ ] `docker compose up -d db redis backend` (정상 시작 확인)
- [ ] `alembic current` → 최신 마이그레이션 적용 여부 확인
- [ ] 환경변수: `REDIS_URL`, `DATABASE_URL` 올바름

## Phase 1: SoT / Schema
- [ ] Enum/Schema/설정값이 문서(SoT)와 일치하는가
- [ ] `app/v2` 모듈 단일로 import 가능한가

## Phase 2: 코어 경제
- [ ] Vault 적립/차감 로직 단위 테스트 통과 (`pytest -q tests/v2_tests/phase2_core`)
- [ ] 출금 회차(1/1/3/5) 정책 검증 완료

## Phase 3: 게임 엔진
- [ ] 주사위/룰렛/복권 단위 테스트 통과 및 API 응답 검증
- [ ] Golden Hour 트리거 및 배수 적용 확인

## Phase 4: Admin / Ops
- [ ] Admin RBAC 검증(일반 유저 접근 차단)
- [ ] Admin Config 변경 → 서비스 반영(로그/DB 증거)

## Phase 5: E2E 통합 시나리오
- [ ] SignUp → Deposit → Play → Vault (정상 흐름)
- [ ] Lose Loop (패배 → 차감 → 플레이 재진입)
- [ ] Admin Intervention (지급 → Inbox → 확인)
- [ ] `scripts/verify_golden_pubsub.py` 실행 (퍼블리시 → 워커 → DB 레코드 생성 확인)

## 테스트 환경 최적화(권장)
- 테스트 자동화 환경에서는 `app/main.py`의 `test_mode`를 활성화하여 백그라운드 워커 생성을 건너뛰면 테스트 속도와 안정성이 향상됩니다.

## 감사 및 문서화
- 모든 검증 시 `docs/v2_specs/00_sot_meta/v2_verification_test_logs_YYYYMMDD.md` 파일에 실행일/명령/결과(로그 스니펫/DB 쿼리 결과)를 추가합니다.

---
