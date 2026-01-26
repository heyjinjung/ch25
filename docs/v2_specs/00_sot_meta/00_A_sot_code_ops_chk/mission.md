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
- [ ] FK/UNIQUE/ENUM/미션 정책 등 제약조건 자동 점검
- [ ] 미션/스트릭/보상 실시간 점검 및 운영자 알림 연동
- [ ] 정책/구현/운영 불일치 발견 시 즉시 표기 및 TODO/임시 예외 명시
- [ ] 최신 정책/운영 사례 반영 주기적 검토(작성일/최종 검토일 갱신)
#
...existing code...
# Mission/Attendance 영역 SoT-코드-운영-DB-프론트 매핑 표 (관리자 친화형)

## 1. 미션/스트릭 정책/핵심 Enum/상수/제약조건

### [A] 주요 DB 컬럼/제약조건/Enum
| DB 테이블/컬럼                | 제약조건/Enum/설명                                   | 정책/코드/프론트 매핑 필드명         | 비고 |
|-------------------------------|------------------------------------------------------|--------------------------------------|------|
| user.id                       | PK, UNIQUE                                           | user_id                              | FK 참조시 주의, 공통 PK |
| v2_user.cc_id                 | UNIQUE, NOT NULL                                     | cc_id                                | V2 인증 기준, 로그인 PK |
| user.external_id              | UNIQUE, NOT NULL                                     | external_id                          | 레거시 인증 기준 |
| mission_progress.user_id      | FK(user.id)                                          | user_id                              | FK 제약조건, 인증 연동 주의 |
| user_mission_streak.user_id   | FK(user.id)                                          | user_id                              | FK 제약조건 |
| user_mission.mission_id       | PK, UNIQUE                                           | mission_id                           |      |
| user_mission_streak.streak_id | PK, UNIQUE                                           | streak_id                            |      |
| user_mission.mission_type     | ENUM(MissionType)                                    | MissionType, mission_type            | Enum/케이스 주의 |
| user_mission_streak.streak_type| ENUM(StreakType)                                    | StreakType, streak_type              | Enum/케이스 주의 |
| (기타 FK/UNIQUE/ENUM)         | (각 테이블별로 명시)                                 |                                      |      |

### [B] 미션/유저 연동 구조 요약
| 역할/구분         | 실제 DB 컬럼/정책 | 인증/미션 연동 기준 | 비고 |
|-------------------|-------------------|--------------------|------|
| 공통 PK           | user.id           | 모든 FK/PK 기준    | 미션/레거시 공통 |
| V2 인증 PK        | v2_user.cc_id     | V2 로그인/인증     | 미션 연동시 매핑 필요 |
| 레거시 인증 PK    | user.external_id  | 레거시 인증        | 일부 연동/마이그레이션 주의 |
| 미션 진행 FK      | mission_progress.user_id | 미션 진행/기록 | FK(user.id) 기준, 인증 연동 주의 |

### [C] 프론트-백엔드-DB-코드-정책 1:1 매핑 구조
| 정책/문서           | 실제 코드/Enum/상수         | DB 컬럼/제약조건                | 프론트 필드명         | 비고 |
|---------------------|-----------------------------|----------------------------------|----------------------|------|
| v2_mission_glossary_sot_ko.md | MissionType, StreakType, MISSION_TYPE_DAILY | user_mission.mission_type, user_mission_streak.streak_type | mission_type, streak_type | Enum/케이스 일치 필수 |

---

## 2. 미션 정책
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 미션 정책 | v2_mission_glossary_sot_ko.md | "미션=DB user_mission, 미션상태/보상/클레임 정책, 미션 단독/스트릭 연동, 수동 클레임" | app/v2/services/mission_service.py | /api/v2/mission/*, test_mission_*.py | | | ✅ 이관 | /missions | 미션 | 2026-01-26 | ✅ 완료 | test_v2_mission_service.py 완료 |

## 2. 스트릭 정책/DB
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 스트릭 정책 | v2_streak_policy_sot_ko.md | "DB: user_mission_streak, 스트릭=연속 출석/미션, 보상: 수동 클레임, 필드: claimable_day" | app/v2/services/streak_service.py | DB: user_mission_streak | | | | | | | | |

## 3. 미션/스트릭 상수/Enum
| 구분 | SoT 문서/정책/스키마 | SoT 한글 설명/핵심값/상수/필드 | 실제 코드/핵심 파일 | 운영 상태/테스트/DB/엔드포인트 | DB 적용값 | V1 폐기 | V2 이관 | FE 라우팅 | FE 표시값 | 최신화 일자 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 미션/스트릭 상수/Enum | v2_mission_glossary_sot_ko.md | "상수: MISSION_TYPE_DAILY, Enum: MissionType, StreakType, 필드: mission_id, streak_count, claimable_day" | app/v2/services/mission_service.py | DB: user_mission, user_mission_streak | | | | | | | | |
