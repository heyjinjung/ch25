문서 타입: 설계
버전: v1.0
작성일: 2026-01-09
작성자: BE팀 (Antigravity)
대상: BE 개발자, FE 개발자
상태: SoT

# 🎯 리텐션 핵심 기능 기술 명세서 (v1.0)

## 1. 목적 (Purpose)
승인된 리텐션 전략의 3대 핵심 기능(Day 2 예약, 레벨 점프, 개인화 넛지)을 실제 코드로 구현하기 위한 기술적 요구사항을 정의합니다.

## 2. 범위 (Scope)
DB 모델 확장, API 엔드포인트 설계, 백엔드 서비스 로직 및 가상 프론트엔드 연동 가이드를 포함합니다.

## 3. 본문

### ## 1) Day 2 보상 예약 시스템
- **DB (User)**: `has_reserved_next_day_reward` (Bool), `reward_reserved_at` (TS) 필드 추가.
- **API**: `POST /api/vault/reserve` (예약), `GET /api/vault/reservation-status` (조회).
- **Logic**: `VaultService`에서 익일 첫 로그인 감지 시 자동 지급 및 예약 초기화.

### ## 2) Level Jump 보상 엔진
- **Logic**: `RewardService`에 `LEVEL_UP` 타입 추가. XP 가산 없이 `User.level` 직접 수동 조작 및 데이터 동기화.
- **UX**: 프론트엔드에서 `level_jump` 정보를 받아 Odometer 효과 등으로 연출.

### ## 3) 개인화 넛지(Nudge) 워커 (CRM)
- **Logic**: 24~48시간 미접속자 추출 루틴 구현. `[금고 알림] {nickname}님, {balance}원이 소멸 위기입니다!` 메시지 생성.
- **Admin**: CRM 콘솔에서 대량 발송 및 미리보기 지원.

## 4. 운영/검증 (QA)
- [ ] 예약 후 다음 날 실제 보상이 들어오는지 단위 테스트 수행.
- [ ] 레벨 점프 시 상위 레벨 보상(기존 시스템)과 충돌이 없는지 확인.
- [ ] 넛지 메시지의 잔액 쉼표(,) 표기 및 닉네임 치환 정확성 검증.

## 5. 변경 이력
- v1.0 (2026-01-09, Antigravity): 리텐션 기능 3종 상세 기술 스펙 확정
