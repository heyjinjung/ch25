문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 02-09)
도메인: LEVEL
상태: 진행 중 ⏳

# W06 LEVEL 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [V2 SoT 통합 업데이트 (레벨/XP/입금)](../00_sot_meta/00_A_sot_code_ops_chk/learned_/level/20260204_v2_sot_consolidation.md)
- [레벨 정책 (07.level.md)](../00_sot_meta/00_A_sot_code_ops_chk/learned_/level/07.level.md)

---

## 🔍 주간 이슈 내역

### 02-04 - LEVEL/FRONTEND: 레벨 화면 미노출 (level-xp 404) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 레벨 화면(Level Tower) |
| HTTP Status | 404 (Not Found) |
| 영향 범위 | 운영 유저 전체 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 운영 로그에 `GET /api/level-xp/status` 404 반복 발생.
- V2 마이그레이션 정책으로 `/api/v2` 경로만 운영 중인데, 프론트가 레거시 경로를 호출함.

**해결 방법**
- 프론트 호출 경로를 `/api/v2/level-xp/status`로 전환.
- 레거시 별칭(`/api/level-xp/status`) 라우팅 제거.
- 관련 파일: [src/v2/api/missionApi.ts](../../../src/v2/api/missionApi.ts), [app/v2/api/level_xp_routes.py](../../../app/v2/api/level_xp_routes.py), [app/v2/api/routes.py](../../../app/v2/api/routes.py), [app/main.py](../../../app/main.py)

**검증 방법**
- 운영에서 `GET /api/v2/level-xp/status` 200 응답 확인.
- 텔레그램 인앱 레벨 화면 정상 노출 확인.

---

## 📝 관리 가이드
- 레벨/XP 관련 API는 V2 경로(`/api/v2/level-xp/*`)를 기본으로 유지한다.
- 레거시 경로 별칭은 재도입 전 SoT 승격 논의 필요.
