문서 타입: 최종검증
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# ✅⚠️ V2 통합 테스트 — 최종검증 (2026-01-24)

**상태 레전드:** ✅ PASS / ❌ FAIL / ⏳ TODO

## 1. 요약 (Summary)
| 문서 | 상태 | 링크 |
|---|---:|---|
| **Full-Stack Integration Test Logs (메인)** | **⚠️ Mixed (Game ❌ / Public ⏳ / Auth ✅ / FE ✅)** | [v2_fullstack_integration_test_logs_20260124.md](v2_fullstack_integration_test_logs_20260124.md) |
| **Admin Integration Test Logs** | **✅ PASS (All checks passed)** | [v2_fullstack_integration_test_logs_admin_20260124.md](v2_fullstack_integration_test_logs_admin_20260124.md) |

> 검증 요약: Admin 영역은 All PASS ✅로 안정적입니다. Game 영역에서 `POST /api/v2/dice/play` 호출 시 V2 유저 조회 실패(500)가 발생하여 FAIL ❌ 상태입니다. Public 시나리오는 아직 진행 중(⏳)입니다.

## 2. 증거(Artifacts) 확인
- Admin: `artifacts/20260124/api/admin_ops_status_response_v2.json`, `artifacts/20260124/api/admin_dashboard_metrics_response_v2.json` ✅
- Frontend (Dice smoke): `artifacts/20260124/frontend/cypress_auth_dice_output.txt` 및 스크린샷 ✅
- Game(FAIL): `artifacts/20260124/api/dice_play_response.json` (500 error) ❌

## 3. 재현 및 원인 가설
1. 증상: `POST /api/v2/dice/play` → 500 `v2 user not found`
   - 가설: V2 유저 레코드 동기화/매핑(legacy_id ↔ v2_id) 지연 또는 `V2UserService.ensure_legacy_user_id` 로직 결함
   - 확인 방법: 관련 DB 테이블(`users`, `v2_users`, `v2_dice_log`)의 샘플 row 확인 및 서비스 로그 검사

## 4. 권장 조치 (Action Items)
- [ ] BE: `V2UserService` 매핑 로직 로그 추가 + 실패시 명확한 4xx 반환 (우선순위: 높음) 🔧
- [ ] QA: Public 시나리오(Shop/Mission/Vault) 자동화 스모크 추가(우선순위: 중간) 🧪
- [ ] FE: 실패 시 사용자용 우호적 메시지 처리(500 → 사용자에겐 재시도 안내) 💬

## 5. 소유자/우선순위
- 우선순위: P0 (Game FAIL로 인해 핵심 UX 영향) ❗
- 권장 소유자: BE (User service) / QA (재현 케이스 작성)

---
**메모:** 이 파일은 `docs/v2_specs/00_sot_meta/`에 생성되었습니다. 원하시면 이 내용을 기반으로 이슈/PR을 생성해 드리겠습니다.
