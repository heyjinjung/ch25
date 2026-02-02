문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: FRONTEND
상태: 진행 중 ⏳

# W06 FRONTEND 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 0 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) FRONTEND 리포트](./archive/weekly/W05_FRONTEND_troubleshooting.md)
- [V2 Admin Frontend SoT Verification Plan](../00_sot_meta/v2_admin_frontend_sot_verification_plan_ko.md)
- [V2 User Frontend SoT Verification Plan](../00_sot_meta/v2_user_frontend_sot_verification_plan_ko.md)

---

## 🔍 주간 이슈 내역

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
