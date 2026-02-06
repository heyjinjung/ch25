문서 타입: SoT
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 Redis 키/채널 네이밍 기준을 확정한다.

## 2. 범위 (Scope)
- Redis 키 네이밍
- Redis 채널 네이밍

## 3. 용어 정의 (Definitions)
- Redis 키: 상태 저장용 키
- Redis 채널: 이벤트 전달용 채널

## 4. SoT: Redis 키 (Keys)
### 4.1 V2 표준 키 (Prefix: `golden:v2:`)
| 용도 | V2 Key Pattern | TTL | 비고 |
| :--- | :--- | :--- | :--- |
| **연패 카운트** | `golden:v2:user:{id}:loss_streak` | 1h | 리텐션 엔진 트리거용 |
| **세션 시작 잔액** | `golden:v2:user:{id}:session_start_balance` | 24h | 일일 손실 한도 계산용 |
| **심리 상태** | `golden:v2:user:{id}:psych_state` | 24h | AI 분석 결과 (Anger/Despair 등) |
| **OPS 진행률** | `golden:v2:ops:result:{task_id}` | 1h | 운영 대시보드 표시용 |

### 4.2 현행 vs V2 매핑 (Migration)
| AS-IS (V1 현행) | TO-BE (V2 표준) | 상태 |
| :--- | :--- | :--- |
| `user:{id}:loss_streak` | `golden:v2:user:{id}:loss_streak` | 이관 필요 |
| `daily_spin_count:{id}` | `golden:v2:game:roulette:daily_spin:{id}` | 네이밍 표준화 |
| `feed:public` | `golden:v2:feed:public` | 채널명 변경 |

## 5. SoT: Redis 채널 (Channels)
- `golden:v2:events:game` (게임 결과 발행)
- `golden:v2:events:intervention` (개입 액션 발행)
- `golden:v2:feed:public` (전체 공지)
- `golden:v2:ops:ws` (운영 로그)

## 6. 운영/검증 (QA)
- [ ] 키/채널 네이밍 통일
- [ ] 문서와 구현 불일치 시 문서 우선 갱신

## 7. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
