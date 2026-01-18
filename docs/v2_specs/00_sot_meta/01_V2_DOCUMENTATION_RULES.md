문서 타입: 가이드
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: V2 문서 작성자
상태: SoT

## 1. 목적 (Purpose)
V2 문서의 폴더 구조, 네이밍, SoT 우선순위, 작성 규칙을 표준화한다.

## 2. 범위 (Scope)
- V2 문서 루트: docs/v2_specs/
- V2 도메인 명세/정책/운영 문서 전반

## 3. 용어 정의 (Definitions)
- SoT(Source of Truth): 정책/동작 판단의 기준 문서
- V2 전용: V1과 분리된 V2 스펙/정책 범주

## 4. 폴더 구조 규칙
- docs/v2_specs/00_sot_meta/ : V2 문서 규칙, 인덱스, 템플릿
- docs/v2_specs/01_core/     : 핵심 경제/정책/권한/보안
- docs/v2_specs/02_game/     : 게임 룰, 확률, 보상 스키마
- docs/v2_specs/03_api/      : V2 API 계약/응답 스키마
- docs/v2_specs/04_db/       : V2 DB 스키마/마이그레이션
- docs/v2_specs/05_ops/      : 운영/배포/런북
- docs/v2_specs/06_design/   : UX/카피/모션/디자인 규칙
- docs/v2_specs/99_archive/  : 폐기/구버전 문서

## 5. 네이밍 규칙
- 접두어: v2_ 필수 (예: v2_core_economy_glossary_ko.md)
- 권장 형식: v2_{domain}_{topic}_ko.md
- 버전 표기: 문서 상단 메타 블록의 버전으로 관리

## 6. 문서 형식 규칙
- 상단 메타 블록(문서 타입/버전/작성일/작성자/대상/상태)
- H2부터 번호 부여: ## 1. 목적, ## 2. 범위 …
- 코드/SQL/JSON은 fenced block 사용
- 변경 이력은 문서 하단에 기록

## 7. SoT 우선순위
- V2 정책/스키마 변경은 docs/v2_specs/가 우선
- V1 문서와 충돌 시 V2 문서를 우선
- 운영 판단 기준은 V2 ops 문서를 우선

## 8. 운영/검증 (QA)
- [ ] 메타 블록 작성 여부
- [ ] 폴더/네이밍 규칙 준수
- [ ] SoT 우선순위 명시
- [ ] 번호 기반 섹션 구조 유지

## 9. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
