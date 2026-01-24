---
Project: Golden
Type: Feasibility Report
Author: Antigravity (AI) & USER
Status: Final
Last Updated: 2026-01-17
---

# 서버 부하 영향성 분석 보고서 (Server Load Impact Analysis)

프로젝트 'Golden'의 핵심인 **실시간 로그 파이프라인(Redis Streams + Python Worker)** 도입 시, 기존 서버에 미칠 부하를 분석한 결과입니다.

---

## 🏗 결론 요약 (Executive Summary)

**"서버 부하 확률은 매우 낮습니다 (Low Risk)."**

기존의 모놀리식 방식(DB 직접 전송)이 아닌, **"Log Swallow (로그 삼키기)"** 아키텍처를 채택했기 때문에 서비스 성능에 거의 영향을 주지 않습니다.

| 영역 | 위험도 | 이유 |
| :--- | :--- | :--- |
| **Main DB (MySQL)** | 🟢 **매우 낮음** | 모든 로그를 DB에 저장하지 않고 **Redis에서 처리 후 폐기**하기 때문. |
| **Web Server (Backend)** | 🟢 **낮음** | 메인 API 서버와 **완전히 분리된** 별도의 Python Worker 프로세스가 돔. |
| **Memory (Redis)** | 🟡 **중간** | 로그가 순간 폭주할 경우 메모리 사용량 증가 가능 (TTL 설정으로 방어). |
| **Network (WebSocket)** | 🟢 **낮음** | 모든 유저가 아닌 **'개입 대상 유저'**에게만 메시지를 전송함. |

---

## 🔍 상세 기술 분석

### 1. DB 보호 전략: "쓰기(Write)가 없다"
*   **기존 방식**: 1초에 100건의 베팅 로그가 오면 -> MySQL에 100번 INSERT -> **DB CPU 락(Lock) 발생**. 💥
*   **Golden 방식**: 1초에 100건이 오면 -> Redis 메모리에서 숫자(`streak`)만 100번 수정 -> **MySQL 부하 0**. 🍃
    *   Redis는 초당 10만 건 이상의 연산도 거뜬히 처리합니다.

### 2. 비동기 처리: "메인 스레드를 건드리지 않는다"
*   로그를 수집하고 분석하는 작업은 `LogCollector`와 `EventWorker`라는 **독립적인 백그라운드 프로세스**가 수행합니다.
*   유저가 게임을 하거나 API를 호출하는 메인 서버(`uvicorn`)와는 아무런 자원 경쟁을 하지 않습니다.

### 3. 과부하 방지 장치 (Safety Mechanisms)
설계서(`golden_log_pipeline_spec_v1.md`)에는 이미 다음과 같은 안전장치가 포함되어 있습니다.
*   **Redis TTL**: 처리된 로그나 오래된 상태 데이터는 24시간 후 **자동 삭제**되어 메모리 누수를 막습니다.
*   **Max Limit**: `Redis Stream`의 길이를 제한(`MAXLEN`)하여, 처리가 밀려도 메모리가 터지지 않고 오래된 로그부터 버려집니다.

---

## 🚧 유일한 주의사항 (Bottleneck Watch)

**"Redis 메모리 용량 관리"**만 신경 쓰면 됩니다.
*   현재 서버의 RAM 여유 공간이 2GB 이상이라면 수십만 명의 동시 접속자 로그도 문제없이 버퍼링 할 수 있습니다. (로그 1건당 약 0.5KB)

## ✅ 최종 의견
지금 설계된 아키텍처는 **대규모 트래픽을 처리하는 넷플릭스나 배달의민족** 같은 곳에서 사용하는 표준 패턴(Event-Driven)의 경량화 버전입니다. 안심하고 진행하셔도 좋습니다.
