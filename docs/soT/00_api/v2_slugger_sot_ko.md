문서 타입: 설계
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Slugger SoT

## 1. 목적 (Purpose)
V2 기준의 슬러그(라우트/페이지/리소스 키) 네이밍 규칙을 통일하여, FE 라우팅·API 경로·운영 문서 간 불일치를 방지한다.

## 2. 범위 (Scope)
- FE 라우팅 경로 슬러그
- API 경로 슬러그
- 문서/로그/아티팩트 파일명 슬러그

## 3. 용어 정의 (Definitions)
- Slug: 공백/특수문자를 제거한 경로/식별자 문자열
- Route Slug: FE 라우팅 경로 문자열
- API Slug: API 경로의 리소스/동작 문자열

## 4. 기본 규칙 (Rules)
### 4.1 공통 규칙
- 소문자 + 하이픈(`-`) 사용
- 의미 단위는 하이픈으로 구분
- 약어는 일관된 사전 사용 (예: `ui`, `ops`, `admin`)
- 동사는 동작, 명사는 리소스 (예: `withdraw`, `team-battle`)

### 4.2 FE 라우팅 슬러그
- 기준 문서: docs/v2_specs/00_sot_meta/v2_frontend_routing_sot_ko.md
- 예: `/admin/team-battle`, `/missions`, `/vault`

### 4.3 API 슬러그
- 기준 문서: docs/v2_specs/03_api/v2_openapi.yaml
- 버전 프리픽스는 `/api/v2/` 고정
- 예: `/api/v2/vault/withdraw`, `/api/v2/dice/play`

### 4.4 파일/아티팩트 슬러그
- 형식: `<slug>_<YYYYMMDD_HHMMSS>.<ext>`
- 예: `signup_shop_play_vault_20260124_101530.png`

## 5. 금지 규칙 (Forbidden)
- 대문자/스페이스 사용 금지
- 동일 의미에 다른 표기 혼용 금지 (예: `teamBattle` vs `team-battle`)
- v1 경로 재사용 금지 (v2-only 원칙)

## 6. QA/검증
- FE 라우팅 표와 실제 라우트 경로 일치
- OpenAPI 경로와 실제 핸들러 경로 일치
- 로그/아티팩트 파일명 규칙 준수

## 7. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
