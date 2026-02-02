문서 타입: 설계
버전: v1.0
작성일: 2026-02-03
작성자: GitHub Copilot
대상: 백엔드/운영/어드민
상태: Draft

---

## 1. 목적
HQ Margin CSV의 **누적 충전 금액**을 V2 CC 입금(금고/XP/미션/일별 델타)과 **일관되게 동기화**하기 위한 상세 설계를 정의한다.

---

## 2. 범위
### 2.1 포함
- HQ Margin CSV Import 시 **누적 충전 금액 → CC 입금 누적 스냅샷 반영**
- 증가분(Delta) 기반 **금고 입금/XP/미션/일별 델타** 자동 처리
- **미매칭 입금 로그 API** 설계
- KST(Asia/Seoul), 오전 9시 리셋(Operational Day) 준수

### 2.2 제외
- 프론트 UI 변경(어드민 페이지/알림 UI)
- HQ 원본 CSV 구조 변경
- 실시간 스트리밍/웹훅 도입

---

## 3. 현행 구조 요약 (SoT/코드 기준)
- **HQMarginImportService**: CSV 파싱 → V2User 매칭 → V2UserSegment 업데이트/잠재유저 저장
- **V2AdminCCDepositService.upsert_many**:
  - 누적 입금 스냅샷(`ExternalRankingData`) 갱신
  - 누적 증가분 계산 → `V2VaultService.handle_deposit_increase_signal`
  - `ExternalRankingDailyDepositDelta` 기록
  - XP/미션/고래(whale) 체크
- **Vault/XP/미션**은 CC 입금 증가분(Delta)에서만 반응하도록 설계됨

> 주의: CC 입금 SoT 문서( `v2_cc_deposit_sot_ko.md` )와 실제 코드 경로( `ExternalRankingData`, `ExternalRankingDailyDepositDelta` ) 간 매핑은 **코드 기준**으로 정합성을 유지한다.

---

## 4. 요구사항 요약
1. HQ Margin CSV의 **누적 충전 금액**이 CC 입금 누적 값으로 반영되어야 한다.
2. 증가분(Delta)이 있을 때만 **금고/XP/미션/일별 델타**가 자동 반영되어야 한다.
3. 유저 매칭 실패 건은 **미매칭 로그**로 누적되며, 24시간 필터 조회가 가능해야 한다.
4. 모든 일자 계산은 **KST 기준, 오전 9시 리셋**을 준수해야 한다.

---

## 5. 유저 매칭 규칙 (HQ CSV → V2User)
### 5.1 입력 키
- `이름 (아이디)` → HQ의 CC ID
- `닉네임` → 보조 키

### 5.2 매칭 우선순위 (엄격 순서)
1. **V2User.cc_id** (case-insensitive exact)
2. **V2User.external_nickname** (case-insensitive exact, 존재 시)
3. **V2User.nickname** (case-insensitive exact)

### 5.3 모호성 처리
- 동일 키로 **2명 이상 매칭** 시 **409 Ambiguous**로 처리하고 미매칭 로그에 기록
- 매칭 실패 시 **미매칭 로그**에 기록

---

## 6. 처리 흐름 (HQ Margin Import → CC Deposit 반영)
### 6.1 개요
```
HQ Margin CSV
  → 파싱/검증
  → 유저 매칭
  → 누적 충전 금액 → CC 입금 스냅샷 반영
  → 델타 처리(금고/XP/미션/일별 델타)
  → 미매칭 로그 기록
```

### 6.2 상세 단계
1. CSV 파싱 및 필수 컬럼 검증
2. 각 행별로 `total_charge = 누적 충전 금액` 파싱
3. **매칭 성공**
   - `CCDepositCreate(user_id, deposit_amount=total_charge, play_count=기존값 or 0)` 생성
   - `V2AdminCCDepositService.upsert_many()` 호출
   - 증가분(Delta) 발생 시:
     - `V2VaultService.handle_deposit_increase_signal` (금고/제재상태) 호출
     - `ExternalRankingDailyDepositDelta` 기록
     - XP/미션/고래 체크 반영
4. **매칭 실패/모호성**
   - 미매칭 로그 테이블에 저장
   - CSV Import 결과에 경고/에러 반영

---

## 7. 데이터 모델 설계
### 7.1 기존 테이블 (활용)
- `external_ranking_data` (누적 스냅샷)
- `external_ranking_daily_deposit_delta` (일별 델타)
- `user_activity.last_charge_at` (입금 최근성 보조 지표)

### 7.2 신규 테이블 (미매칭 로그)
**Table**: `v2_external_deposit_unmatched`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | PK | 식별자 |
| source | VARCHAR | `HQ_MARGIN` 고정 |
| raw_cc_id | VARCHAR | CSV 원본 CC ID |
| raw_nickname | VARCHAR | CSV 원본 닉네임 |
| total_charge | BIGINT | CSV 누적 충전 금액 |
| prev_total | BIGINT | 기존 누적(있다면) |
| delta | BIGINT | 계산된 델타 (없으면 0) |
| kst_date | DATE | KST 기준 운영일 |
| status | VARCHAR | `UNMATCHED`/`AMBIGUOUS`/`MATCHED`/`IGNORED` |
| matched_user_id | INT | 수동 매칭 시 연결된 유저 |
| matched_at | DATETIME | 매칭 시각 |
| reason | VARCHAR | 실패/무시 사유 |
| created_at | DATETIME | 생성 시각(UTC 저장) |

---

## 8. API 계약 (미매칭 입금 로그)
### 8.1 조회
`GET /api/v2/admin/deposits/unmatched?hours=24&status=UNMATCHED&limit=50&offset=0`

#### Response
```json
{
  "items": [
    {
      "id": 12,
      "source": "HQ_MARGIN",
      "raw_cc_id": "user123",
      "raw_nickname": "영하19도",
      "total_charge": 800000,
      "delta": 100000,
      "kst_date": "2026-02-03",
      "status": "UNMATCHED",
      "reason": "USER_NOT_FOUND"
    }
  ],
  "total": 1
}
```

### 8.2 수동 매칭 (옵션)
`POST /api/v2/admin/deposits/unmatched/{id}/link`
- body: `{ "user_id": 123 }`

### 8.3 무시 처리 (옵션)
`POST /api/v2/admin/deposits/unmatched/{id}/ignore`
- body: `{ "reason": "DUPLICATE" }`

---

## 9. 동기화/부작용 정합성
- **금고**: `V2VaultService.handle_deposit_increase_signal` 경로만 사용
- **XP**: `V2AdminCCDepositService` 내부 로직 사용 (스텝 제한 제거 상태 유지)
- **미션**: `CC_DEPOSIT` 액션 업데이트 유지
- **세그먼트**: HQ Margin Import 기존 분류 로직 유지, CC 입금 반영과 분리
- **일별 입금 기준**: `ExternalRankingDailyDepositDelta` KST 운영일 기준

---

## 10. 예외/엣지 케이스
- **누적 금액 감소**: 데이터 오염으로 간주, 델타 반영 금지, 경고 로그 기록
- **동명이인(닉네임 중복)**: 매칭 중단, `AMBIGUOUS` 상태로 기록
- **부분 컬럼 누락**: 기존 HQ CSV 검증 로직으로 차단
- **대량 배치**: 250~500 단위 청크 처리 권장

---

## 11. 검증 시나리오
- [ ] 신규 유저 0 → 100,000: 금고 +100,000, 일별 델타 +100,000, XP 지급
- [ ] 100,000 → 100,000: 변동 없음, 델타 미생성
- [ ] 200,000 → 150,000: 델타 미반영 + 경고 로그 기록
- [ ] 미매칭: 미매칭 테이블 기록 + API 조회 가능

---

## 12. 이해락(Understanding Lock)
### 12.1 설계 요약
- HQ Margin CSV의 **누적 충전 금액**을 `V2AdminCCDepositService.upsert_many` 경로로 반영하여,
  기존 CC 입금 동기화(금고/XP/미션/델타)와 **완전히 동일한 경로**로 처리한다.
- 매칭 실패는 별도 테이블에 기록하고, 24시간 필터 조회 API를 제공한다.

### 12.2 가정
- HQ CSV의 `누적 충전 금액`은 **절대 누적값**이다.
- 기존 CC 입금 경로는 **증가분만 반영**하는 정책을 유지한다.

### 12.3 오픈 질문
1. 미매칭 로그 **보관 기간**(예: 30일)을 정할까요?
2. 수동 매칭 시 **즉시 재처리**(누적 반영)까지 포함할까요?
3. HQ CSV에 **텔레그램 정보**가 추가될 가능성이 있나요?

---

## 13. 변경 이력
- v1.0 (2026-02-03, GitHub Copilot): HQ Margin CSV → CC 입금 자동 반영 상세 설계 초안
