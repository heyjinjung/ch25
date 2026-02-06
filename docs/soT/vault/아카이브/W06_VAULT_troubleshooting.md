문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: VAULT
상태: 진행 중 ⏳

# W06 VAULT 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 4 |
| SoT 승격 예정 | 0 |

---

## 🔍 주간 이슈 내역

### 02-02 - VAULT/UX: Latency Survival 유저 신고 UI 부재 (User 접점 추가) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 입금 지연 신고 (Latency Survival) |
| HTTP Status | N/A (기능 미제공) |
| 영향 범위 | 유저 화면(금고) |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- Latency Survival 백엔드/어드민은 구현되어 있으나, 유저가 직접 신고/정책을 확인할 UI 진입점이 없었음.

**해결 방법**
- User API 라우터 추가:
	- `POST /api/v2/user/economy/latency/evidence`
	- `GET /api/v2/user/economy/latency/evidence`
	- `GET /api/v2/user/economy/latency/policy`
- 유저 UI 모달 추가: `LatencyReportModal` (입금 금액/일자/시간 입력 + 동의 체크)
- 금고 화면 진입점 추가: VaultPage 하단 링크에서 모달 오픈

**수정/추가 파일**
- [app/v2/api/user_latency_routes.py](../../../app/v2/api/user_latency_routes.py)
- [app/v2/api/routes.py](../../../app/v2/api/routes.py)
- [src/v2/components/user/LatencyReportModal.tsx](../../../src/v2/components/user/LatencyReportModal.tsx)
- [src/v2/pages/vault/VaultPage.tsx](../../../src/v2/pages/vault/VaultPage.tsx)

**검증 방법**
1) 프론트에서 모달 오픈/제출 플로우 확인
2) 위 API가 200으로 응답하는지 확인

**🏷️ 태그**
`P1` `VAULT` `LATENCY_SURVIVAL` `USER_UX` `✅해결완료`

---

## 1. 금고 출금 조건 세그먼트별 차등화 (2026-02-06)

### 증상
- 기존 시스템은 모든 유저에게 동일한 출금 조건(30판 플레이, 1만 유즈)을 요구함.
- 신규 유저나 VIP 유저에게는 너무 높거나 낮은 허들로 작용하여 운영상 비효율 발생.

### 원인 분석
- `vault_service.py` 내의 `request_withdrawal` 로직이 단일 상수로 되어 있어 세그먼트 인지가 불가했음.

### 해결 방법
- `V2SegmentService` 연동을 통해 유저 세그먼트를 런타임에 조회.
- **NEW, COMMON, VIP, WHALE, AT_RISK** 각 세그먼트별로 `play_target`, `spend_target`, `min_deposit_target` 분기 처리.
- 당일 입금액(`delta_today`) 기반의 최소 입금액 허들 로직 신규 추가.

---

## 2. 어드민 수동 혜택 제재 기능 (2026-02-06)

### 증상
- 7일 무입금 유저에 대한 자동 제재 로직만 존재하여, 어드민이 특정 유저를 즉시 제재하거나 예외 처리할 방법이 없음.

### 해결 방법
- `V2User` 모델에 `benefits_suspended_manual` (Integer) 필드 추가.
- `is_benefits_suspended` 로직 최상단에 수동 제재 여부 체크 추가 (자동 로직보다 우선함).
- 어드민 상세 드로어(`UserDetailDrawer.tsx`)에 상태 토글 버튼 및 API 연동 완료.

---

## 3. Pytest 테스트 컬렉션 오류 (RCA)

### 증상
- `pytest` 실행 시 `AttributeError: 'Package' object has no attribute 'obj'` 오류 발생으로 테스트 수집 단계에서 중단됨.

### 분석 및 임시 조치
- `pytest-asyncio` 버전이나 `conftest.py` 내의 비동기 셋업 이슈로 추정됨.
- 신규 작성한 `test_vault_withdrawal_policy.py`에서 `db: Session` 타입 힌트를 제거하고 `conftest.py`의 픽스처 스코프와 맞춤으로써 실행 가능 상태 확보.

---

## 관련 문서
- [v2_strict_vault_policy_sot_ko.md](../01_core/v2_strict_vault_policy_sot_ko.md)
- [v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md)
