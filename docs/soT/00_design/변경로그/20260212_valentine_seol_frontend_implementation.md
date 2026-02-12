# 발렌타인 & 설 이벤트 프론트엔드 구현

**작성일**: 2026-02-12
**작성자**: Claude Opus 4.6
**도메인**: DESIGN / FRONTEND
**관련 기획서**: `docs/events/2026_valentine_seol_event_proposal.md`

---

## 변경 요약

백엔드 완료 상태에서 프론트엔드 이벤트 UI 구현 (기획서 Phase 2).

## 신규 파일

| 파일 | 용도 |
|------|------|
| `src/v2/api/eventApi.ts` | 이벤트 API 모듈 - v2Client 기반, 백엔드 스키마 미러링 |
| `src/v2/hooks/useValentineSeol.ts` | React Query 훅 - useValentineSeolStatus, useClaimSecretCode |
| `src/v2/components/event/ValentineSeolBanner.tsx` | 일자별 배너 (4종 테마) + 4일 스트릭 진행 표시 |
| `src/v2/components/event/SecretCodeInput.tsx` | 비밀코드 입력 폼 + 에러 매핑 + 햅틱/토스트 피드백 |
| `scripts/send_secret_code_announcement.py` | 텔레그램 일별 비밀코드 공지 (Cron 10:00 KST) |

## 수정 파일

| 파일 | 변경 |
|------|------|
| `src/v2/api/index.ts` | eventApi export 추가 |
| `src/v2/pages/missions/MissionsPage.tsx` | getEventDay() + 이벤트 배너/비밀코드 조건부 삽입 |

## 기술 결정

- Tailwind CSS 적용 (기획서 plain CSS 대신 프로젝트 표준)
- React Query 훅 패턴 (기존 useV2Mission 패턴 따름)
- KST 시간대: `Intl.DateTimeFormat` 활용
- 이벤트 기간 외 자동 비활성화 (API 미호출 + UI 미렌더링)

## 백엔드 API 연동

- `GET /api/events/valentine-seol/status` → useValentineSeolStatus
- `POST /api/events/secret-code/claim` → useClaimSecretCode
