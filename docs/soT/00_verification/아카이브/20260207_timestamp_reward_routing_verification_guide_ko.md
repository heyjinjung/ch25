문서 타입: 검증 가이드
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/OPS/QA
상태: Draft

## 1. 목적
최근 변경사항의 잠재 충돌 포인트에 대해 재현 가능한 기술 검증 절차를 제공한다.

## 2. 범위
- 타임스탬프 정합성(ORM 기본값 vs DB server_default)
- 상점 보상 라우팅(BUNDLE/TICKET_BUNDLE)
- Telegram unlink 관계(V2User FK 전환)
- 게임 로그 컬럼 추가(created_at/updated_at)
- Golden 개입 상태 기본값(PENDING_APPROVAL)

## 3. 사전 조건
- DB 접속 권한(로컬/스테이징/운영 중 최소 1개)
- Alembic 최신 적용 여부 확인
- 변경된 서비스/모델이 배포된 환경

## 4. 타임스탬프 정합성 검증
### 4.1 목적
ORM 기본값은 KST로 맞추었으나 DB server_default는 DB 서버 타임존에 의존한다. 저장 시각이 KST 기준과 일치하는지 검증한다.

### 4.2 검증 절차
1) DB 타임존 확인
```sql
SELECT @@global.time_zone AS global_tz, @@session.time_zone AS session_tz;
```

2) DB 기본값 동작 확인
```sql
INSERT INTO v2_golden_intervention_log (user_id, trigger_id, action_taken)
VALUES (1, 'TRG_TEST', 'TEST_ACTION');

SELECT created_at FROM v2_golden_intervention_log
WHERE trigger_id='TRG_TEST'
ORDER BY id DESC LIMIT 1;
```

3) 애플리케이션 레벨 시각과 비교
- 동일 시각에 ORM으로 생성된 레코드의 created_at와 비교한다.
- KST 기준으로 1분 이상 차이가 나면 타임존 불일치로 판단.

### 4.3 판단 기준
- ✅ KST 기준 동기화
- 🔴 DB 타임존이 UTC 등으로 설정되어 KST와 오프셋 불일치

## 5. 상점 보상 라우팅 검증
### 5.1 목적
`BUNDLE/TICKET_BUNDLE` 보상은 reward_amount에 따라 `V2RewardService.deliver` 분기가 달라진다. SKU 설정과 지급 구성이 일치하는지 확인한다.

### 5.2 검증 절차
1) 테스트 SKU 목록 확인
- reward_type: BUNDLE/TICKET_BUNDLE
- reward_amount 값 분포 수집

2) 지급 결과 확인
```sql
SELECT id, user_id, sku, reward_type, reward_amount, created_at
FROM v2_shop_order
ORDER BY id DESC LIMIT 10;
```

3) 지급 내역 확인 (Wallet/Inventory/Vault)
```sql
SELECT * FROM user_game_wallet WHERE user_id=1;
SELECT * FROM user_inventory_item WHERE user_id=1;
SELECT vault_locked_balance FROM user WHERE id=1;
```

### 5.3 판단 기준
- ✅ reward_amount 분기와 실제 지급이 일치
- 🔴 reward_amount가 의도와 다르게 설정되어 지급 구성이 불일치

## 6. Telegram unlink 관계 검증
### 6.1 목적
`telegram_unlink_request`는 V2User FK 기준으로 조회되어야 한다. 레거시 User 기반 로직이 남아 있으면 조회 실패 가능성이 있다.

### 6.2 검증 절차
1) 요청 데이터가 V2User와 정상 조인되는지 확인
```sql
SELECT r.id, r.telegram_id, r.current_user_id, v2.cc_id
FROM telegram_unlink_request r
LEFT JOIN v2_user v2 ON r.current_user_id = v2.id
ORDER BY r.id DESC LIMIT 10;
```

2) API/서비스 호출 경로 확인
- 레거시 User 기반 조회가 있는지 확인한다.

### 6.3 판단 기준
- ✅ V2User 기준 정상 조인
- 🔴 레거시 User 기준 조회로 NULL 반환 발생

## 7. 게임 로그 컬럼 추가 영향 검증
### 7.1 목적
`v2_game_log.created_at/updated_at` 추가로 인해 명시적 컬럼 INSERT가 실패할 수 있다.

### 7.2 검증 절차
1) 컬럼 존재 확인
```sql
SHOW COLUMNS FROM v2_game_log;
```

2) 명시적 컬럼 INSERT 확인
- CSV 로더/스크립트가 컬럼 리스트를 명시하는지 확인한다.

3) 최신 반입 레코드 확인
```sql
SELECT id, recorded_at, created_at, updated_at
FROM v2_game_log
ORDER BY id DESC LIMIT 5;
```

### 7.3 판단 기준
- ✅ created_at/updated_at 자동 채움
- 🔴 명시 컬럼 INSERT로 에러 발생

## 8. Golden 개입 상태 기본값 검증
### 8.1 목적
`v2_golden_intervention_log.status` 기본값이 `PENDING_APPROVAL`로 변경되었다. 승인 없는 자동 발송 플로우가 남아있으면 누락 상태가 발생한다.

### 8.2 검증 절차
1) 자동 개입 발생 시 상태 확인
```sql
SELECT id, trigger_id, status, created_at
FROM v2_golden_intervention_log
ORDER BY id DESC LIMIT 10;
```

2) 승인/거절 API 처리 여부 확인
- 승인 처리 후 `SENT` 전환 여부 확인

### 8.3 판단 기준
- ✅ 기본값 PENDING_APPROVAL 유지 및 승인 후 SENT 전환
- 🔴 승인 로직 미적용으로 PENDING 상태 누적

## 9. 운영 점검 체크리스트
- [ ] DB 타임존이 KST인지 확인
- [ ] reward_amount 분기와 실제 지급 구성 일치 확인
- [ ] telegram_unlink_request가 V2User 기준으로 조회됨
- [ ] v2_game_log created_at/updated_at 자동 생성 확인
- [ ] Golden 개입 승인 플로우 상태 전환 확인

## 10. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 최초 작성
