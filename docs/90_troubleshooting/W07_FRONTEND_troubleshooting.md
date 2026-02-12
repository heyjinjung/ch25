문서 타입: 트러블슈팅
주차: W07 (2026-02-10 ~ 2026-02-16)
도메인: FRONTEND
상태: 진행 중 ⏳

# W07 FRONTEND 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔍 주간 이슈 내역

### 02-12 - FRONTEND/ADMIN: Latency Survival 승인 시 입금로그 드롭다운 미노출 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 → Economy → Latency Survival → 승인 다이얼로그 입금로그 선택 드롭다운 |
| HTTP Status | 200 (빈 배열) — 목록이 비어 옵션이 생성되지 않음 |
| 영향 범위 | 전체 어드민 |
| 재현 빈도 | 항상/자주 (최근 N시간 조건에 따라) |

**근본 원인 (증거 기반)**
- 프론트는 드롭다운 데이터로 `GET /api/v2/admin/economy/deposits/unmatched?hours=...` 응답을 그대로 옵션으로 렌더링함.
- 백엔드는 기존에 `UserCashLedger`를 대상으로 `reason == 'DEPOSIT'` 조건으로 조회하고 있어, 실제 운영 입금 로그 소스와 불일치하거나 조건이 과도하게 좁아 **빈 배열**이 발생할 수 있었음.
- 또한 프론트 조회 범위가 `24시간(hours=24)`로 고정이라, 운영상 “최근 며칠치”를 보고 매칭해야 하는 상황에서 목록이 비는 케이스가 있었음.

**해결 방법**
| # | 레이어 | 수정 내용 |
|---|---|---|
| 1 | BE | `/api/v2/admin/economy/deposits/unmatched` 조회 소스를 `HQDailyDepositLog` 기반으로 변경하고, 이미 evidence에 매칭된 로그는 제외 |
| 2 | FE | `useUnmatchedDeposits(24)` → `useUnmatchedDeposits(120)` (최신 5일)로 확대 + 안내 문구 동기화 |

**수정/추가 파일**
- [app/v2/api/admin/economy_routes.py](../../app/v2/api/admin/economy_routes.py)
- [src/v2/admin/pages/economy/LatencySurvivalPage.tsx](../../src/v2/admin/pages/economy/LatencySurvivalPage.tsx)

**검증 방법**
1) 승인 다이얼로그 오픈 → 네트워크에서 `GET /api/v2/admin/economy/deposits/unmatched?hours=120` 확인
2) 응답이 비어있지 않으면 드롭다운 옵션이 렌더링되는지 확인
3) `npm run build`로 타입/빌드 확인

**🏷️ 태그**
`P1` `FRONTEND` `ADMIN` `LATENCY_SURVIVAL` `DROPDOWN` `✅해결완료`
