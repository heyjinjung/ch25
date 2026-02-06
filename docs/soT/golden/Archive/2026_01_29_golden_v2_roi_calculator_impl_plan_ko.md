# Golden V2: ROI Calculator Service 구현 계획서 (2026_01_29)

**문서 타입**: 상세 구현 계획 (Implementation Plan)
**작성일**: 2026-01-29
**대상**: Golden V2 개발팀 (Phase 4 - Data Intelligence)
**프로젝트**: Golden V2

---

## 1. 개요 (Overview)

개입(Intervention)의 성과를 **비용(Cost) 대비 효과(Return)** 관점에서 자동으로 계산 시스템입니다. "티켓 1장을 줬더니(100원), 유저가 들어와서 500원을 쓰고(매출), 광고를 2번 봤다(이익)"를 정량화합니다.

### 핵심 목표
1.  **Post-Intervention Tracking**: 개입 시점(`sent_at`)으로부터 **24시간/7일** 내 행동 추적.
2.  **Cost Calculation**: 지급된 보상의 원가(Config 기반) 계산.
3.  **Return Calculation**: 금고 사용량(`vault_spent`), 광고 시청, 게임 플레이 횟수 집계.

---

## 2. 데이터 모델 (Schema)

이미 존재하는 `app/v2/models/v2_retention_roi_log.py` 활용 및 확장.

```python
class V2RetentionRoiLog(Base):
    ops_execution_id = Column(FK) # 어떤 개입이었는지
    user_id = Column(FK)
    
    # Cost
    cost_krw = Column(Integer)    # 보상 원가 (예: 티켓당 100원)
    
    # Return (24h)
    login_count_24h = Column(Integer)
    vault_spent_24h = Column(Integer)
    ad_view_count_24h = Column(Integer)
    game_play_count_24h = Column(Integer)
    
    # Result
    roi_percentage = Column(Float) # (Return Value - Cost) / Cost * 100
```

---

## 3. 상세 구현 (Implementation Checklist)

### 3.1 `V2RoiAnalysisService`
- `calculate_daily_roi()`: Celery Task로 매일 밤(혹은 09:00 KST) 실행.
    - D-1일(`yesterday`)에 실행된 `ops_execution` 목록 조회.
    - 각 건에 대해 24시간 동안의 `user_activity`, `vault_ledger`, `game_log` 집계.
    - `v2_retention_roi_log` 적재.

### 3.2 Value Configuration
- 보상 및 행동의 가치를 정의하는 Config 필요 (`v2_roi_config`).
    - `R_TICKET_COST`: 100 KRW
    - `LOGIN_VALUE`: 50 KRW (접속의 가치)
    - `AD_VIEW_VALUE`: 10 KRW

### 3.3 로깅 및 성능
- 대량의 로그 집계가 필요하므로 **OLAP DB(ClickHouse)** 활용이 이상적이나, 초기에는 **Redis Cache**(`events:game` stream)를 활용한 **실시간 집계** 혹은 **Read Replica DB SQL 집계** 방식을 사용.
- **초기 구현**: SQL 집계 (배치).

---

## 4. Admin Dashboard
- **Campaign ROI 뷰**:
    - Ops Plan별 평균 ROI, 총 비용, 총 효과.
    - 그래프: 비용 투입 대비 매출 발생 추이.

## 5. 결론
ROI Calculator는 마케팅 예산 집행의 근거를 제공하는 핵심 모듈입니다. 초기에는 정확한 "현금 가치" 환산보다는 **지표의 상대적 비교(A캠페인이 B캠페인보다 낫다)**에 집중하는 것이 좋습니다.
