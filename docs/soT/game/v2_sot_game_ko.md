문서 타입: SoT (정본)
버전: v2.1
최종 검토일: 2026-02-06
상태: Stable
도메인: game
정합성 상태: 🟢 (V2GameLog 모델 및 CSV 명세 일치)

## 0. SoT 정합성 지표
- **대상 테이블**: `v2_game_log`, `v2_golden_intervention_log`
- **코드 매핑**: `app/v2/models/v2_game_log.py`, `app/v2/services/csv_import_service.py`
- **정합성 요약**:
  - 🟢 외부 게임 로그 통합 구조 (V2GameLog)
  - 🟢 CSV Import 포맷 및 컬럼 정의 일치
  - 🟢 실시간 개입(Intervention) 워커 연동 흐름 확인

---

## 1. 개요 (Overview)
외부 카지노 및 내부 엔진에서 발생하는 모든 게임 결과 로그의 표준을 정의한다. 이 데이터는 실시간 수익 분석 및 유저 개입(Golden Time)의 핵심 근거가 된다.

## 2. CSV Import 명세 (Format SoT)
외부 게임 로그를 반입할 때 준수해야 할 정본 포맷이다.
| 컬럼 | 설명 | 타입 | 예시 |
| :--- | :--- | :--- | :--- |
| `기록 일시` | 게임 실행 시각 (ISO8601) | datetime | 2026-02-01T10:00:00Z |
| `유저 ID` | V2 유저 ID (v2_user.id) | int | 101 |
| `결과` | WIN, LOSE, JACKPOT | string | LOSE |
| `배팅 금액` | 실제 배팅액 (KRW) | int | 1000 |
| `세션 ID` | 중복 방지용 게임 세션 | string | sess_999 |

## 3. 실시간 분석 및 개입 정책 (Golden Logic)
`V2GameLog`가 인입될 때 `golden_intervention_worker`가 즉시 분석을 수행한다.

### 3.1 트리거 조건 및 액션
| 모니터링 항목 | 트리거 조건 | 액션 (Action) |
| :--- | :--- | :--- |
| **연패 감지** | 5연속 LOSE 발생 | `TRG_LOSE_5` 개입 로그 생성 |
| **잔액 급감** | 이전 세션 대비 잔액 50%↑ 감소 | `TRG_BAL_DROP_50` 경고 |
| **잭팟 당첨** | JACKPOT 결과 감지 | VIP 승격 검토 대상 지정 |

### 3.2 이탈 위험도(Churn Risk) 공식
최근 10게임 기준:
- **HIGH**: 패배 7회↑ 또는 합계 손실 50만↑ → **즉시 개입 필요**
- **MEDIUM**: 패배 5회↑ 또는 합계 손실 20만↑ → **모니터링 강화**

---

## 4. 데이터 흐름 (Data Flow)
1. **Admin**: 게임 로그 CSV 업로드 (`CSVImportService`)
2. **Pub/Sub**: Redis를 통해 실시간 이벤트 발행
3. **Worker**: `golden_event_worker`가 연패/잔액 분석 후 개입 로그(`V2GoldenInterventionLog`) 적재
4. **Dashboard**: 운영자가 '이탈 위험 레이더'에서 개입 승인/거절 처리

---

## 5. 검증 체크리스트 (QA)
- [x] 🟢 CSV 업로드 시 `import_job_id`가 `v2_game_log`에 정확히 매핑되는지 확인
- [ ] 🟡 개입 트리거 발생 시 Redis Pub/Sub 메시지가 유실 없이 전달되는지 부하 테스트
- [x] 🟢 `net_result` (지급 - 배팅) 계산 로직이 서비스 레이어와 일치하는지 확인

---

## 6. 변경 이력
- v2.1 (2026-02-06, Antigravity): 수동 정리 요청에 따라 누락된 CSV 상세 명세, 실시간 개입 트리거 및 이탈 위험도 분석 로직 복원 통합.
- v1.0 (2026-02-02, GitHub Copilot): 초기 spec 작성
