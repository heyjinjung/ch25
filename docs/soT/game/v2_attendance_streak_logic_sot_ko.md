문서 타입: 게임 정책/로직
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/개발 팀
상태: SoT

# V2 Attendance Streak Logic SoT (연속 출석 스트릭)

## 1. 목적
유저의 매일 접속을 유도하기 위한 **연속 출석(Streak)** 시스템의 카운팅 규칙, 초기화(Reset) 조건, 보상 테이블을 정의한다.

## 2. 스트릭 규칙 (Rules)

### 2.1. 출석 인정 (Check-in)
- **기준 시간**: 매일 00:00:00 (KST) ~ 23:59:59 (KST).
- **인정 조건**: 앱/웹 접속 후 **로그인** 완료 시 자동 체크(`Session Start`).
- **상태**:
    - `Active`: 오늘 출석 완료.
    - `Pending`: 오늘 아직 접속 안 함.

### 2.2. 연속성 및 초기화 (Continuity & Reset)
- **성공**: 어제 출석 O + 오늘 출석 O -> `Streak + 1`
- **실패(Broken)**: 어제 출석 X -> 오늘 접속 시 `Streak = 1` (초기화)
- **유예(Grace Period)**: (V2 예정) `Streak Freezer` 아이템 보유 시 1회 소모하여 초기화 방어 가능. (현재 V1은 없음)

---

## 3. 보상 테이블 (Reward Table)
`Day 7` 달성 시 스트릭은 유지되되, 보상 사이클은 반복될 수 있다. (기획에 따라 7일 후 다시 1일차 보상 or 7일차 반복) -> **현행: 7일 후 다시 1일차 보상 (Loop)**

| Day | Reward Type | Amount | 비고 |
| :--- | :--- | :--- | :--- |
| Day 1 | `POINT` | 100 | 기본 |
| Day 2 | `POINT` | 200 | 점진적 증가 |
| Day 3 | `BUNDLE` | Ticket Pack | (Roulette x1, Dice x1) |
| Day 4 | `POINT` | 500 | - |
| Day 5 | `POINT` | 1,000 | - |
| Day 6 | `ROULETTE_TICKET` | 2 | - |
| **Day 7** | `DIAMOND` | 1 | **Major Reward** |

*보상 내용은 `admin_mission` 설정을 통해 변경 가능하며, **어드민 설정값(Admin Config)**이 하드코딩 기본값보다 항상 우선(High Priority)한다.*

---

## 4. 데이터 처리
- **저장소**: DB `users` 테이블 또는 `user_streaks` 별도 테이블.
- **표시**: 메인 홈 화면에 "🔥 3일 연속" 배지 노출.

## 5. 변경 이력
- v1.0 (2026-01-19, Antigravity Agent): Streak API 분석 기반 SoT 정립.
