# Golden V2: Daily Nudge Scheduler 구현 계획서 (2026_01_29)

**문서 타입**: 상세 구현 계획 (Implementation Plan)
**작성일**: 2026-01-29
**대상**: Golden V2 개발팀 (Phase 2+ - Retention Ops)
**프로젝트**: Golden V2

---

## 1. 개요 (Overview)

**Daily Nudge**는 유저의 앱 재방문(Retention)을 유도하기 위해 매일 정해진 시각에 **소멸성 무료 토큰(TRIAL_TICKET)**을 지급하고 알림을 보내는 자동화된 리텐션 장치입니다.

### 핵심 목표
1.  **Retention Booster**: 매일 접속해야 할 명분(무료 티켓) 제공.
2.  **Use It or Lose It**: 지급된 티켓은 **다음 운영일(09:00 KST)**에 자동 소멸됨을 명시하여 즉시 접속 유도.
3.  **Automated**: Celery Beat를 통한 100% 자동화 운영.

### SoT 준수 사항
- **Timezone**: 모든 시간 판단은 **09:00 KST (Business Day)** 기준 (`app.utils.timezone` 활용).
- **Inventory**: `TRIAL_TICKET` 타입 및 `app.models.trial_token_bucket` 공용 모델 사용.
- **Dependency**: V2 InventoryService 및 NotificationService 활용.

---

## 2. 기술 설계 (Technical Design)

### 2.1 스케줄링 및 타겟팅
- **Scheduler**: Celery Beat (`app.worker.celery_app`)
- **Frequency**: 매일 2회 발송 (Configurable)
    1.  **12:00 KST** (점심시간 Nudge)
    2.  **19:00 KST** (퇴근시간 Nudge)
- **Target Audience (`GetDailyNudgeTargets`)**:
    - **Active**: 최근 3일 내 접속 이력(`last_login_at`)이 있는 유저.
    - **Not Yet Visited**: "오늘(09:00 KST 이후)" 접속 기록이 없는 유저.
    - **Not Suspended**: `benefits_suspended=False` 인 유저.
    - **Opt-in**: 마케팅 수신 동의 유저 (필요 시 확인).

### 2.2 지급 로직 (Asset Grant)
- **Asset**: `TRIAL_TICKET` (1장)
- **Log**: `InventoryLog` (type=`DAILY_NUDGE`)
    - *Note*: `app/models/inventory.py`의 `InventoryLogType` Enum에 `DAILY_NUDGE` 추가 필요.
    - **Alembic 주의**: Postgres Enum 변경은 자동 감지되지 않으므로, Migration 파일에 `op.execute("ALTER TYPE inventorylogtype ADD VALUE 'DAILY_NUDGE'")`를 수동으로 작성해야 함.
- **Expiry**:
    - 지급 시점의 `business_day_start()` + 24시간 (즉, **익일 09:00 KST**).
    - `InventoryService.grant_trial_token(..., expire_at=next_9am_kst)` 메서드 활용.

### 2.3 알림 메시지 (Notification)
- **Channel**: Telegram Message
- **Template**:
    > 🎁 **오늘의 무료 티켓이 도착했습니다!**
    >
    > 지금 접속해서 룰렛을 돌려보세요.
    > 이 티켓은 내일 아침 9시에 사라집니다! ⏳
    >
    > [지금 접속하기](t.me/...)

---

## 3. 상세 구현 로직 (Implementation Checklist)

### 3.1 `V2RetentionService` (신규)
- `get_nudge_targets(date)`: 타겟 유저 ID 목록 추출 쿼리.
    - `app.models.UserActivity` 테이블 조회 (09:00 KST 기준).
- `execute_daily_nudge(targets)`:
    - Batch Processing (Chunk size: 500).
    - `InventoryService.grant_trial_token()` 호출.
    - `NotificationService.send_message()` 호출.

### 3.2 Celery Task
- `app/worker/scheduled_tasks.py` (또는 v2 전용 워커):
    ```python
    @celery_app.task
    def daily_nudge_task_1200():
        service = V2RetentionService()
        targets = service.get_nudge_targets()
        service.execute_daily_nudge(targets)
    ```

### 3.3 검증 및 테스트
- **시간 경계 테스트**:
    - 08:59 KST에 발송 시 -> "어제" 티켓으로 처리되지 않도록 주의.
    - `expire_at`이 정확히 익일 09:00:00 KST로 찍히는지 검증.
- **중복 지급 방지**:
    - 12시에 받고 19시에 또 받지 않도록 `Redis`나 `DB`(오늘 지급 여부) 체크 로직 추가.
    - Key: `golden:v2:nudge:{date_str}:{user_id}`

---

## 4. 운영 고려사항 (Ops)

- **비용 모니터링**: 무료 티켓으로 풀리는 룰렛 당첨금 총액 모니터링 (Circuit Breaker 연동).
- **성과 측정**: Nudge 발송 후 1시간 내 접속률(Open Rate) 측정 -> `v2_ops_eval_metric`에 기록.

## 5. 결론

Daily Nudge는 단순한 알림이 아니라 **"09:00 KST 리셋"**이라는 Golden V2의 시간 규칙(Time Rule)을 유저에게 학습시키는 중요한 장치입니다. 구현 시 `app.utils.timezone`의 활용이 필수적입니다.
