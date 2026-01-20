문서 타입: 트러블슈팅
버전: v1.0
작성일: 2026-01-20
작성자: Antigravity
대상: BE/DB 팀
상태: 완료

## 1. 개요 (Overview)
`2026-01-20` Alembic 마이그레이션 실행 중 발생한 구문 오류 및 `revision` 식별자 누락 문제를 해결하고, 환경을 정상화한 과정을 기록한다.

## 2. 문제 상황 (Problem)
- **증상**: Alembic 명령(upgrade/history 등) 실행 시 `20260116` 일자의 특정 마이그레이션 파일들에서 에러 발생.
- **에러 메시지**: `revision` 변수 누락 또는 ImportError 유발.
- **영향 범위**: DB 스키마 변경 및 동기화 작업 중단. 2026-01-19 베이스라인 적용 불가능.

## 3. 원인 분석 (Root Cause)
1.  **더미 파일 잔존**: `alembic/versions` 디렉토리에 `20260116` 날짜의 파일 3개가 존재했음.
    - `20260116_1513_3dabb97ccbef_add_vault_spent_today_tracking.py`
    - `20260116_2004_2b59a09b954a_add_puzzle_tokens.py`
    - `20260116_2042_087549c1c6ca_add_puzzle_c1_c2.py`
2.  **내용 불량**: 해당 파일들은 내용이 비어있거나 주석만 존재하며, Alembic이 요구하는 필수 변수(`revision`, `down_revision`)가 정의되지 않음.
3.  **관리 미흡**: 주석 상으로는 `versions_archive`로 이동되었다고 명시되었으나, 실제로는 `versions` 폴더에도 물리적으로 남아있어 Alembic이 로드 시도함.

## 4. 해결 내용 (Resolution)
- **조치**: `alembic/versions` 내의 불량 파일 3개를 **영구 삭제**.
- **명령**: `del alembic\versions\20260116_*.py`
- **검증**: 파일 삭제 후 디렉토리 확인 결과 `20260119` 베이스라인 스냅샷 파일부터 정상적으로 존재함 확인.

### 4.1 추가 이슈 및 해결 (2026-01-20)
- **이슈 A**: 신규 마이그레이션 `20260120_1200_add_mission_reward_gifticon` 적용 실패
    - **원인**: `down_revision` 값이 실제 체인에 존재하지 않는 식별자를 참조
    - **조치**: `down_revision`을 `20260119_1712`로 수정
- **이슈 B**: 컨테이너 내 마이그레이션 파일 미반영
    - **원인**: 로컬 수정본이 컨테이너에 복사되지 않음
    - **조치**: 수정본을 컨테이너에 재복사 후 `alembic upgrade head` 실행
- **검증**: `alembic current` 결과가 `20260120_1200_add_mission_reward_gifticon (head)`로 확인됨

## 5. 결과 (Result)
- **마이그레이션 정상화**: 2026-01-19 베이스라인을 기점으로 하는 새로운 마이그레이션 체인이 정상 작동 가능한 상태로 복구됨.
- **환경 무결성 확보**: 레거시/더미 파일 제거로 혼란 방지.
- **추가 적용 완료**: `20260120_1200_add_mission_reward_gifticon` 마이그레이션이 head로 적용됨.

## 6. 교훈 (Lessons Learned)
- 마이그레이션 파일 아카이빙 시 반드시 원본 폴더(`versions`)에서 파일을 **이동(Move)** 또는 **삭제**해야 함. 복사(Copy)만 할 경우 충돌 발생함.
- `revision` 변수가 없는 파이썬 파일은 `versions` 폴더에 절대 존재해서는 안 됨.

## 7. 변경 이력
- v1.0 (2026-01-20, Antigravity): 최초 작성
- v1.1 (2026-01-20, GitHub Copilot): 20260120 마이그레이션 추가 이슈/해결/검증 내역 반영
