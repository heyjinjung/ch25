# Golden V2 Game & Shop Master System of Truth (통합 핵심 가이드)

**문서 정보**
- **문서 타입**: 도메인 통합 마스터 SoT (Integrated Domain Master)
- **버전**: v1.1 (Detailed Expansion)
- **최종 업데이트**: 2026-02-06
- **상태**: 🟢 최신화 완료
- **대상**: 개발팀, 운영팀, 인프라팀

---

## 0. 개요 및 정책 정합성 원칙
본 문서는 Golden V2의 게임 엔진, 상점 정책, 운영 안전장치 및 정합성 관리 정책을 하나로 통합한 마스터 가이드입니다. 7개의 개별 SoT 문서를 기반으로 하며, 정책-코드-DB-프론트엔드 간의 1:1 매핑을 최우선 가치로 합니다.

### 🛑 정책 충돌 처리 원칙
1. **부정합 발견 시**: 즉시 🔴 [정책/구현 충돌]로 표기하고 우선순위 기준을 명시함.
2. **임시 조치**: 즉시 수정 불가능한 경우 "임시 예외" 또는 "운영상 임시 허용"으로 기록하고 TODO에 추가함.
3. **근거 명시**: 모든 정책 결정은 SoT 문서, 코드 구현체, 운영 사례 중 하나 이상의 명확한 근거를 포함해야 함.

---

## 1. 1순위 핵심 정책: 강력한 금고 정책 (Strict Vault Policy)
*참조: [01_strict_vault_policy.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/01_strict_vault_policy.md)*

Golden V2의 경제 생태계 보호를 위해 '최근 7일 입금 내역'을 기반으로 유저 권한을 동적으로 제어합니다.

### 1.1 혜택 중단 (Benefits Suspended) 기준
- **조건**: 최근 7일(KST 기준) 내 누적 입금액(`cc_deposit`)이 1회 미만인 경우.
- **상태값**: `benefits_suspended = True`
- **검증 로직**: `V2VaultService.is_benefits_suspended(db, user_id)`

### 1.2 제재 내용 (Strict Enforcement)
| 영역 | 제재 상세 | 구현 위치 |
| :--- | :--- | :--- |
| **상점 (Shop)** | 모든 상품 구매 버튼 비활성화 및 백엔드 403 차단 | `shop_service.py`, `routes.py` |
| **게임 (Game)** | 룰렛, 다이스, 복권 플레이 시 403 Forbidden 반환 | `v2_roulette_game_service.py` 등 |
| **인벤토리** | 바우처(Voucher) 사용 및 아이템 교환 전면 차단 | `inventory_service.py` |
| **금고 (Vault)** | 보유 한도가 30,000 KRW로 강제 축소 (초과분 적립 불가) | `vault_service.py` |

---

## 2. 기술 표준 및 데이터 정합성 (Technical Standards)
*참조: [03_enum_naming_consistency.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/03_enum_naming_consistency.md), [03.game.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/03.game.md)*

### 2.1 Canonical Enum 관리 (단일 진실 공급원)
모든 Enum은 코드 작성이 아닌 JSON 설정 기반으로 동기화되어야 합니다.
- **경로**: `docs/soT/canonical_enums/shop_enums.json`
- **핵심 Enum 구성**:
  - `CostType`: `VAULT`, `DIAMOND`
  - `RewardType`: `TICKET`, `ITEM`, `GIFTICON`
  - `GameTokenType`: `ROULETTE_TICKET`, `DICE_TICKET`, `LOTTERY_TICKET`, `GOLD_KEY_TICKET`, `DIAMOND_TICKET`, `TRIAL_TICKET`

### 2.2 코드 레벨 매핑 (ticket_map)
레거시 명칭과의 혼용을 방지하기 위해 `V2RewardService` 내에 명시적인 매핑 딕셔너리를 유지합니다.
- **주요 매핑**:
  - `DICE_TOKEN` → `DICE_TICKET`
  - `ROULETTE_COIN` → `ROULETTE_TICKET`
  - `LOTTERY_TOKEN` → `LOTTERY_TICKET`

### 2.3 API Case 및 스키마 표준화
- **Case Policy**: 장기적으로 `camelCase` 통일을 지향하나, 현재 Game API는 `snake_case`를 혼용 중임. 프론트엔드 인터페이스 정의 시 주의 필요.
- **Schema Cleanup**: `v2_roulette_config.grade` 컬럼은 Deprecated 되었으나 DB에 잔존함. 코드에서는 무시되나 DB 마이그레이션 시 정리 대상임.

---

## 3. 운영 안전장치 및 리스크 관리 (Operational Safety)
*참조: [02_empty_shop_risk.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/02_empty_shop_risk.md), [03.game.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/03.game.md)*

### 3.1 서킷 브레이커 (Circuit Breaker - 긴급 필요)
시스템 장애로 인한 자산 유출을 방지하기 위한 최후의 보루입니다.
- **Global Limit**: 전체 유저 대상 분당 보상 총액 초과 시 작동.
- **Error Rate Pause**: 특정 게임 엔진의 에러율이 5% 초과 시 해당 게임만 일시 정지.
- **Emergency Stop**: 관리자가 원클릭으로 전체 게임 서비스를 중단할 수 있는 기능.

### 3.2 공백 상점 (Empty Shop) 리스크 대응
운영자의 설정 실수로 상점이 비어 있을 경우의 대응 프로세스입니다.
- **탐지**: `list_shop_products()` 결과가 0인 경우 Sentry `shop_empty_products` 발생.
- **대응 (Fallback)**:
  - **1단계**: 점검 중(Maintenance) UI 강제 노출.
  - **2단계**: 코드 내 정의된 `default_shop_products` 리스트로 자동 복원 시도.
- **방어**: 어드민 UI에서 상품 0개 저장 시 "점검 모드 활성" 확인 절차 강제.

---

## 4. 이슈 분류 및 종결 히스토리 (2026-01-25 기준)
*참조: [0125_v2_classification_and_resolved.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/0125_v2_classification_and_resolved.md)*

### 4.1 유형별 이슈 정리
1. **백엔드 API 및 유효성**: `app/v2/api/admin/game_config_routes.py` 등에서 4xx 상세 에러 표준화 완료.
2. **게임 로직 정규화**: 주사위 확률 단위 불일치 및 룰렛 설정 누락 대응 완료.
3. **프론트엔드 UI/UX**: 다크테마 드롭다운 시인성 개선 및 한글 인코딩 문제 해결.
4. **어드민 기능 확장**: 유저 레벨/XP 조정 UI 및 금고 강제 조정 기능 추가 완료.
5. **인증 및 라우팅**: v1/v2 경로 혼선 정리 및 Authorization 헤더 누락 수정.
6. **비즈니스 검증**: `INSUFFICIENT_BALANCE` 등 실패 시 유저 안내 문구 고도화.
7. **빌드 안정성**: `tsconfig.json` 오류 수정 및 `npm run build` 정규화.

---

## 5. 배포 후 액션 아이템 및 우선순위 (Action Items)
*참조: [1차_2026_deployment_action_items.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/1차_2026_deployment_action_items.md)*

### 🔴 High Priority (즉시 조치)
- **Sentry DSN 설정**: 프로덕션 에러 실시간 추적을 위해 필수.
- **Telegram Auth Rate Limit**: 초당 10회(Burst 20회) 제한 적용 필수 (`app/utils/rate_limit.py`).
- **DEV 로그인 차단**: 프로덕션 환경에서 `/api/v2/admin/dev-login` 엔드포인트 비활성화.

### 🟡 Medium Priority (단기 개선)
- **Grafana 대시보드 구축**: 응답 시간, DB 쿼리 성능, 서킷 브레이커 상태 모니터링.
- **Redis 캐싱 가속**: 게임 설정(`get_game_config`) 등 자주 참조되는 데이터에 `lru_cache` 및 Redis 적용.
- **N+1 쿼리 최적화**: Admin User List 조회 시 `selectinload`, `joinedload`를 통한 쿼리 수 최적화.

### 🟢 Low Priority (장기 개선)
- **중앙 집중식 로그 수집**: Docker logs에서 ELK Stack으로 전환 고려.
- **DB Connection Pool 튜닝**: `SQLALCHEMY_POOL_SIZE` 등 세부 파라미터 최적화.

---

## 6. 운영 런북: 상점 및 게임 장애 대응 (Incident Runbook)
*참조: [04_ops_checklist.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/04_ops_checklist.md)*

### 6.1 시나리오 A: 제재 유저의 구매 시도 폭주
1. **알림 확인**: Slack 채널에 `shop.purchase_blocked_benefits_suspended` 집계 발송.
2. **조회**: `SELECT benefits_suspended, last_deposit_at FROM user WHERE id = ?` 실행.
3. **조치**: 
   - 오탐인 경우: 운영 UI에서 즉시 `benefits_suspended = False` 처리.
   - 공격인 경우: 해당 IP/유저 ID에 대해 WAF 또는 앱 레벨 영구 차단.

### 6.2 시나리오 B: 상점 공백 (Empty Shop) 발생
1. **원인 분석**: `v2_shop_products` 테이블 및 최근 어드민 편집 로그 조사.
2. **복구**: DB 백업본에서 `value_json` 복원 또는 `scripts/restore_shop_config.py` 실행.
3. **공지**: 복구가 5분 이상 지연될 경우 텔레그램 공지 채널을 통해 "상점 긴급 점검" 공지.

---

## 7. 정합성 자동화 체크리스트 (Verification)
운영자와 개발자는 배포 전후로 아래 항목을 전수 점검해야 합니다.

- **정책 부문**
  - [ ] 7일 입금 없는 유저의 상점 접근 시 403 Forbidden 및 안내 팝업 노출 여부.
  - [ ] 금고 잔액 부족 시 `INSUFFICIENT_BALANCE` 코드와 정확한 부족 금액 표시 여부.

- **기술 부문**
  - [ ] `canonical_enums`와 실제 코드 `Enum` 클래스 간 불일치 여부 (Pytest로 확인).
  - [ ] 룰렛 8세그먼트 디자인(slot_index 0~7)과 서버 확률 테이블 인덱스 일치 여부.

- **인프라 부문**
  - [ ] Sentry 이벤트 전송 및 Slack 알림 봇 작동 상태.
  - [ ] Telegram Auth 요청 시 Rate Limit(429) 정상 작동 여부.

- **데이터 부문**
  - [ ] `v2_lottery_prize` 등 ENUM 타입 컬럼에 정책외 값이 들어있는지 여부.
  - [ ] `user_game_wallet` 테이블의 `token_type`이 `GameTokenType`과 일치하는지 여부.

---

*본 문서는 Golden V2의 최우선 System of Truth이며, 모든 기술 문서 및 기획 문서는 본 마스터 가이드를 준수해야 합니다.*
