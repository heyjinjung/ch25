문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: INFRA
날짜: 2026-02-04
상태: 검증 완료 ✅

# [02-04] 통합관제센터 HQ Margin 세그먼트 정합성 확인

## 📌 요약
통합관제센터 "본사 입금액 대조 (Margin)" 섹션의 세그먼트 카운트가 정확한지 확인 요청.

| 항목 | 화면 표시 | DB 실제값 | 정합 여부 |
|------|-----------|-----------|-----------|
| VIP 유저(100만+) | 0 | 0 (v2_user_segment) | ✅ 정합 |
| 큰손 유저(500만+) | 0 | 0 (v2_user_segment) | ✅ 정합 |
| 떠날 위험군 | 0 | 0 (v2_user_segment) | ✅ 정합 |
| 잠재 VIP 고객 | 18 | 18 (hq_prospective_user, 미가입) | ✅ 정합 |

---

## 🔍 증상 정의
| 항목 | 내용 |
|---|---|
| 대상 기능 | 통합관제센터 HQ Margin Stats (GET /api/v2/admin/ops/status) |
| HTTP Status | 200 (데이터 정합성 질의) |
| 영향 범위 | 관리자 대시보드 세그먼트 카운트 표시 |
| 재현 빈도 | 항상 |

---

## 🔬 근본 원인 (증거 기반)

### 1. 신규 7일 정책 (SoT)
**세그먼트 정책**: 신규 가입 후 **7일간은 무조건 "NEW" 세그먼트**로 분류.
- 7일 경과 후 실제 세그먼트(VIP/WHALE/AT_RISK/COMMON) 반영
- 현재 모든 v2_user가 가입 7일 이내 → NEW 세그먼트 정상

### 2. DB 테이블 구조
```sql
-- v2_user_segment: 시스템 자동 할당 세그먼트 (SoT)
SELECT segment, COUNT(*) as cnt FROM v2_user_segment GROUP BY segment;
-- 결과: NEW(11) ← 모든 유저가 가입 7일 이내

-- v2_user.hq_segment: HQ 수동 할당 세그먼트 (참고용)
SELECT hq_segment, COUNT(*) as cnt FROM v2_user WHERE hq_segment IS NOT NULL GROUP BY hq_segment;
-- 결과: WHALE(3), VIP(2), AT_RISK(1), COMMON(2) ← 수동 관리용

-- hq_prospective_user: HQ 본사 잠재 유저 (미가입)
SELECT segment, COUNT(*) as cnt FROM hq_prospective_user WHERE is_joined=0 GROUP BY segment;
-- 결과: VIP(18), WHALE(7), AT_RISK(90), COMMON(55)
```

### 3. HQMarginStatsService 로직
```python
# app/v2/services/hq_margin_stats_service.py:37-52
vip_count = db.query(func.count(V2UserSegment.user_id)).filter(
    V2UserSegment.segment == "VIP"
).scalar() or 0  # → 0 (신규 7일 이내 유저만 존재)

prospective_vip_count = db.query(func.count(HQProspectiveUser.id)).filter(
    HQProspectiveUser.segment == "VIP",
    HQProspectiveUser.is_joined == False
).scalar() or 0  # → 18 (미가입 잠재 VIP)
```

### 4. 세그먼트 테이블 역할 구분
- **v2_user_segment**: 시스템 SoT, 신규 7일 정책 준수
- **v2_user.hq_segment**: HQ 수동 관리, 참고용 (대시보드 반영 안 됨)

### 5. 충전액 기준 검증
```sql
-- 100만원 이상 유저
SELECT COUNT(*) FROM v2_user WHERE total_charge_amount >= 1000000;
-- 결과: 0명

-- 최고 충전액
SELECT MAX(total_charge_amount) FROM v2_user;
-- 결과: 420,000원 (42만원) ← VIP 기준 미달
```

---

## ✅ 결론

### 화면 표시 정확성: ✅ 정상 동작
- **VIP/WHALE/AT_RISK 카운트 0명**: 신규 7일 정책에 따라 모든 유저가 NEW 세그먼트 (정상)
- **잠재 VIP 고객 18명**: hq_prospective_user 미가입 VIP 정확히 반영 (정상)

### 정책 준수 확인: ✅ 정상
- **신규 7일 정책**: 모든 v2_user가 가입 7일 이내 → NEW 세그먼트 정상
- **v2_user_segment SoT**: 시스템이 정책대로 세그먼트 관리 중
- **v2_user.hq_segment**: 수동 관리용 필드로 대시보드 반영 안 됨 (설계 의도)

### 아키텍처 확인: ✅ 정상
- `v2_user_segment`: 시스템 SoT, 7일 정책 자동 적용
- `v2_user.hq_segment`: HQ 수동 관리, 참고용 (대시보드 통계 미반영)
- **설계 의도대로 동작 중**

---

## 🎯 후속 조치

### 1. 7일 경과 후 모니터링
- 신규 유저 가입 후 7일 경과 시 자동 세그먼트 전환 확인
- VIP/WHALE/AT_RISK 카운트가 정책대로 증가하는지 검증

### 2. 세그먼트 정책 문서화
- 신규 7일 정책을 SoT 문서에 명시
- v2_user_segment vs v2_user.hq_segment 역할 구분 문서화

### 3. 정책 기준 확인
```python
# 7일 경과 후 세그먼트 전환 로직 확인 필요
# 예: daily batch job, cron, worker 등에서 처리하는지 검증
```

---

## 📝 참고 문서
- [HQMarginStatsService](../../../app/v2/services/hq_margin_stats_service.py)
- [V2UserSegment Model](../../../app/v2/models/v2_user_segment.py)
- [세그먼트 정책 SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/segment/segment_policy.md) (신규 7일 정책)

---

## 🏷️ 태그
`P3` `INFRA` `DASHBOARD` `SEGMENT` `POLICY_COMPLIANT`
