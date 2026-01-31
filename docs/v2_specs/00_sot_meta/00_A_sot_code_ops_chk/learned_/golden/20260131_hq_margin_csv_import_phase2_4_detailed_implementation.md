# HQ 마진 CSV 임포트 Phase 2-4 상세 구현 계획서

**문서 타입**: Learned SoT / Implementation Plan
**작성일**: 2026-01-31
**상태**: ✅ 로직 및 세부 연동 설계 완료

---

## 1. 백엔드 구현 상세

### 1.1 `HQMarginImportService` 고도화
- **닉네임 중복 방어**: `db.query(V2User).filter_by(nickname=...)` 결과가 2개 이상일 경우 매칭 스킵 및 `skipped_reasons` 기록.
- **Prospective 유저 저장**:
    ```python
    if not v2_user:
        prospect = HQProspectiveUser(
            nickname=row['닉네임'],
            cc_id=row['이름 (아이디)'],
            margin=row['총 운영 마진'],
            segment=classify_segment(row)
        )
        db.merge(prospect) # Nickname 기준 업데이트 또는 생성
    ```

### 1.2 `AuthService` 가입 연동
- **Flow**: User Registration → `check_hq_prospect(nickname)` → Success: Create `V2UserSegment` + Mark `is_joined` → Fail: Pass.

### 1.3 `GoldenSchedulerService` (SQLite 연동)
- **Path**: `settings.HQ_DB_PATH`
- **Query**:
    ```sql
    SELECT strftime('%H', charging_date) as hour, sum(amount) 
    FROM charges WHERE status='SUCCESS' 
    GROUP BY hour ORDER BY sum(amount) DESC
    ```

---

## 2. 프론트엔드 구현 상세

### 2.1 `OpsDashboard.tsx`
- **Hook**: `useHQMarginStats()` 호출 (신규)
- **컴포넌트**: `HQMarginReportCard` 섹션 추가.
- **데이터 바인딩**: `vip_count`, `prospective_count`, `last_updated` 등 표시.

### 2.2 `AdminGoldenHourPage.tsx`
- "본사 패턴 분석" 버튼 클릭 시 `/game/golden-hour/optimal-schedule` 호출.
- 추천 결과(JSON)를 파싱하여 시간 설정 Input 필드에 자동 입력하는 기능 추가.

---

## 3. 검증 시나리오 (에러 예방)

1.  **닉네임 중복 유저 가입**:
    - 본사 데이터에 `Jimin` (마진 100만) 존재.
    - 텔레그램에 이미 `Jimin`이 2명 가입되어 있을 경우.
    - **기대 결과**: 임포트 시 스킵되고, 가입 시에도 모호한 경우 보너스가 자동 지급되지 않아야 함 (안전성 우선).
2.  **대량 데이터 부하**:
    - 10,000건 이상의 CSV 업로드.
    - **기대 결과**: `Batch Commit`을 통해 DB Lock 최소화 및 타임아웃 방지.
3.  **SQLite 접근 권한**:
    - 파일 권한 부재로 DB 연결 실패 시.
    - **기대 결과**: "본사 시스템 연동 불가 (권한 에러)" 메시지 출력 및 기본 스케줄 사용.
