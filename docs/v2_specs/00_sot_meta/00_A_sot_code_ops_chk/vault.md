[최종 검토일: 2026-01-26]
정책 최신화 필요 여부: 🟡 일부 최신화 필요 (표현/경로/타입 불일치 확인됨)

## 정책 정합성/충돌 처리 원칙
- SoT-코드-운영-DB-프론트 매핑에서 부정합/충돌 발견 시 아래와 같이 명시:
  - 🔴 [정책/구현 충돌]: 구체적 내용, 우선 기준, 임시 조치/추후 액션 명시
  - 🟡 [정합성 검토 필요]: 불일치/불명확/운영상 임시 허용 등
- 근거/판단 기준(SoT/코드/운영/DB/프론트 우선 등) 및 작성일/정책 문서/운영 사례 등 명확히 기입
- 즉시 수정 불가 시 "임시 예외", "운영상 임시 허용", "추후 일괄 정비 필요" 등 TODO로 남김
- 자동화/운영 체크리스트에 해당 부정합이 감지되도록 추가
- 실제 장애/오류/운영 리스크 시 "운영자 주의", "긴급 패치 필요", "QA 우선 검증" 등 강조

## 자동화/운영 체크리스트 & TODO
- [ ] SoT-코드-운영-DB-프론트 매핑 1:1 정합성 검증 자동화 필요
- [ ] FK/UNIQUE/ENUM/9AM 리셋 등 정책 제약조건 자동 점검
- [ ] 실시간 상태(금고/락/잔액) 점검 및 운영자 알림 연동
- [ ] 정책/구현/운영 불일치 발견 시 즉시 표기 및 TODO/임시 예외 명시
- [ ] 최신 정책/운영 사례 반영 주기적 검토(작성일/최종 검토일 갱신)
#
...existing code...
# Vault 영역 SoT-코드-운영-DB-프론트 매핑 표 (관리자 친화형)

## 1. 금고 정책/핵심 Enum/상수/제약조건

### [A] 주요 DB 컬럼/제약조건/Enum
| DB 테이블/컬럼                | 제약조건/Enum/설명                                   | 정책/코드/프론트 매핑 필드명         | 비고 |
|-------------------------------|------------------------------------------------------|--------------------------------------|------|
| user.vault_locked_balance     | INT, NOT NULL                                        | 금고 정책, 금고잔액                  | SoT 기준값 🟡 [정합성 검토 필요: 모델/DB 문서 기준 Integer] |
| user.id                       | PK, UNIQUE                                           | user_id                              | FK 참조시 주의 |
| vault_earn_event.user_id      | FK(user.id)                                          | user_id                              | FK 제약조건 |
| vault_withdrawal_request.user_id | FK(user.id)                                       | user_id                              | FK 제약조건 |
| (기타 FK/UNIQUE/ENUM)         | (각 테이블별로 명시)                                 |                                      |      |

### [B] 프론트-백엔드-DB-코드-정책 1:1 매핑 구조
| 정책/문서           | 실제 코드/Enum/상수         | DB 컬럼/제약조건                | 프론트 필드명         | 비고 |
|---------------------|-----------------------------|----------------------------------|----------------------|------|
| v2_strict_vault_policy_sot_ko.md | VAULT_LOCKED, RewardType.POINT | user.vault_locked_balance | vault_locked_balance | Enum/케이스 일치 필수 |

---

## 2. 금고 정책
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 금고 정책 | v2_strict_vault_policy_sot_ko.md | "금고=DB user.vault_locked_balance만 유효, 금고포인트만 인정, 출금/입금 정책, 금고 이중계산 금지" | app/v2/services/vault_service.py | /api/v2/vault/*, test_vault_*.py | | | ✅ 이관 | /vault | 금고 | 2026-01-26 | ✅ 완료 🔴 [정책/구현 충돌] | 금고 합산 금지 정책과 달리 일부 구현에서 `locked+available` 합산 사용 흔적(예: app/services/admin_dashboard_service.py). TODO: 대시보드 합산 로직 SoT 기준으로 점검 |

## 2. 금고 DB/정합성
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 금고 DB | v2_vault_glossary_sot_ko.md | "DB: user.vault_locked_balance, 금고잔액=최종 자산, 금고 로그: vault_earn_event, vault_withdrawal_request" | app/models/vault_earn_event.py, app/models/vault_withdrawal_request.py | DB: user.vault_locked_balance | | | | | | 2026-01-26 | 🟡 [정합성 검토 필요] | `app/v2/models/vault.py` 경로는 미존재(대체 경로 상기). 정책/문서 기준의 “금고 로그 테이블”과 실제 모델 매핑을 1회 정리 필요 |

## 3. 금고 상수/Enum
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 금고 상수/Enum | v2_strict_vault_policy_sot_ko.md | "상수: VAULT_LOCKED, Enum: RewardType.POINT, 필드: vault_locked_balance, vault_spent_total" | app/v2/services/vault_service.py | DB: user.vault_locked_balance | | | | | | | | |

---

## 9. 정합성 검증 요약 리포트 (2026-01-26)

- 🟢 1차(01_core): 정책(단일 SoT, 합산 금지, 혜택중단/한도) 자체는 일관적
- 🟡 2차(03_api): Admin API 프리픽스(`/admin/api` vs `/api/v2/admin`) 및 에러코드/필드 표기(available 노출) 혼재 → “표현 SoT” 정리 필요
- 🔴 3차(04_db/05_ops/06_design): Ops 문서에 **레거시 잔액 사용처럼 읽히는 문구** 존재(즉시 정정 필요), DB/프론트/운영 매핑은 대체로 일관하지만 문서 간 표현 드리프트가 운영 리스크

