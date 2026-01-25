문서 타입: 정책 (SoT)
버전: v1.0
작성일: 2026-01-25
작성자: GitHub Copilot
대상: Backend/Frontend/QA
상태: SoT

# V2 배포 이전 인증 정책 (Pre-Release Auth Policy)

## 1. 목적
배포 전(DEV/LOCAL) 환경에서 테스트 계정과 프론트 연동을 안정적으로 수행하기 위한 인증 임시 정책을 정의한다.

## 2. 범위
- 적용 환경: local, development, dev
- 적용 대상: V2 사용자 인증(프론트/백엔드)

## 3. 핵심 정책 (SoT)
1) **임시 로그인 허용**: 배포 전에는 `external_id` 기반 DEV 로그인 흐름을 허용한다.
2) **비밀번호 미사용**: V2는 비밀번호 스키마가 없으므로 테스트용 로그인에서 비밀번호를 요구하지 않는다.
3) **생성 정책**: DEV 로그인은 기본적으로 **기존 유저 매칭 우선**이며, `create_if_missing=true`일 때만 테스트 계정을 생성한다.
4) **환경 제한**: DEV 로그인은 `env in [local, development, dev]`에서만 허용한다.
5) **연결 기준**: 배포 전 연결 기준은 `external_id(cc_id)`로 한다.

## 4. 인증 플로우 (임시)
- Endpoint: `POST /api/v2/dev/login`
- Request: `{ external_id, nickname?, create_if_missing }` (기본값: `false`)
- Response: `{ access_token, user }`
- 프론트: DEV 외부 ID 로그인 버튼 제공

## 5. 배포 전 필수 체크리스트
- [ ] DEV 로그인은 비운영 환경에서만 동작한다.
- [ ] `external_id(cc_id)` 입력 시 기존 유저로 토큰 발급 후 `/home` 진입 확인.
- [ ] 상점/티켓/게임 API가 동일 토큰으로 호출되는지 확인.

## 6. 배포 전환 정책
- 배포 전 **DEV 로그인은 제거하거나 비활성화**한다.
- 배포 후 인증은 **텔레그램 봇 /start 코드 교환** 흐름으로 전환한다.

## 7. 변경 이력
- v1.0 (2026-01-25, GitHub Copilot): 최초 작성
