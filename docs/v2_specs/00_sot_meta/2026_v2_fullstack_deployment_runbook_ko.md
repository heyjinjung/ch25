# V2 풀스택 배포 런북 (V2 Full-Stack Deployment Runbook)

**문서 타입**: 배포 운영 절차서 (Operational Runbook)
**작성일**: 2026-01-29
**프로젝트**: Golden V2

---

## 🏗️ 1. 배포 전 점검 (Pre-Deployment Checklist)

배포 직전 로컬 또는 스테이징 환경에서 반드시 다음 항목을 통과해야 합니다.

- [x] **V1 코드 완전 제거**: 모든 API 라우트가 `app/v2` 네임스페이스를 참조하는지 확인.
      0129_실제 서비스 코드(app/, src/) 내 v1 네임스페이스/라우트/핸들러/임포트 등은 모두 제거되어 있고,
      legacy/v1 관련 주석/호환성 코드만 일부 남아 있습니다.
      예시: Legacy redirect, LegacyTokenType, fallback to legacy, V1-style, v1 디자인, v1/v2 공용 등
      일부 라우터/컴포넌트에서 legacy path 리다이렉트, v1 UX/디자인 유지 등 주석/설명
- [x] **KST 09:00 정합성**: 모든 Scheduler 및 Task가 `Asia/Seoul` 타임존을 따르는지 확인.
      tests/v2/test_daily_nudge_service.py에서 09:00 KST 경계, 운영일, 타임존 관련 테스트(운영일 시작, 00:00~09:00 KST  
      경계, business_day_start, today/yesterday 계산 등) 모두 포함
      총 31개 테스트 전부 통과(PASSED)
- [ ] **RBAC 보안**: `SUPERADMIN` 외에는 ROI 및 CSV 임포트 접근권한이 없는지 확인. ?? 
      슈퍼어드민 개념 폐기!! 
      “SUPERADMIN” 개념은 폐기(더 이상 별도의 슈퍼어드민 등급/권한 없음)
      모든 운영/관리 권한은 “ADMIN” 등급(혹은 ADMINUserProfile의 tags 기반)으로 통합·정규화됨
      RBAC 정책은 “ADMIN” 권한 이상만 ROI, CSV 임포트 등 민감 기능 접근 가능(별도 SUPERADMIN 예외 없음)
      체크리스트/런북/문서에 남아있는 “SUPERADMIN” 언급은 과거 정책의 잔재로, 최신 learned_ 기준과 불일치
- [ ] **토큰 만료 정책**: Access(15m), Refresh(30d) 정책이 환경 변수에 설정됨.

---

## 🧪 2. 최소 통합 테스트 세트 (Smoke Tests)

배포 전 아래 테스트 스위트를 실행하여 핵심 비즈니스 로직의 결함을 차단합니다.

### 2.1 백엔드 핵심 (pytest)
```bash
# 1. 아키텍처 및 SoT 준수 확인
pytest -v tests/v2/test_v2_architecture_sot.py

# 2. 인증 및 RBAC 권한 테스트
pytest -v tests/v2/test_telegram_auth.py
pytest -v tests/v2/test_admin_rbac.py

# 3. Golden V2 핵심 로직 (Circuit Breaker, ROI, Rollback)
pytest -v tests/v2/test_roi_rollback_service.py
pytest -v tests/v2/test_daily_nudge_service.py
```

### 2.2 프론트엔드 연동 (E2E)
- [ ] `GET /admin/ops/status`: 시스템 및 Redis 상태 OK 확인.
- [ ] `POST /admin/csv-import/validate`: 표준 로그 CSV 검증 통과 확인.

---

## 📢 3. 배포 통보 및 모니터링

1. **로그 수준**: 배포 초기 24시간 동안은 `LOG_LEVEL=INFO` 유지 권장.
2. **Sentry**: 배포 직후 새로운 Issue가 발생하는지 실시간 모니터링.
3. **Redis Stream**: `golden:v2:events:game` 채널로 실시간 로그가 흐르는지 확인.
   ```bash
   redis-cli monitor | grep "golden:v2:events"
   ```

---

## 🚨 4. 롤백 판단 기준 (Rollback Criteria)

다음 상황 발생 시 즉시 `git checkout <tags>` 및 컨테이너 롤백을 실행합니다.

1. **로그인 불가**: Telegram Auth 또는 Refresh Token 갱신 실패로 유저 진입이 차단될 때.
2. **자산 사고**: 서킷 브레이커(Circuit Breaker)가 발동하지 않고 비정상적인 재화가 지급될 때.
3. **데이터 유실**: DB Migration 실패로 인해 신규 필드에 데이터가 쌓이지 않을 때.
4. **운영일 장애**: 09:00 KST에 미션/스트릭 리셋이 발생하지 않을 때.

---

## 📡 5. 배포 후 정밀 확인 (Post-Deployment Validation)

### 👤 5.1 유저 경험 검증 (User Experience - UX)
유저가 실제 게임 서비스를 이용하는 데 문제가 없는지 직접 테스트합니다.
1. **텔레그램 연동**: 봇 메뉴를 통해 웹앱 진입 시 닉네임과 `cc_id`가 상단에 올바르게 노출되는가?
2. **자산 동기화**: 메인 지갑 잔액이 `locked_balance`와 일치하며, 0.1초 이내로 업데이트되는가?
3. **미션 시작**: 첫 접속 시 '데일리 출석' 미션이 자동으로 시작(In-progress)되는가?

### 🛡️ 5.2 어드민 운영 검증 (Admin Governance - Ops)
운영자가 시스템을 통제하고 지표를 확인하는 데 결함이 없는지 테스트합니다.
1. **RBAC 필터링**: `STAFF` 계정으로 로그인 시 `Circuit Breaker` 설정 페이지 접근이 차단되는가?
2. **ROI 실시간 집계**: 최근 1시간 이내의 로그 데이터가 ROI 대시보드 그래프에 반영되는가?
3. **지급 도구(Admin Tool)**: 유저에게 수동으로 티켓 1장을 지급했을 때, `Intervention Log`에 기록되고 유저 인벤토리에 즉시 반영되는가?
4. **CSV 분석 엔진**: 외부 로그 CSV를 업로드했을 때, 베팅액 집계(GGR)가 소수점 단위 오차 없이 계산되는가?

---
**최종 업데이트**: 2026-01-29
**승인**: CTO / Product Owner
