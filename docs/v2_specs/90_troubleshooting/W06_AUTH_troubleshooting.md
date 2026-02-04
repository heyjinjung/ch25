문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: AUTH
상태: 진행 중 ⏳

# W06 AUTH 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) AUTH 리포트](./archive/weekly/W05_AUTH_troubleshooting.md)
- [V2 Telegram Auth SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/auth/v2_telegram_auth_sot_ko.md)

---

## 🔍 주간 이슈 내역

### 02-04 - AUTH: 텔레그램 로그인 시 last_login_at 미업데이트로 활동 유저 카운트 오류 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 통합관제센터 "오늘 활동 유저" 카운트 (GET /api/v2/admin/ops/status) |
| HTTP Status | 200 (Logic Error - 활동 유저가 1명으로만 표시) |
| 영향 범위 | 관리자 통합관제센터 지표/대시보드 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- **DB 증거**: 운영 서버 v2_user 테이블에 총 11명 존재하나 `last_login_at` 값이 있는 유저는 1명(admin)뿐
  ```sql
  SELECT COUNT(*) as total_users, COUNT(last_login_at) as with_login 
  FROM v2_user;
  -- 결과: total_users=11, with_login=1
  ```
- **코드 증거**: `app/v2/api/telegram_routes.py`의 `v2_telegram_auth()` 함수에서:
  - `_create_v2_user()`: 신규 유저 생성 시 `last_login_at` 미설정
  - `_update_v2_user()`: 기존 유저 로그인 시 `last_login_at` 미업데이트
- **로직**: `ops_routes.py:160` 활동 유저 카운트 쿼리가 `V2User.last_login_at >= (utc_now - timedelta(hours=24))` 조건 사용

**해결 방법**
- `_create_v2_user()` 함수에 `last_login_at=datetime.utcnow()` 추가
- `_update_v2_user()` 함수에 `v2_user.last_login_at = datetime.utcnow()` 추가
- 관련 파일: [app/v2/api/telegram_routes.py](../../../app/v2/api/telegram_routes.py#L147-L210)

**검증 방법**
```bash
# 로컬 백엔드 재시작
docker compose restart backend

# 텔레그램 로그인 테스트 후 DB 확인
docker compose exec db mysql -u root -p2026 xmas_event -e \
  "SELECT COUNT(*) as active_24h FROM v2_user WHERE last_login_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);"

# 통합관제센터 API 응답 확인
curl http://localhost:8000/api/v2/admin/ops/status | jq '.metrics.active_users_24h'
```

**🏷️ 태그**
`P1` `AUTH` `TELEGRAM` `DASHBOARD` `METRICS`

---

## 📝 관리 가이드
1. 이슈 발생 시 [README.md](./README.md)의 템플릿에 따라 기록합니다.
2. 해결된 이슈는 검증 결과를 반드시 포함합니다.
3. 반복적인 이슈는 SoT 승격 대상으로 분류합니다.
