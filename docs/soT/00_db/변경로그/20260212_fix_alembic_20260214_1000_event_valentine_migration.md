문서 타입: 변경로그
버전: v1.0
작성일: 2026-02-12
작성자: GitHub Copilot
대상: V2 개발/운영 담당자
상태: SoT

# 20260212 변경로그 - Alembic 20260214_1000 이벤트 마이그레이션 안정화

## 1. 변경 요약
- `alembic upgrade head`가 실패하던 `20260214_1000_event_valentine_seol_missions` 리비전을 재실행 안전(idempotent)하게 수정
- MySQL `DATETIME` 호환을 위해 seed 데이터의 타임존 오프셋 문자열을 제거
- `mission` 테이블 스키마 차이(`visible` 컬럼 유무)에 안전하도록 seed SQL에서 `visible` 컬럼을 제거

## 2. 원인 및 증거
- MySQL 에러: `Incorrect datetime value: 'YYYY-MM-DD HH:MM:SS+09'` (DATETIME 컬럼에 오프셋 포함 문자열 삽입)
- MySQL 에러: `Unknown column 'visible' in 'field list'` (환경별 mission 스키마 불일치)
- 재시도 중 DDL 일부만 반영되어 `Table already exists`로 연쇄 실패 가능

## 3. 적용 범위
- 파일: [alembic/versions/20260214_1000_event_valentine_seol_missions.py](../../../alembic/versions/20260214_1000_event_valentine_seol_missions.py)

## 4. 검증
- `docker compose exec backend alembic upgrade head`
- `docker compose exec backend alembic current` → `20260214_1000 (head)`

## 5. 변경 이력
- v1.0 (2026-02-12, GitHub Copilot): 최초 작성
