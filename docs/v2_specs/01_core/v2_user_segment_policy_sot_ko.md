문서 타입: SoT
버전: v1.2
작성일: 2026-02-02
작성자: GitHub Copilot
대상: BE/운영/기획
상태: SoT

## 1. 목적 (Purpose)
V2 유저 세그먼트 분류 규칙과 운영 기준을 단일 SoT로 정의한다.

## 2. 범위 (Scope)
- V2 세그먼트 분류 규칙 저장/실행 기준
- 세그먼트 값 표준화 및 기본 동작

## 3. 용어 정의 (Definitions)
- 세그먼트: 운영/CRM 타게팅을 위한 유저 분류 키
- 룰: 세그먼트 판정을 위한 조건 집합(우선순위 포함)

## 4. SoT: 세그먼트 분류 규칙
1) 규칙 저장소
- 규칙은 `v2_segment_rule`에 저장한다.
- `priority` 오름차순으로 평가한다(First-match-wins).
- `enabled=false` 규칙은 평가하지 않는다.

2) 세그먼트 값 표준
- 세그먼트 키는 영문 대문자/숫자/언더스코어만 허용한다.
- 기본 세그먼트는 `COMMON`으로 설정한다.
- 표준 세그먼트 키: `NEW`, `COMMON`, `VIP`, `WHALE`, `AT_RISK`

3) 평가 주기
- 분류 작업은 일 1회 배치 실행을 기본으로 한다.
- 운영 필요 시 수동 실행을 허용한다.

4) 기본 동작
- 어떤 규칙에도 매칭되지 않으면 기존 세그먼트를 유지한다.
- 최초 분류 시 매칭이 없으면 `COMMON`으로 설정한다.

5) 신규 유저 세그먼트
- 기준: 가입일로부터 7일 이내
- 텔레그램 인증 기반: `telegram_id` 연결 유저만 대상
- 중복/악성 방지: 입금 이력 존재 시 NEW 제외

6) 고액 입금 세그먼트
- WHALE: 최근 7일 입금 5,000,000 이상
- VIP: 최근 7일 입금 3,000,000 이상

## 5. 데이터 소스 (Inputs)
- 기준 데이터는 V2 사용자/활동/입금/게임 지표 테이블을 사용한다.
- 룰에서 참조하는 필드 명은 `condition_json`에 기록한다.

### 5.1 현재 지원 조건 필드
- last_play_at, last_active_at
- days_since_last_play, days_since_last_active
- roulette_plays, dice_plays, lottery_plays
- deposit_amount
- vault_balance
- account_age_days
- is_telegram_linked
- has_charge_history

*미지원 필드는 매칭 실패로 처리한다.*

## 6. 운영/검증 (QA)
- [ ] 세그먼트 키 표준(대문자/언더스코어) 준수
- [ ] 룰 우선순위 충돌 여부 확인
- [ ] 일 1회 배치 실행 여부 확인

## 7. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
- v1.1 (2026-02-02, GitHub Copilot): COMMON/VIP/WHALE/AT_RISK 통일 및 기본값 갱신
- v1.2 (2026-02-02, GitHub Copilot): NEW 세그먼트(가입 7일/텔레그램 인증/입금 이력 제외) 추가
- v1.3 (2026-02-02, GitHub Copilot): WHALE/VIP 7일 입금 기준 상향(5,000,000/3,000,000)
