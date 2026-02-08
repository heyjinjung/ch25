문서 타입: 가이드
버전: v2.0
작성일: 2026-02-08
작성자: Antigravity Agent
대상: V2 문서 작성자
상태: SoT

## 1. 목적 (Purpose)
V2 문서(SOT)의 폴더 구조, 네이밍, SoT 우선순위, 작성 규칙을 표준화한다.

## 2. 범위 (Scope)
- V2 문서 루트: `docs/SOT/`
- V2 도메인 명세/정책/운영 문서 전반

## 3. 용어 정의 (Definitions)
- SoT(Source of Truth): 정책/동작 판단의 기준 문서
- V2 전용: V1과 분리된 V2 스펙/정책 범주

## 4. 문서 및 코드 구조 (Directory Structure)
### 4.1 Documentation (New SOT Structure)
- **Root**: `docs/SOT/`
- **Domain Folders**: `00_{domain}` (예: `00_admin`, `00_game`)

### 4.2 Codebase (New V2 Structure)
**All V2 code must reside in independent directories to ensure isolation.**
- **Backend**: `app/v2/`
    - `app/v2/models/`
    - `app/v2/schemas/`
    - `app/v2/services/`
    - `app/v2/api/`
- **Frontend**: `src/v2/`
    - `src/v2/types/`
    - `src/v2/api/`
    - `src/v2/components/`
    - `src/v2/hooks/`
- **Rule**: Do NOT mix V2 code into root `app/` or `src/` (reserved for V1/Legacy).

## 5. 폴더 구조 규칙 (SOT)
- `docs/SOT/00_INDEX.md` : 전체 인덱스
- `docs/SOT/01_V2_DOCUMENTATION_RULES.md` : 문서 작성 규칙 (본 문서)

- `docs/SOT/00_admin/` : 어드민 관련 명세
- `docs/SOT/00_api/` : API 계약 및 명세
- `docs/SOT/00_auth/` : 인증 및 보안
- `docs/SOT/00_db/` : DB 스키마 및 마이그레이션
- `docs/SOT/00_deployment/` : 배포 및 인프라
- `docs/SOT/00_design/` : 디자인 시스템 및 UI/UX
- `docs/SOT/00_game/` : 게임 로직 및 확률
- `docs/SOT/00_golden/` : Golden V2 시스템 및 정책
- `docs/SOT/00_inventory/` : 인벤토리 및 아이템
- `docs/SOT/00_level/` : 레벨 및 경험치 시스템
- `docs/SOT/00_mission/` : 미션 및 업적
- `docs/SOT/00_ops/` : 운영 및 모니터링
- `docs/SOT/00_segment/` : 유저 세그먼트 정책
- `docs/SOT/00_shop/` : 상점 및 구매 로직
- `docs/SOT/00_test/` : 테스트 계획 및 리포트
- `docs/SOT/00_user/` : 유저 데이터 및 프로필
- `docs/SOT/00_vault/` : 금고 및 재화 관리
- `docs/SOT/00_verification/` : 검증 및 QA

## 6. 네이밍 규칙
- 폴더명: `00_{domain}` 형식 준수
- 파일명: `v2_{feature}_{type}_ko.md` 또는 `00_{topic_order}_{name}_ko.md` 권장
- 마크다운 파일 확장자: `.md`

## 7. 문서 형식 규칙
- 상단 메타 블록(문서 타입/버전/작성일/작성자/대상/상태) 필수 포함
- H2부터 번호 부여: ## 1. 목적, ## 2. 범위 …
- 코드/SQL/JSON은 fenced block 사용
- 변경 이력은 문서 하단에 기록

## 8. SoT 우선순위
- `docs/SOT/` 내의 최신 문서가 최우선 (파일명에 날짜나 버전이 있는 경우 최신본 기준)
- V1 문서와 충돌 시 V2 SOT 문서를 우선
- 운영 판단 기준은 V2 ops 문서를 우선

## 9. 운영/검증 (QA)
- [ ] 메타 블록 작성 여부
- [ ] 폴더/네이밍 규칙(`docs/SOT/00_*`) 준수
- [ ] SoT 우선순위 명시
- [ ] 번호 기반 섹션 구조 유지

## 10. 변경 이력
- v2.0 (2026-02-08, Antigravity Agent): `docs/SOT` 구조로 전면 개편 및 폴더 규칙 업데이트
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
