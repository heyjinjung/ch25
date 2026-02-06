# V2 유저 데이터 정합성 교정 단계별 실행 계획

**작성일**: 2026-01-27
**목표**: 기술 기준 문서(SoT)와 실제 코드 로직을 단일 정합성 원칙으로 일치시킴.

## Step 1: 문서 및 개념 정립 (완료)
- [x] `v2_user_sot_ko.md` 재학습 및 V2 SoT 원칙 확인.
- [x] "V2 Native 단일 SoT (Legacy 정합성 보장)" 체계로 명칭 및 개념 통일.
- [x] `20260127_user_table_unification_plan.md` 작성.

## Step 2: 데이터 정합성 긴급 교정 (완료)
- [x] 'cc001' (level) 유저 ID 불일치(16 vs 17) 확인 및 수동 정정 (17로 통합).
- [x] `fix_user_id_mismatch_v2.py` 실행 완료.

## Step 3: 서비스 로직 영구 교정 (완료)
- [x] `V2UserService.get_or_create_v2_user_from_legacy` 수정: ID 명시적 승계.
- [x] `V2AuthService` 및 `dev_login.py`에 수정된 서비스 메서드 적용.

## Step 4: 잔여 정합성 검토 및 최신화 (진행 중)
- [x] `02.user.md` 내의 부가 설명 및 주석 정정 (V2 Native 원칙 명시).
- [x] `user_consistency_guide.md` 최신화.
- [x] 불필요하게 생성된 임시/오류 보고서 파일 정리 (사용자 확인 후).

## Step 5: 최종 통합 검증
- [x] 신규 유저 생성(V2 Admin) -> V2 로그인 -> ID/데이터 일치 여부 전수 검증.
