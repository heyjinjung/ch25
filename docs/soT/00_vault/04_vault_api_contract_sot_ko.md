문서 타입: SoT (API 계약 통합)
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/QA
상태: Stable
도메인: VAULT

## 1. 목적
- 금고 관련 API 계약 SoT를 통합한다.
- 응답 필드 정규화와 경로 표준화를 명시한다.
- 정책 표현과 구현 불일치를 최소화한다.

## 2. 범위
- 유저 Vault API
- Admin Vault Ops API
- Ticket Zero 연동
- 공통 에러코드 및 응답 규칙

## 3. 경로 표준
- V2 표준 프리픽스: /api/v2
- Admin 표준 프리픽스: /api/v2/admin
- 레거시 프리픽스는 문서 기준에서 제외한다.

## 4. 유저 Vault API
### 4.1 GET /api/v2/vault/status
- 목적: 금고 상태 및 출금 조건 조회
- 핵심 필드:
  - vaultBalance (locked 단일 기준)
  - lockedBalance
  - availableBalance (0 고정 또는 미사용)
  - daily_vault_spent
  - daily_play_count, daily_play_target
  - daily_deposit_confirmed
  - benefits_suspended
  - vault_max_limit
  - withdrawal_count

### 4.2 POST /api/v2/vault/withdraw
- 목적: 출금 신청
- 요청:
  - amount
  - protocol_key (선택)
- 응답:
  - request_id
  - status
  - amount
  - balance_after

### 4.3 응답 예시
{
  "vaultBalance": 12000,
  "lockedBalance": 12000,
  "availableBalance": 0,
  "daily_vault_spent": 5000,
  "daily_play_count": 12,
  "daily_play_target": 15,
  "daily_deposit_confirmed": true,
  "benefits_suspended": false,
  "vault_max_limit": 0,
  "withdrawal_count": 1
}

## 5. Admin Vault Ops API
### 5.1 GET /api/v2/admin/vault/stats
- 목적: 금고 통계
- 주의: locked 단일 기준으로 집계한다.

### 5.2 GET /api/v2/admin/vault/users
- 목적: 금고 유저 목록
- vaultBalance는 locked 단일 기준으로 반환한다.

### 5.3 GET /api/v2/admin/vault/users/{user_id}/ledger
- 목적: 금고 원장 조회
- ref_type 분포를 운영 지표로 사용한다.

### 5.4 POST /api/v2/admin/vault/force-edit
- 목적: 강제 조정
- VaultLedger 기록 필수
- reason 필수 입력

### 5.5 Withdrawals
- GET /api/v2/admin/vault/withdrawals/{status}
- POST /api/v2/admin/vault/withdrawals/{id}/approve
- POST /api/v2/admin/vault/withdrawals/{id}/reject

## 6. Ticket Zero API
### 6.1 GET /api/v2/ticket-zero/status
- bailout_available 반환

### 6.2 POST /api/v2/ticket-zero/bailout
- granted, ticket_type, ticket_amount 반환

## 7. 필드 정규화 규칙
- 응답은 snake/camel 혼재 금지
- 프론트는 fallback 로직으로 안전 처리
- 금고 관련 필드는 locked 단일 기준으로 정규화한다.

## 8. 에러 코드
- BENEFITS_SUSPENDED: 제재 차단
- VAULT_INSUFFICIENT_FUNDS: 잔액 부족
- DEPOSIT_REQUIRED: 입금 필요
- VALIDATION_ERROR: 요청 파라미터 오류

## 9. 정책-표현 정합성 규칙
- UI 문구는 최근 3일/오늘 사용/당일 입금 기준을 명시한다.
- availableBalance는 0 고정 또는 미사용으로 명시한다.
- vaultBalance는 locked 단일 기준으로 정의한다.

## 10. 정합성 체크리스트
- vaultBalance가 locked 단일 기준인지 확인
- availableBalance 노출 정책 명시
- Admin 경로가 /api/v2/admin으로 통일되었는지 확인
- withdraw 응답 필드가 일관되게 전달되는지 확인

## 11. 필드 정의 표
| 필드 | 타입 | 설명 |
| --- | --- | --- |
| vaultBalance | INT | 금고 잔액(locked 단일 기준) |
| lockedBalance | INT | locked 잔액 |
| availableBalance | INT | 0 고정 또는 미사용 |
| daily_vault_spent | INT | 오늘 사용 금액 |
| daily_play_count | INT | 최근 3일 플레이 누적 |
| daily_play_target | INT | 세그먼트 목표치 |
| daily_deposit_confirmed | BOOL | 당일 입금 충족 여부 |
| benefits_suspended | BOOL | 혜택 중단 여부 |
| vault_max_limit | INT | 금고 한도 |
| withdrawal_count | INT | 출금 회차 |

## 12. Admin 응답 규칙
- Admin 목록과 통계는 locked 단일 기준으로 집계한다.
- 강제 조정은 반드시 reason을 포함한다.
- 원장 조회는 최신순 정렬을 기본으로 한다.

## 13. 보안 및 권한
- 유저 API는 access token 필수
- Admin API는 관리자 토큰 필수
- 잘못된 토큰은 401 또는 403 반환

## 14. 레이트 리밋 가이드
- 출금 요청은 사용자 기준 제한을 둔다.
- 반복 실패 요청은 로그로 남긴다.

## 15. deprecation 정책
- 레거시 경로는 301/307 또는 프록시 처리 후 로그를 남긴다.
- 신규 기능은 /api/v2/admin 경로만 사용한다.

## 16. 엔드포인트 매트릭스
| 구분 | 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- | --- |
| User | GET | /api/v2/vault/status | User Token | 금고 상태 조회 |
| User | POST | /api/v2/vault/withdraw | User Token | 출금 신청 |
| Admin | GET | /api/v2/admin/vault/stats | Admin Token | 금고 통계 |
| Admin | GET | /api/v2/admin/vault/users | Admin Token | 유저 목록 |
| Admin | GET | /api/v2/admin/vault/users/{user_id}/ledger | Admin Token | 원장 조회 |
| Admin | POST | /api/v2/admin/vault/force-edit | Admin Token | 강제 조정 |
| Admin | GET | /api/v2/admin/vault/withdrawals/{status} | Admin Token | 출금 목록 |
| Admin | POST | /api/v2/admin/vault/withdrawals/{id}/approve | Admin Token | 출금 승인 |
| Admin | POST | /api/v2/admin/vault/withdrawals/{id}/reject | Admin Token | 출금 반려 |
| User | GET | /api/v2/ticket-zero/status | User Token | 구조 가능 여부 |
| User | POST | /api/v2/ticket-zero/bailout | User Token | 구조 요청 |

## 17. 공통 응답 규칙
- 성공 응답은 HTTP 200을 기본으로 한다.
- 실패 응답은 error code와 메시지를 포함한다.
- Admin 응답은 audit log 기록을 동반한다.

## 18. 변경 이력
- v1.1 (2026-02-07, GitHub Copilot): API 계약 상세 확장
- v1.0 (2026-02-07, GitHub Copilot): API 계약 SoT 통합
