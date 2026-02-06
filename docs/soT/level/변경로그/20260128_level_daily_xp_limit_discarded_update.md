# 레벨 일일 XP 획득 한도 폐기 업데이트

**작성일**: 2026-01-28
**상태**: ✅ 적용 완료 (SoT 반영 완료)
**영향 범위**: CC 입금 동기화 → XP 적립 로직 (V2 어드민)

---

## 1. 변경 요약

- 기존 CC 입금 시 적용되던 **일일 최대 XP 적립 제한(1000 XP -> 300 XP -> 100 XP)을 완전히 폐기**했다.
- 사용자는 당일 입금액에 비례하여 제한 없이 레벨포인트(GAME_XP)를 적립할 수 있다.
- 관련 SoT 문서(`v2_level_reward_table_sot_ko.md`, `v2_level_point_extension_sot_ko.md`) 및 운영 매핑 문서(`07.level.md`)에 "한도 없음" 상태를 반영 완료했다.

---

## 2. 증거 기반 확인 (Systematic Debugging)

### 2.1 코드 확인 (Evidence)
- `app/v2/services/admin_cc_deposit_service.py` 내 `upsert_many` 메서드에서 `deposit_steps`를 `MAX_STEPS_PER_DAY`로 제한하던 clamp 로직이 제거됨을 확인.
- `app/core/config.py`에서 관련 설정값(`external_ranking_deposit_max_xp_per_day` 등)이 제거/비활성화됨을 확인.

### 2.2 SoT 정합성 (Alignment)
- `v2_level_reward_table_sot_ko.md`: 일일 최대 100 XP 제한 문구 제거 및 "제한 없음" 명시.
- `v2_level_point_extension_sot_ko.md`: 일일 최대 100 XP 제한 문구 제거 및 "일일 한도 폐기됨" 명시.
- `07.level.md` (Ops Check): "일일 한도 폐기" 항목 체크 및 매핑 데이터 업데이트.

---

## 3. 변경 파일 및 문서

### 관련 문서
- [v2_level_reward_table_sot_ko.md](../../../01_core/v2_level_reward_table_sot_ko.md)
- [v2_level_point_extension_sot_ko.md](../../../01_core/v2_level_point_extension_sot_ko.md)
- [07.level.md](./07.level.md)

### 관련 서비스
- [admin_cc_deposit_service.py](../../../../../../app/v2/services/admin_cc_deposit_service.py)

---

## 4. 검증 결과
- 서비스 로직에서 `xp_to_add` 계산 시 어떠한 일일 누적치 비교나 clamp가 수행되지 않음을 확인하여 "무제한 적립" 정책이 올바르게 구현되었음을 검증함.

---

## 변경 이력
- 2026-01-28: 레벨 일일 XP 한도(300XP/100XP) 폐기 문서화 및 SoT 정렬
