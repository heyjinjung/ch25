문서 타입: SoT (DB 통합)
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/운영
상태: Stable
도메인: VAULT

## 1. 목적
- 금고 관련 DB 스키마 SoT를 통합한다.
- 잔액, 원장, 출금, 상점, 입금 연동 테이블의 기준을 고정한다.
- 운영 및 감사 대응을 위한 데이터 흐름과 제약조건을 명시한다.

## 2. 범위
- 핵심 테이블: user, v2_user, vault_ledger, vault_earn_event
- 출금: vault_withdrawal_request
- 입금: v2_external_cc_data, v2_cc_deposit_log
- 상점: v2_shop_order
- 지출: v2_spending_ledger
- 참조 로그: v2_game_log, v2_dice_log, v2_roulette_log, v2_lottery_log

## 3. SoT 우선순위 및 근거
- 2026-02-06 v2_sot_vault_ko.md
- 2026-02-04 VaultLedger 우회 수정 및 보상 적립 정합
- 2026-01-28 잔액 동기화
- 2026-01-19 CC 입금 SoT

## 4. 금고 잔액 SoT 컬럼
### 4.1 user
- user.vault_locked_balance: 금고 잔액 SoT
- user.vault_spent_today: 당일 사용 금액
- user.vault_spent_total: 누적 사용 금액
- user.vault_spent_reset_date: 운영일 리셋 기준

### 4.2 v2_user
- v2_user.vault_locked_balance: V2 동기화 잔액
- 동기화는 사건 발생 시 즉시 수행한다.

## 5. 원장 테이블
### 5.1 vault_ledger
- 금고 잔액 변경 단일 원장
- amount, balance_after, reason, ref_type 필수
- 직접 잔액 수정은 금지이며 원장 기록이 반드시 남아야 한다.
- ref_type 예시: ADMIN, SHOP, REWARD, ROLLBACK

### 5.2 vault_earn_event
- 게임, 입금, 보상 적립 이벤트 기록
- VaultLedger와의 정합성 유지가 필요하다.
- 보상 적립 경로는 VaultLedger 기록 누락 금지

### 5.3 v2_spending_ledger
- 지출 원장 단일 소스
- HQ_W, VAULT_W, SHOP_U 등 소스 구분
- 출금 승인 및 상점 소비와 정합성을 유지한다.

## 6. 출금 테이블
### 6.1 vault_withdrawal_request
- 출금 신청 상태 관리
- 회차별 최소 금액 정책 검증에 사용
- status: PENDING, APPROVED, REJECTED
- 운영일 및 세그먼트 조건과 함께 검증한다.

## 7. CC 입금 연동 테이블
### 7.1 v2_external_cc_data
- 외부 누적 스냅샷 저장
- total_deposit, total_play, last_synced_at
- KST 기준 기록
- cc_id는 외부 식별자 기준

### 7.2 v2_cc_deposit_log
- delta 발생 시 로그 기록
- prev_total, new_total, delta_amount 기록
- vault_event_id와 연동

## 8. 상점 테이블
### 8.1 v2_shop_order
- 상점 구매 로그
- cost_type, cost_amount, reward_type, reward_amount
- 금고 차감과 원장 기록은 동시 수행되어야 한다.
- idempotency 키 정책을 적용한다.

## 9. 로그 및 관측 테이블
- v2_game_log: 전체 게임 로그
- v2_dice_log, v2_roulette_log, v2_lottery_log: 게임별 로그
- 최근 3일 플레이 조건 산정에 사용된다.

## 10. 제약조건 및 일관성
- user.vault_locked_balance는 NOT NULL 권장
- amount 컬럼은 정수, 음수 허용(차감)
- 시간 컬럼은 UTC 저장 후 KST 변환 반환
- FK 제약은 성능과 운영 정책을 고려해 조정한다.

## 11. 인덱스 및 성능 기준
- vault_ledger: user_id, created_at 인덱스 권장
- v2_spending_ledger: user_id, created_at 인덱스 권장
- vault_withdrawal_request: user_id, status 인덱스 권장

## 12. 운영일 리셋
- 09:00 KST 기준으로 vault_spent_today 리셋
- 리셋 기준은 DB 컬럼(vault_spent_reset_date)로 추적
- 리셋 실패 시 운영 리포트에 경고 기록

## 13. 정합성 체크리스트
- vault_ledger와 user 잔액의 차이 없음
- v2_user 동기화 누락 없음
- v2_cc_deposit_log와 vault_event_id 연동 유지
- v2_spending_ledger 기록 누락 없음
- v2_shop_order와 VaultLedger 동시 기록 확인

## 14. 위험 포인트
- 레거시 available balance 잔존 데이터
- VaultLedger 기록 누락 경로
- Admin 집계에서 locked+available 합산
- CC 입금 감소 payload 유입

## 15. 권장 쿼리
- non-zero available
  - SELECT COUNT(*) FROM user WHERE COALESCE(vault_available_balance,0) != 0;
- 최신 원장
  - SELECT id, user_id, amount, balance_after FROM vault_ledger ORDER BY id DESC LIMIT 10;
- 지출 원장 분포
  - SELECT ref_type, COUNT(*) FROM v2_spending_ledger GROUP BY ref_type;

## 16. 백업/스냅샷
- 스냅샷은 운영일 기준으로 저장
- DB 스냅샷 문서는 db_snapshots.md에 기록
- 스냅샷은 사용자 식별 정보 마스킹 원칙을 따른다.

## 17. 마이그레이션 유의사항
- alembic 체인 끊김 여부 확인
- legacy purge 이후 레거시 모델 참조 금지
- 다운리비전 수정 이력은 운영 로그에 기록

## 18. 테이블 상세 정의
### 18.1 user
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 유저 식별자 |
| vault_locked_balance | INT | NOT NULL | 금고 잔액 SoT |
| vault_spent_today | INT | NOT NULL | 당일 사용 금액 |
| vault_spent_total | INT | NOT NULL | 누적 사용 금액 |
| vault_spent_reset_date | DATE | NULL | 운영일 리셋 기준 |

### 18.2 v2_user
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | V2 유저 식별자 |
| vault_locked_balance | INT | NOT NULL | V2 동기화 잔액 |
| cc_id | VARCHAR | UNIQUE | 외부 식별자 |

### 18.3 vault_ledger
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 원장 ID |
| user_id | INT | FK | 유저 ID |
| amount | INT | NOT NULL | 증감액 |
| balance_after | INT | NOT NULL | 변경 후 잔액 |
| ref_type | VARCHAR | NOT NULL | 변경 유형 |
| reason | VARCHAR | NULL | 사유 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

### 18.4 vault_withdrawal_request
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 요청 ID |
| user_id | INT | FK | 유저 ID |
| amount | INT | NOT NULL | 출금 금액 |
| status | VARCHAR | NOT NULL | 요청 상태 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

### 18.5 v2_external_cc_data
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 스냅샷 ID |
| user_id | INT | FK | V2 유저 ID |
| cc_id | VARCHAR | INDEX | 외부 식별자 |
| total_deposit | BIGINT | NOT NULL | 누적 입금 |
| last_synced_at | DATETIME | NOT NULL | 동기화 시각 |

### 18.6 v2_cc_deposit_log
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 로그 ID |
| user_id | INT | FK | 유저 ID |
| delta_amount | INT | NOT NULL | 순증분 |
| prev_total | BIGINT | NOT NULL | 이전 누적 |
| new_total | BIGINT | NOT NULL | 신규 누적 |
| vault_event_id | INT | FK | 원장 이벤트 |

### 18.7 v2_shop_order
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 주문 ID |
| user_id | INT | FK | 유저 ID |
| sku | VARCHAR | NOT NULL | 상품 코드 |
| cost_type | VARCHAR | NOT NULL | 비용 타입 |
| cost_amount | INT | NOT NULL | 비용 금액 |
| reward_type | VARCHAR | NOT NULL | 보상 타입 |
| reward_amount | INT | NOT NULL | 보상 수량 |

### 18.8 v2_spending_ledger
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INT | PK | 지출 원장 ID |
| user_id | INT | FK | 유저 ID |
| amount | INT | NOT NULL | 지출 금액 |
| ref_type | VARCHAR | NOT NULL | 지출 유형 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 19. 데이터 정합성 규칙
- VaultLedger와 user 잔액은 1:1 대응한다.
- v2_shop_order 생성 시 VaultLedger 기록이 동반되어야 한다.
- v2_cc_deposit_log는 vault_event_id를 반드시 포함한다.
- v2_spending_ledger는 출금 승인과 상점 소비를 모두 기록한다.

## 20. 접근 패턴 및 쿼리 정책
- Admin 조회는 최신 90일 기준을 기본으로 한다.
- 원장 조회는 user_id+created_at 인덱스 사용을 권장한다.
- 집계 쿼리는 locked 단일 기준을 사용한다.

## 21. 데이터 보존 정책
- 원장 로그는 삭제하지 않는다.
- 운영 보고용 스냅샷은 월 단위로 백업한다.
- 개인정보 마스킹 규칙을 준수한다.

## 22. 변경 이력
- v1.1 (2026-02-07, GitHub Copilot): DB 구조 및 제약 확장
- v1.0 (2026-02-07, GitHub Copilot): 분산 DB SoT 통합
