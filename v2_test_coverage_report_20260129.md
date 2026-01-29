# V2 테스트 커버리지 리포트 (2026-01-29)

- 전체 테스트: 97개
- 실패: 0
- 통과: 100%

## 주요 커버리지 요약
- 인증(텔레그램/DEV): 토큰 발급, 갱신, 폐기, 이벤트 로깅, 추천인, 해시 검증 등
- 유저/자산: 생성, 동기화, FK/UNIQUE/PK 일관성, 09:00 KST 리셋
- 미션/스테이크: 미션 진행, 리셋, 경계값(00:00~09:00) 처리
- 금고/상점/인벤토리: 잔액, 구매, 혜택정지, Enum/상수 일치성
- 어드민/권한: RBAC, 로그, Admin API 보호
- 기타: 각종 예외처리, DB/코드/운영 일관성 검증

## 상세 커버리지(요약)
- 인증: /api/v2/telegram/auth, /api/v2/auth/refresh, /api/v2/auth/logout 등
- 유저: 신규/기존/동기화, PK/UNIQUE/INDEX, segment, benefits_suspended
- 미션: /v2/missions, streak, 경계값, 리셋
- 금고: vault_locked_balance, 출금, 일일/누적, 09:00 리셋
- 상점/인벤토리: 구매, 바우처, Enum/상수, 7일 무입금
- 어드민: RBAC, 로그, 권한별 API 접근제어

---
- 커버리지 상세 및 미달 영역은 coverage_report.txt, coverage_summary.txt 참고
- 미달/누락 영역 발견 시 learned_에 diff 및 TODO 기록 필요
