---
Project: Golden
Type: Tech Spec
Author: NotebookLM & Antigravity
Status: Draft
Last Updated: 2026-01-17
---

# 실시간 이벤트 처리 아키텍처 (Real-time Event Processing)

FastAPI(Python) 기반 ch25 시스템에서 밀리초 단위의 유저 개입을 구현하기 위한 아키텍처 설계입니다.

---

## 1. 아키텍처 설계

### 핵심 컴포넌트
| 컴포넌트 | 역할 | 기술 |
| :--- | :--- | :--- |
| **이벤트 버스** | 게임 결과 실시간 발행 | Redis Pub/Sub |
| **상태 저장소** | 연패/잔액 메모리 유지 | Redis Hash |
| **실시간 알림** | 클라이언트 즉시 푸시 | WebSockets |
| **비동기 워커** | 분석/보상 로직 분리 | asyncio Workers |

### 데이터 흐름
```
[Game Engine] -> [Redis Pub/Sub] -> [Analysis Worker] -> [WebSocket Push] -> [Client]
                      |
                      v
               [Redis: user:{id}:loss_streak]
               [Redis: user:{id}:session_start_balance]
```

---

## 2. 구현 예시 코드 (FastAPI + Redis)

```python
import redis.asyncio as redis
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()
r = redis.from_url("redis://localhost", decode_responses=True)

class InterventionManager:
    """실시간 유저 개입 및 WebSocket 관리"""
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_intervention(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

manager = InterventionManager()

async def analyze_game_event(user_id: int, is_win: bool, current_balance: float):
    """밀리초 단위의 상태 분석 및 개입 트리거"""
    streak_key = f"user:{user_id}:loss_streak"
    initial_balance_key = f"user:{user_id}:session_start_balance"
    
    # 1. 연속 패배(Streak) 로직
    if not is_win:
        loss_streak = await r.incr(streak_key)
    else:
        await r.set(streak_key, 0)
        loss_streak = 0

    # 2. 자산 급감(Asset Depletion) 감지
    start_balance = await r.get(initial_balance_key)
    if not start_balance:
        await r.set(initial_balance_key, current_balance)
        start_balance = current_balance
    
    balance_drop_ratio = (float(start_balance) - current_balance) / float(start_balance)

    # 3. 개입 조건 확인 및 실행
    if loss_streak >= 5 or balance_drop_ratio >= 0.5:
        intervention_msg = {
            "type": "REALTIME_REWARD",
            "title": "힘내세요! 🍀",
            "content": "특별 응원 보너스 'DICE_TOKEN' 100개를 드립니다!",
            "reward_token": "DICE_TOKEN",
            "amount": 100
        }
        await manager.send_intervention(user_id, intervention_msg)
        await r.set(streak_key, 0)  # 상태 초기화
        await r.set(initial_balance_key, current_balance)

@app.websocket("/ws/engagement/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
```

---

## 3. 리텐션 관점 핵심 인사이트

1.  **손실 회피 심리 관리**: 유저는 패배의 고통을 승리 기쁨의 2배로 느낌. 연패 즉시 보강 제공.
2.  **데이터 기반 초개인화**: AI 모델과 결합하여 `churn_probability_score` 임계치 기반 자동 개입.
3.  **예측적 개입**: 사후 푸시(떠난 후)가 아닌, **게임 세션 중 '결정적 순간'**에 개입하여 LTV 극대화.
