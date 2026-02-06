문서 타입: 테스트 로그 (Game)
버전: v1.2
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Test Logs - Game (2026-01-24)

## 1. 목적 (Purpose)
주사위, 룰렛, 복권 등 핵심 게임 로직의 V2 전 구간 연동 및 밸런싱/로그 상태를 기록한다.

## 2. 검증 항목
| 항목 | FE 진입점 | API 엔드포인트 | 상태 | 증거 |
|---|---|---|---|---|
| Dice Play | /game/dice | POST /api/v2/dice/play | **PASS ✅** | artifacts/20260124/api/dice_play_response_retry.json |
| Roulette Status | /game/roulette | GET /api/v2/roulette/status | **PASS ✅** | artifacts/20260124/api/roulette_status_response_v2.json |
| Roulette Play | /game/roulette | POST /api/v2/roulette/play | **PASS ✅** | artifacts/20260124/api/roulette_play_response_v2.json |
| Lottery Status | /game/lottery | GET /api/v2/lottery/status | **PASS ✅** | artifacts/20260124/api/lottery_status_response_v2.json |
| Lottery Play | /game/lottery | POST /api/v2/lottery/play | **PASS ✅** | artifacts/20260124/api/lottery_play_response_v2.json |

## 3. 세부 로그
### 3.1 Dice Play (PASS)
- **현황**: v2 경로(`/api/v2/dice/play`)로 정상 응답 확인.
- **증거**: artifacts/20260124/api/dice_play_response_retry.json

### 3.2 Roulette/Lottery 정상화
- **현황**: v2 룰렛/복권 설정을 정상화 후 상태/플레이 응답 확인.
- **증거**:
	- artifacts/20260124/api/roulette_status_response_v2.json
	- artifacts/20260124/api/roulette_play_response_v2.json
	- artifacts/20260124/api/lottery_status_response_v2.json
	- artifacts/20260124/api/lottery_play_response_v2.json

---
## 4. 변경 이력
- v1.2 (2026-01-24, GitHub Copilot): Roulette/Lottery PASS 증거 반영
- v1.1 (2026-01-24, GitHub Copilot): Dice PASS 증거 반영, Roulette/Lottery config 오류 기록
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성

(끝)
