# 2026-01-03 개발 로그: Vault 티켓제로(Ticket0) 모달 문구/해금조건 UI 정리

## 배경
금고 모달에서 티켓 부족(TICKET_ZERO) 상황에 노출되던 안내 문구가 운영 변경(레벨 기준 변경)과 함께 혼재되어 있었고,
또한 모달 내 "해금 조건 안내"(unlock rules) 노출이 요구사항 변경으로 불필요해져 제거가 필요했습니다.

## 이번 변경
### Frontend
- Ticket Zero 전용 강조 배너(🔥 레벨/다이아키 안내) 섹션 제거.
- "해금 조건 안내" 섹션(500,000원/30,000원 해금, Gold 차등, Diamond 조건) UI 블록 전체 제거.

### Backend
- `GET /api/ui-copy/ticket0` 응답에서 기존 저장 카피에 "10레벨" 문구가 남아있더라도 "20레벨"로 자동 교정(호환성 유지).
- 관리자 UI copy upsert 응답에서도 동일 교정을 적용하여 저장/조회 결과가 일관되도록 정리.

### Admin UI (Frontend)
- 관리자 Vault UI 편집기의 Ticket Zero 기본 문구(레벨 안내)를 최신 기준(20레벨)으로 정리.

## 검증
- Frontend: `npm run build` 통과
- Backend: `python -m compileall app` 통과
