# HQ Margin 데이터 연동 상세 설계 - Phase 3: Prospective User 관리

**문서 타입**: Detailed Design / Learned SoT
**도메인**: CRM / User Acquisition
**작성일**: 2026-01-31
**상태**: 설계 완료

---

## 1. 목적 (Objective)

본사 데이터에는 고가치(VIP) 고객으로 분류되어 있으나, 아직 텔레그램(V2) 시스템에 가입하지 않은 유저들을 추적하고 관리하여 이들의 가입 시 즉각적인 혜택(Golden Hour, VIP 혜택)을 제공하기 위한 시스템을 구축함.

## 2. 데이터 모델링 (Data Modeling)

### 2.1 [NEW] `hq_prospective_user` 테이블
미가입 잠재 고객 정보를 저장하는 전용 테이블.

- **Primary Key**: `id` (Auto-increment)
- **Matching Key**: `nickname` (가입 시 연동을 위한 유일한 고리)
- **Identity**: `cc_id` (본사 고유 아이디)
- **Metrics**: `total_margin`, `total_charge`, `segment` (VIP, AT_RISK 등)
- **Status**: `is_joined` (V2 가입 시 TRUE로 전환)

---

## 3. 핵심 프로세스 (Core Process)

### 3.1 임포트 시 미가입자 분류 로직
1. CSV 레코드를 읽어 `V2User`를 검색 (아이디 또는 닉네임 기반).
2. **일치 유저 없음**: `hq_prospective_user` 테이블로 이동.
   - 이미 해당 닉네임의 prospect가 있다면 마진 데이터 갱신 (UPSERT).
3. **일치 유저 존재**: `v2_user_segment` 테이블 갱신 (Phase 1/2 로직).

### 3.2 닉네임 중복 방어 알고리즘 (에러 감소)
- 미가입자 등록 시 본사 데이터 내에 중복 닉네임이 발견되면, `cc_id`를 함께 기록하고 가입 시 `cc_id` 확인 절차를 거치거나 가장 마진이 높은 데이터를 기준으로 함.
- 텔레그램 가입 유저와 매칭 시, 동명이인 방지를 위해 로깅 강화 및 수동 매칭 도구(Admin 도구) 제공 여지 남겨둠.

---

## 4. 운영 활용 (Business Logic)
- **마케팅 유도**: 대시보드에서 가입하지 않은 잠재 VIP 리스트를 확인하고, 이들을 유입시키기 위한 캠페인 기획.
- **선제적 권한 부여**: 가입 전 이미 'VIP' 등급으로 낙점해두어 가입과 동시에 VIP 채널 입장 권한이나 특별 쿠폰 자동 발급 시스템 구축.

---

## 5. 단계별 검증
- [ ] 미가입 유저가 CSV 임포트 시 `hq_prospective_user`에 정상 등록되는가?
- [ ] 동일 닉네임 데이터 임포트 시 기존 prospect 정보가 갱신(Update)되는가?
- [ ] 중복 닉네임 발생 시 로깅 및 분류 로직이 정확히 작동하는가?
