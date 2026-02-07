문서 타입: SoT (정본)
버전: v2.1
최종 검토일: 2026-02-06
상태: Stable
도메인: user
정합성 상태: 🟡 (일부 필드 모델 동기화 필요)

## 0. SoT 정합성 지표
- **대상 테이블**: `v2_user` (Primary), `hq_prospective_user`, `user`, `v2_user_segment`
- **코드 매핑**: `app/v2/models/user.py`, `app/v2/services/user_service.py`
- **정합성 요약**:
  - 🟢 기초 유저 정보 (cc_id, nickname)
  - 🟢 텔래그램 연동 정보 (telegram_id)
  - 🟢 금고 SoT (vault_locked_balance)
  - 🟡 레벨/XP 시스템 (v2_user 테이블 이관 완료, 운영 정책 확인 중)
  - 🔴 제재 상태 (`benefits_suspended`): DB 필드가 아닌 서비스 계산식으로 존재.

---

## 1. 개요 (Overview)
V2 유저 시스템의 단일 진실 공급원(SoT)으로서, 유저의 핵심 스키마, 권한, 세그먼트 정책 및 운영 리스크 관리 원칙을 정의한다.

## 2. 데이터 모델 매핑 (DB Table: `v2_user`)
| 필드명 | 타입 | 상태 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INT (PK) | 🟢 | 유저 고유 식별자 (Legacy와 1:1 JIT Sync) |
| `cc_id` | VARCHAR(100) | 🟢 | V2 인증 기준, 로그인 PK (UNIQUE) |
| `nickname` | VARCHAR(100) | 🟢 | 운영자 최우선 식별자 (표시 SoT 1순위) |
| `telegram_id` | BIGINT | 🟢 | 숫자 TG ID (tgid: 프리픽스 강제) |
| `vault_locked_balance`| INT | 🟢 | **금고 SoT (단일 원장)** |
| `level` | INT | 🟢 | 유저 레벨 (v2_user 이관 완료) |
| `xp` | INT | 🟢 | 유저 경험치 (v2_user 신규) |
| `status` | ENUM | 🟢 | ACTIVE, INACTIVE, SUSPENDED |
| `role` | ENUM | 🟢 | USER, ADMIN, SUPER_ADMIN |

---

## 3. 핵심 운영 정책

### 3.1 유저 식별 및 동기화
- **JIT Sync**: Legacy ID(PK)를 `v2_user`에 강제 주입하여 1:1 일치를 보장한다. (Same PK 원칙)
- **금고 SoT**: V2 신규 로직은 반드시 `vault_locked_balance`만 사용한다. `vault_balance`, `cash_balance` 등은 Write 금지.

### 3.2 세그먼트 정책 (Segmentation)
- **분류 기준**: NEW(가입 7일), COMMON, VIP, WHALE, AT_RISK.
- **실행 방식**: 배치 프로그램을 통해 일 1회(09:00 KST) 업데이트.
- **주의**: 배치 동기화 누락 시 혜택 오지급 리스크가 있으며, `v2_user_segment` 인덱스 미적용 시 성능 저하 위험이 있다.

### 3.3 제재 정책 (Suspension)
- `benefits_suspended`: 7일간 무입금 시 또는 장기 미활동 유저에 대해 상점/게임/적립을 차단한다.
- 🔴 **주의**: 현재 DB에 물리 필드가 존재하지 않고 서비스 계산식으로만 존재하므로, 운영 시 혼동 주의가 필요하다.

---

## 4. 운영 이슈 및 정합성 리포트

### [실제 장애/운영 사례]
- 유저 PK/UNIQUE 누락으로 인한 중복 가입 및 데이터 유실 사고 발생.
- 09:00 KST 리셋 정책과 자정 기준이 혼용되어 보상 지급 시점 혼란 발생.
- 교환로그 FK 불일치로 인한 정산 오류 사례 존재.

### [정합성 요약]
- 🔴 **충돌**: 09:00 KST 리셋 정책(Mission) vs 자정 기준(Legacy) 혼용.
- 🟡 **검토**: `benefits_suspended`의 DB 필드화 검토 필요.
- 🟢 **정합**: `cc_id` 기반 인증 체계와 세그먼트 우선순위 로직은 정합 완료.

---

## 5. 검증 체크리스트 (QA)
- [ ] 🟢 금고 SoT가 `vault_locked_balance`로만 처리되는지 주기적 점검
- [ ] 🟡 레벨업 보상 지급 시 `v2_user.level` 직접 업데이트 여부 검증
- [ ] 🔴 09:00 KST 리셋 정책이 모든 연관 서비스(Vault, Mission)에 일관 적용되었는지 확인

---

## 6. 변경 이력
- v2.1 (2026-02-06, Antigravity): 사용자의 수동 정리 요청에 따라 누락된 상세 운영 정책 및 리스크 내용 복원 통합.
- v1.0 (2026-01-19, GitHub Copilot): 초기 spec 작성.
