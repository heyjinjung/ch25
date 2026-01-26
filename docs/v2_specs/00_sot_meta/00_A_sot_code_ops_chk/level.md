[최종 검토일: 2026-01-26]
정책 최신화 필요 여부: 🟢 최신 (2026-01-26 기준)

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
- [ ] FK/UNIQUE/ENUM/레벨 정책 등 제약조건 자동 점검
- [ ] 레벨/XP/세그먼트 실시간 점검 및 운영자 알림 연동
- [ ] 정책/구현/운영 불일치 발견 시 즉시 표기 및 TODO/임시 예외 명시
- [ ] 최신 정책/운영 사례 반영 주기적 검토(작성일/최종 검토일 갱신)
#
...existing code...
# Level(레벨/레벨포인트) 영역 SoT-코드-운영-DB-프론트 매핑 표 (관리자 친화형)

## 1. 레벨/레벨포인트 정책/핵심 Enum/상수/제약조건

### [A] 주요 DB 컬럼/제약조건/Enum
| DB 테이블/컬럼                | 제약조건/Enum/설명                                   | 정책/코드/프론트 매핑 필드명         | 비고 |
|-------------------------------|------------------------------------------------------|--------------------------------------|------|
| user_level_progress.xp        | INT, NOT NULL                                        | level_point, GAME_XP                 | 레벨포인트 보유량 |
| user_xp_event_log.delta       | INT, NOT NULL                                        | level_point_delta                    | 레벨포인트 변동 로그 |
| user_level_reward_log.reward_type | ENUM(RewardType)                                 | level_point_reward_type              | 레벨 보상 타입 |
| (기타 FK/UNIQUE/ENUM)         | (각 테이블별로 명시)                                 |                                      |      |

### [B] 프론트-백엔드-DB-코드-정책 1:1 매핑 구조
| 정책/문서           | 실제 코드/Enum/상수         | DB 컬럼/제약조건                | 프론트 필드명         | 비고 |
|---------------------|-----------------------------|----------------------------------|----------------------|------|
| v2_level_point_sot_ko.md | level_point, GAME_XP | user_level_progress.xp | level_point, xp | 단일 기준 |
| v2_level_point_storage_sot_ko.md | level_point_delta | user_xp_event_log.delta | delta | 변동 로그 |
| v2_level_reward_table_sot_ko.md | level_point_reward_type, RewardType | user_level_reward_log.reward_type | reward_type | 보상 타입 |
| v2_level_point_extension_sot_ko.md | (확장: CC/게임별) | (확장: 정책 적용시 추가) |  | CC/게임별 확장 |

---

## 2. 레벨/레벨포인트 정책/DB/정합성/상수/Enum (운영 매핑 표)
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 레벨포인트 정책 | v2_level_point_sot_ko.md | "레벨포인트=GAME_XP, 금고포인트와 무관, 오직 GAME_XP로만 적립" | app/v2/models/level.py | /api/v2/level/*, test_level_*.py | | | ✅ 이관 | /level | 레벨 | 2026-01-26 | ✅ 완료 | level_reward_table_20260126.md 기준 |
| 레벨포인트 저장 | v2_level_point_storage_sot_ko.md | "user_level_progress.xp, user_xp_event_log.delta, user_level_reward_log.reward_type" | app/v2/models/level.py | DB: user_level_progress, user_xp_event_log, user_level_reward_log | | | ✅ 이관 | | | 2026-01-26 | ✅ 완료 | |
| 레벨 보상표 | v2_level_reward_table_sot_ko.md | "레벨 1~20, 필요 XP/보상, 티켓 용어 일관성, CC 입금 적립 규칙" | app/v2/models/level.py | DB: user_level_progress, user_level_reward_log | | | ✅ 이관 | | | 2026-01-26 | ✅ 완료 | Phase 5 E2E 로그 확인 |
| 레벨포인트 확장 | v2_level_point_extension_sot_ko.md | "룰렛/주사위/복권/CC별 확장, CC 입금 10만당 20포인트 적립, 게임별 미구현" | app/v2/models/level.py | 정책: CC/게임별 확장 | | | ✅ 이관 | | | 2026-01-26 | ✅ 완료 | CC Deposit 10만당 20XP 적용 |

<!-- 각 표에 FK/UNIQUE/ENUM 제약조건, 프론트-백엔드-DB-코드-정책 1:1 매핑 구조가 명확히 드러나도록 작성, 최신화/검증 결과/비고는 수동 또는 자동화 스크립트로 채움 -->
