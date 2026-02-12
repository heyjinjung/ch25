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

### 02-12 - FRONTEND/EVENT: Valentine & Seol Page 한글 깨짐 (Mojibake) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 2026 발렌타인 & 설날 이벤트 페이지 (미션 목록, 배너, 비밀코드 입력) |
| 증상 | 한글 텍스트가 `ðŸ†...` 형태의 외계어(Mojibake)로 표시됨 (UTF-8을 Latin-1로 오해석) |
| 영향 범위 | 이벤트 페이지 전체 (PC/Mobile 공통) |
| 재현 빈도 | 항상 (Nginx Charset 설정 부재 시) |

**근본 원인**
- **Nginx 설정 미흡**: `nginx/frontend.conf`에 `charset utf-8;` 지시어가 없어 브라우저가 응답 헤더에서 인코딩을 확인하지 못하고, OS/브라우저 기본값(Latin-1 등)으로 해석함.
- **소스 코드 리터럴**: React 컴포넌트 내에 한글 리터럴이 포함되어 있어, 파일 인코딩 인식 실패 시 깨짐 현상이 그대로 노출됨.

**해결 방법**
| # | 레이어 | 수정 내용 |
|---|---|---|
| 1 | Infra | `nginx/frontend.conf`에 `charset utf-8;` 추가하여 응답 헤더에 명시 |
| 2 | FE | 모든 한글 리터럴을 **Unicode Escape Sequence** (`\uxxxx`)로 변환하여 `KoreanConstants.ts`로 분리. 소스 파일 인코딩과 무관하게 렌더링되도록 수정 (Nuclear Option) |

**수정/추가 파일**
- [nginx/frontend.conf](../../nginx/frontend.conf)
- [src/v2/pages/event/KoreanConstants.ts](../../src/v2/pages/event/KoreanConstants.ts) (New)
- [src/v2/pages/event/ValentineSeolPage.tsx](../../src/v2/pages/event/ValentineSeolPage.tsx)
- [src/v2/components/event/ValentineSeolBanner.tsx](../../src/v2/components/event/ValentineSeolBanner.tsx)
- [src/v2/components/event/SecretCodeInput.tsx](../../src/v2/components/event/SecretCodeInput.tsx)

**🏷️ 태그**
`P0` `FRONTEND` `EVENT` `ENCODING` `UNICODE` `✅해결완료`
