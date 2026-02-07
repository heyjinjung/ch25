# 20260127_유저_로그인_V2_JIT_동기화_구현_보고서

## 1. 개요
어드민(V2 기반)에서 생성된 유저가 V2 전용 테이블(`v2_user`)에 없어 발생하는 로그인 실패(404 USER_NOT_FOUND) 문제를 해결하기 위해 **V2 JIT(Just-In-Time) 유저 동기화 로직**을 구현했습니다.

## 2. 해결 방법: JIT Sync (적시 동기화)
V2 인증 과정에서 유저를 찾지 못할 경우, 즉시 V2 유저 데이터 소스를 조회하여 데이터를 복제 생성합니다.

### 주요 변경 파일
- `app/v2/services/user_service.py`: `get_or_create_v2_user_from_legacy` 신규 엔진 추가.
- `app/v2/services/auth_service.py`: `issue_token` 시 동기화 로직 연동.
- `app/v2/api/dev_login.py`: 개발용 로그인에도 동일 로직 반영.

## 3. 검증 결과 (Unit Test)
- **테스트 대상**: `cc001` (닉네임: level)
- **이전 상태**: `user` 테이블에만 존재, `v2_user`에는 없음.
- **테스트 결과**: 
    - `V2UserService` 호출 직후 `v2_user` 레코드 자동 생성 확인.
    - 닉네임, 텔레그램 정보 등 주요 필드 정상 복사 확인.
    - `v2_user.id`가 성공적으로 할당됨.

## 4. 운영 가이드
- **서버 반영**: 본 수정 사항은 백엔드 소스 코드 변경을 포함하므로, 변경된 로직을 적용하기 위해서는 **백엔드 서버(FastAPI) 재시작** 또는 **도커 빌드**가 필요합니다.
- **향후 과제**: V2 어드민에서 유저 생성 시 즉시 V2 유저를 생성하도록 로직 업데이트 권장.

---
*상세 매핑/정책은 [20260127_user_table_unification_plan.md](20260127_user_table_unification_plan.md)를 참조하세요. (V2 정책 반영)*
