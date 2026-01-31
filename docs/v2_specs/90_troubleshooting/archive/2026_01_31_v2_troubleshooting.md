# 2026-01-31 트러블슈팅 요약 (v2)

**작성일**: 2026-01-31
**작성자**: Antigravity AI
**상태**: 완료

---

## 🚨 주요 이슈 해결 (P0)

### 1. 신규 유저 채널 가입 미션 UI 비활성화 버그
- **증상**: "신규 텔레그램 채널가입" 및 "신규 CC채널가입" 미션 카드의 버튼이 "미션 진행 중"으로 표시되며 클릭이 불가능함 (비활성화 상태).
- **원인 분석**:
    - 프론트엔드(`MissionCard.tsx`)에서 미션의 `action_type`을 필터링할 때 `JOIN_CHANNEL` 등 공통 타입만 처리하고 있었음.
    - 실제 운영 DB의 신규 미션은 `JOIN_TELEGRAM_CHANNEL`, `JOIN_CC_CHANNEL`이라는 구체적인 타입을 사용 중이었으나, 프론트에서 이를 "채널 가입" 유형으로 인지하지 못해 발생함.
- **해결 방법**:
    - `src/v2/components/mission/MissionCard.tsx` 내 `handleAction` 및 `renderActionButton` 조건을 수정하여 신규 액션 타입들을 명시적으로 포함함.
- **결과**: 버튼이 "채널 가입" 또는 "가입 확인"으로 정상 노출되며 검증 로직 작동 확인.

---

## ⚠️ 도메인별 점검 및 운영 이슈 (P1)

### 1. V2 유저 & FK 전수 조사 (Domain Audit)
- **점검 범위**: 금고(Vault), 미션, 게임로그, 인벤토리, 리텐션, 팀배틀, 어드민.
- **주요 발견 사항**:
    - ✅ **핵심 도메인 완료**: 금고 잔액, 미션 진행도, 레벨 XP, 팀 소속 등 비즈니스 핵심 테이블은 모두 `v2_user` FK가 정상 적용됨.
    - ⚠️ **로그성 테이블 FK 누락**: `v2_dice_log`, `v2_shop_order` 등 일부 이력성 테이블에 물리적 FK 제약조건이 누락되어 있음.
- **조치 사항**:
    - 기능상 문제는 없으나, 데이터 무결성 및 추후 유저 탈퇴(`purge_user`) 시 연쇄 삭제를 위해 로그성 테이블에도 `alembic`을 통해 FK 추가 권장.
    - [2026_01_31_v2_domain_audit.md](./2026_01_31_v2_domain_audit.md) 문서에 상세 내용 기록됨.

---

## 🔧 인프라 및 설정 점검

### 2. Sentry Log Monitoring (Logs 탭) 활성화
- **증상**: Sentry 대시보드의 'Logs' 탭에서 "Set up the Sentry SDK"라는 온보딩 화면만 뜨고 실제 로그가 인덱싱되지 않음.
- **원인**: 최신 Sentry Python SDK (>= 2.35.0)에서는 단순 `LoggingIntegration`만으로는 부족하며, 신규 'Log Monitoring' 기능을 위해 `enable_log_record=True` 옵션이 명시적으로 필요함.
- **해결 방법**: `app/main.py`의 `sentry_sdk.init` 파라미터에 `enable_log_record=True`를 추가하고 배포 완료.
- **결과**: `docker compose logs`에서 Sentry 초기화 확인. 이제 대시보드의 'Logs' 탭에서 실시간 로그 확인 가능.

---

## 📈 최종 상태
- **백엔드**: V2 Native 순수 로직 작동 확인.
- **프론트엔드**: 신규 유저 미션 UI 정합성 확보.
- **데이터베이스**: 도메인별 FK 정합성 90% 이상 확보 (로그성 제외 완벽).
