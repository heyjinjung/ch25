문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: Draft

## 1. 목적 (Purpose)
Golden V2 개입/리텐션 데이터 저장 위치를 정의한다.

## 2. 범위 (Scope)
- 개입/ROI 관련 로그 저장 위치
- 사용자 상태 저장 위치

## 3. 데이터 매핑 (Data Mapping)
- **UserRetentionState**: 사용자 리텐션 상태 스냅샷 (V1 테이블 기반)
- **RetentionRoiLog**: 개입 결과/ROI 기록 (V1 테이블 기반)

## 4. 비고 (Notes)
- V2 전용 테이블 분리는 미완료이며, 현재는 V1 테이블을 임시 사용한다.
- V2 전용 테이블 필요 시 별도 마이그레이션으로 분리한다.

## 5. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성.
