문서 타입: API Core Domain Master
버전: v2.0 (Domain Integrated)
작성일: 2026-02-06
상태: Master SoT (Core Domain)

# Golden V2 API Core Domain Master Source of Truth (SoT)

> [!IMPORTANT]
> 본 문서는 Golden V2 프로젝트의 핵심 비즈니스 도메인(Golden, Inventory, Mission, Team Battle, Ticket Zero)의 실질적인 API 계약과 데이터 흐름을 통합 정의합니다. 
> 유저의 리텐션, 참여, 보상 경제 시스템의 기술적 동작 기준을 제공합니다.

---

## 1. 리텐션 및 게임 루프 (Retention Loop)

### 1.1 Golden 개입 (Intervention)
유저의 손실 스트릭(Loss Streak) 또는 잔액 소진 시 지능형 개입을 수행합니다.
- **결정 엔드포인트**: `POST /api/v2/golden/intervention/resolve`
- **로직**: `LOSS_STREAK` 발생 시 ROI 및 LTV를 예측하여 보상 지급 여부 결정.
- **재참여**: 휴면 유저(`DORMANT_7D` 등) 대상 인앱 큐 적재 지원.

### 1.2 미션 및 스트릭 (Mission & Streak)
- **미션 구조**: Daily, Weekly, Starter 카테고리로 구분되며 09:00 KST에 초기화됨.
- **스트릭**: 연속 출석 일수에 따른 가중치(`multiplier`) 및 마일스톤 보상 적용.
- **수령 방식**: `POST /api/v2/mission/{id}/claim` (자동 수령 플래그 지원).
- **데이터 표기**: 미션 달성 일시 및 만료 시간은 전역 KST 응답 정책(`+09:00`, 기준: `docs/SOT/00_api/v2_kst_api_response_policy_v1.0.md`)을 따름.

### 1.3 팀 배틀 (Team Battle)
- **시즌제**: 활성 시즌(`seasons/active`) 조회 및 팀 기반 리더보드 운영.
- **기여도 조정**: Admin은 멤버 가입일 수정 및 기여도(`TeamEventLog`) 조정 가능.

---

## 2. 경제 및 보상 시스템 (Economy & Rewards)

### 2.1 인벤토리 및 상점 (Inventory & Shop)
- **구매 흐름**: `SKU` 기반 상품 구매(`POST /api/v2/shop/purchase`) 및 Idempotency 수반.
- **아이템 사용**: `ROULETTE_TICKET` 등 인벤토리 아이템 소모 및 결과 반영.
- **지갑 동기화**: `UserGameWallet` 토큰 잔액과 `UserInventoryItem` 보유량 통합 조회.

### 2.2 티켓 제로 (Ticket Zero - Bailout)
- **구제 요건**: 포인트/티켓 잔액 0, 미수령 보상 부재, 24시간 쿨다운 경과 시 발동.
- **보상**: 구조 요청(`POST /bailout`) 시 `ROULETTE_TICKET` 등 기본 재화 긴급 지급.

---

## 3. 실시간 피드 및 시스템 (Real-time Feed)

### 3.1 알림 스키마 (Notification Feed)
WebSocket(`wss://api.cc-jm.com/ws/feed`)을 통한 실시간 메시지 브로드캐스트.
- **JACKPOT_WIN**: 잭팟 당첨자 정보(`game_type`, `reward_amount`) 전파.
- **GUERRILLA_DROP**: 기간 한정 이벤트(`multiplier`, `duration_sec`) 알림.
- **SYSTEM_NOTICE**: 서버 점검 및 긴급 공지(`severity`, `content`) 전송.
- **USER_ASSET_UPDATE**: (Future) 개인 자산 변동 실시간 반영.

### 3.2 시스템 제어 (System)
- **Health Check**: DB 및 전체 시스템 생존 확인 (`/api/v2/health`).
- **Today Feature**: 인증 여부에 따른 오늘의 권장 피처 제공.

---

## 4. 기술 명세 통합 (OpenAPI)

- **형식 지원**: YAML(v2.0) 및 JSON 포맷의 기술 명세서 최신화.
- **에러 규칙**: `ALREADY_CLAIMED`, `NOT_ELIGIBLE`, `DEPOSIT_REQUIRED` 등 도메인별 특화 에러 코드 적용.

---
*본 문서는 Golden V2의 비즈니스 도메인 통합 기준점이며, 기능 확장 시 각 도메인 계약서와 함께 동기화되어야 합니다.*
