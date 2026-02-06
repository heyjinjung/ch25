# Latency Survival User UI 구현 완료

- **작성일**: 2026-02-02
- **도메인**: VAULT (금고/경제)
- **상태**: ✅ 완료
- **관련 SoT**: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md)

---

## 1. 문제 정의

### 배경
Latency Survival 시스템의 백엔드/어드민은 구현 완료되었으나, **유저 접점(UI)이 없어** 기능 사용 불가 상태였음.

### 영향
- "돈은 보냈는데 아직 안 들어왔어요..." 유저 경험 개선 불가
- 은행/블록체인 지연으로 인한 이탈 방지 불가

---

## 2. 해결 내용

### 2.1 Backend API 추가

**파일**: `app/v2/api/user_latency_routes.py`

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v2/user/economy/latency/evidence` | 지연 입금 신고 제출 |
| GET | `/api/v2/user/economy/latency/evidence` | 내 신고 내역 조회 |
| GET | `/api/v2/user/economy/latency/policy` | 정책 안내 조회 |

**SoT 준수**:
- Provisional Reward: `ROULETTE_TICKET` x 5
- Rate Limit: MAX 3회/User/Hour
- TX ID 자동 생성: `{amount}_{date}_{time}_{userId}`

### 2.2 Frontend UI 구현

**파일**: `src/v2/components/user/LatencyReportModal.tsx`

**기능**:
- 입금 금액 입력 (최소 1,000원)
- 입금일 선택 (오늘/어제)
- 입금 시간 입력 (HH:MM)
- 주의사항 표시 + 동의 체크박스
- 신고 성공 시 선지급 완료 메시지

### 2.3 진입점 추가

**파일**: `src/v2/pages/vault/VaultPage.tsx`

- VaultPage 하단에 "입금이 지연되고 있나요?" 링크 추가
- 클릭 시 LatencyReportModal 오픈

---

## 3. 발견된 기존 코드 오류 수정

### 3.1 inventory_service.py 중복 괄호
- **위치**: Line 330
- **증상**: `SyntaxError: unmatched ')'`
- **원인**: `.with_for_update()` 후 `)` 중복
- **수정**: 중복 괄호 제거

### 3.2 inventory_service.py 중복 매개변수
- **위치**: Line 165
- **증상**: `SyntaxError: duplicate argument 'meta'`
- **원인**: `consume_wallet_tokens` 함수에 `meta` 매개변수 2번 선언
- **수정**: 중복 매개변수 제거

---

## 4. 파일 목록

### 신규 생성
- `app/v2/api/user_latency_routes.py` - User API 엔드포인트
- `src/v2/components/user/LatencyReportModal.tsx` - 신고 모달 UI

### 수정
- `app/v2/api/routes.py` - user_latency_router 등록
- `src/v2/pages/vault/VaultPage.tsx` - 신고 모달 진입점 추가
- `app/v2/services/inventory_service.py` - 문법 오류 수정

---

## 5. 테스트 확인

- [x] 프론트엔드 빌드 성공
- [x] 백엔드 시작 성공
- [ ] E2E 신고 → 선지급 흐름 테스트 (운영 환경에서 확인 필요)

---

## 6. 관련 문서

- [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md) - 전체 스펙
- [Admin LatencySurvivalPage.tsx](../../../src/v2/admin/pages/economy/LatencySurvivalPage.tsx) - 어드민 검증/반려 UI
