# Docs Index (SoT)

이 인덱스는 전체 문서의 진입점입니다. 규칙/아카이브/주간 인덱스는 항상 여기서 시작합니다.
핵심 SoT 문서는 한글을 우선 사용합니다.

## 빠른 링크
- 문서 규칙: `docs/00_meta/DOCUMENTATION_RULES.md`
- 문서 템플릿: `docs/00_meta/TEMPLATE_DOC.md`
- 아카이브 정책: `docs/00_meta/ARCHIVE_POLICY.md`
- 시간 인덱스: `docs/00_meta/INDEX_BY_TIME.md`
- 주간 인덱스: `docs/00_meta/weekly/[20261월첫째주]_핵심문서_인덱스.md`

## 분야별 인덱스
- 개요: `docs/01_overview/`
- 아키텍처: `docs/02_architecture/`
  - 프론트: `docs/02_architecture/frontend/`
  - 텔레그램: `docs/02_architecture/telegram/`
- API: `docs/03_api/`
- DB: `docs/04_db/`
- 모듈/기획: `docs/05_modules/`
  - 디자인(기획/UX): `docs/05_modules/design/`
  - 제품 스펙: `docs/05_modules/product/`
    - [NEW] 리텐션 핵심 기능 명세: `docs/05_modules/product/01_retention_feature_specs_v1.0.md`
- 운영/런북: `docs/06_ops/`
  - 운영 문서: `docs/06_ops/ops/`
    - [NEW] 배포 후 정밀 검증 체크리스트: `docs/06_ops/ops/01_post_deployment_verification_v1.0.md`
  - 어드민 운영: `docs/06_ops/admin/`
  - 배포/인프라: `docs/06_ops/deployment/`
    - [NEW] Vultr 서울 서버 설정 가이드: `docs/06_ops/deployment/01_vultr_seoul_setup_guide_v1.0.md`
    - [NEW] 서버 초기화 자동화 런북: `docs/06_ops/deployment/02_vultr_ubuntu_init_script_v1.0.md`
    - [NEW] 고속 빌드 및 배포 가이드: `docs/06_ops/deployment/03_fast_deployment_guide_v1.0.md`
    - [NEW] 배포 장애 트러블슈팅 리포트: `docs/06_ops/deployment/99_deployment_troubleshooting_v1.0.md`
  - 이벤트/캠페인: `docs/06_ops/events/`
    - [NEW] 통합 리텐션 전략 보고서: `docs/06_ops/events/01_retention_strategy_integrated_v1.1.md`
  - 감사/점검: `docs/06_ops/audit/`
- 리뷰/검증: `docs/07_review/`
- 변경로그: `docs/08_changelog/`

## 운영 SoT 우선순위
- 운영/구현 기준은 `docs/06_ops/`를 최우선으로 본다.
- 디자인/기획 문서는 참고이며, 충돌 시 운영 SoT를 우선한다.
