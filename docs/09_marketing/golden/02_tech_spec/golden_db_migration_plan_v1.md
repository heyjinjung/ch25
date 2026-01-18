# 프로젝트 'Golden' DB 스키마 마이그레이션 계획 v1.0

본 문서는 `golden_adaptive_engine_v1.md` 사양을 구현하기 위해 필요한 데이터베이스 변경 사항과 데이터 전송 계획을 다룹니다.

---

## 1. 신규 테이블 생성 (New Table: `user_retention_state`)

유저의 실시간 심리 상태 및 AI 예측 점수를 저장하기 위한 전용 테이블을 생성합니다.

```sql
CREATE TABLE `user_retention_state` (
    `user_id` INT PRIMARY KEY,
    `churn_probability_score` FLOAT DEFAULT 0,  -- 0~100 이탈 위험도
    `predicted_ltv` DECIMAL(18, 2) DEFAULT 0,   -- 예상 생애 가치
    `current_win_loss_streak` INT DEFAULT 0,    -- 현재 연승(+) / 연패(-)
    `session_balance_delta` DECIMAL(18, 2) DEFAULT 0, -- 세션 시작 대비 변동액
    `bet_size_variation_score` FLOAT DEFAULT 0, -- 베팅 변동성 지표 (고위험 탐지용)
    `loyalty_frequency_score` INT DEFAULT 0,    -- 최근 7일 접속 빈도
    `psychological_state` ENUM('IN_FLOW', 'BORED', 'FRUSTRATED', 'TILTED') DEFAULT 'IN_FLOW',
    `user_segment_tag` ENUM('HIGH_ROLLER', 'CASUAL_LOYAL', 'NEW_USER', 'CHURN_RISK') DEFAULT 'NEW_USER',
    `last_intervention_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
```

---

## 2. 기존 테이블 및 로직 확장

### A. `activity_records` 인덱싱 강화
*   **목적**: 최근 10~20건의 로그를 실시간으로 훑어야 하는 '센서' 로직의 성능 최적화.
*   **변경**: `(user_id, created_at)` 복합 인덱스 추가 (이미 존재 여부 확인 필요).

### B. `inventory` 및 `shop_items` 메타데이터 확장
*   **목적**: 특정 유저 상태(예: `FRUSTRATED`)일 때만 노출되는 '구호 패키지' 필터링 기능 지원.
*   **필드 추가**: `required_psychological_state` (특정 상태 시 노출 조건).

---

## 3. 구현 및 검증 계획 (Implementation & Verification)

### 실행 단계 (Execution Steps)
1.  **DB 스키마 적용**: 로컬/테스트 서버에 `CREATE TABLE` 문 실행.
2.  **데이터 센서 연동**: 게임 결과 처리부(`GameService`)에 `current_win_loss_streak` 업데이트 로직 추가.
3.  **트리거 자동화**: `churn_probability_score`가 80점 이상일 때 `InternalNotifyService` 호출 테스트.

### 검증 방법 (Verification)
*   **SQL 검증**: `DESC user_retention_state;` 명령어로 필드 생성 및 타입 확인.
*   **로직 테스트 (Manual)**:
    1.  특정 유저로 5연패 발생 시킴.
    2.  `user_retention_state` 테이블의 `current_win_loss_streak`가 `-5`로 변하는지 확인.
    3.  `psychological_state`가 `FRUSTRATED`로 자동 전이되는지 쿼리로 확인.

---

## 4. 로드맵 연계
본 마이그레이션은 **[로드맵 1단계: 신경망 구축]**의 핵심 인프라입니다. 이후 단계에서 이 테이블의 데이터를 활용해 AI 예측 모델을 연동하게 됩니다.
