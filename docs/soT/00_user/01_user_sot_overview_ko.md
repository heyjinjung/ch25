문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/OPS
상태: SoT

## 0. SoT 요약
- V2 사용자 SoT는 v2_user를 1차 기준으로 한다.
- 금고 SoT는 user.vault_locked_balance가 단일 원장이다.
- 최신 문서 우선 규칙에 따라 2026-02-04 이후 정책이 최상위다.
- 모든 날짜 로직은 Asia/Seoul 기준, 오전 9시 리셋을 준수한다.

## 1. 목적
유저 영역의 단일 진실 공급원(SoT)과 충돌 처리 규칙을 정의한다.

## 2. 범위
- V2 사용자 모델과 식별자 체계
- 금고 SoT 및 자산 기준
- 세그먼트, HQ 연동, 잠재유저 매칭
- 운영/검증 체크리스트

## 3. SoT 우선순위 및 충돌 규칙
### 3.1 우선순위
1) 최신 일자 문서 (작성일/최종 검토일 기준)
2) docs/SOT/user/변경로그 내 최신 기록
3) 레거시 문서 및 아카이브

### 3.2 충돌 처리 원칙
- 정책 충돌 시 최신 문서의 정책을 우선 적용한다.
- 코드/DB와 문서가 불일치하면 충돌을 명시하고 임시 조치를 기록한다.
- 추정 금지, 로그/제약조건 등 증거를 남긴다.

## 4. 핵심 원칙
### 4.1 V2 Native 단일 SoT
- 유저 식별 기준: v2_user.cc_id
- 동일 ID 원칙: v2_user.id는 레거시 user.id와 1:1 일치
- 신규 로직은 v2_user 기준으로 구현한다.

### 4.2 금고 SoT
- 금고 단일 원장: user.vault_locked_balance
- V2 신규 로직은 vault_locked_balance만 write 한다.

### 4.3 타임존/운영일
- 모든 비즈니스 로직은 KST 기준이다.
- 운영일 리셋은 09:00 KST이다.

## 5. 시스템 현황 요약
### 5.1 최신 통합 변경점
- 2026-02-04: 레벨/XP/입금 누적이 v2_user로 단일화됨.
- 금고 SoT는 user.vault_locked_balance 유지.

### 5.2 대표 코드 매핑
- 사용자 서비스: app/v2/services/user_service.py
- 금고 서비스: app/v2/services/vault_service.py
- 레벨/XP: app/v2/services/level_xp_service.py
- CC 입금: app/v2/services/admin_cc_deposit_service.py

## 6. SoT 맵
### 6.1 사용자 식별/기본 정보
| 항목 | SoT | 레거시 | 비고 |
| --- | --- | --- | --- |
| 식별자 | v2_user.cc_id | user.external_id | V2 기준 우선 |
| 기본 정보 | v2_user | user | JIT Sync로 1:1 유지 |

### 6.2 금고
| 항목 | SoT | 레거시 | 비고 |
| --- | --- | --- | --- |
| 금고 잔액 | user.vault_locked_balance | - | 단일 원장 |

### 6.3 레벨/XP/입금
| 항목 | SoT | 동기화 대상 |
| --- | --- | --- |
| 레벨 | v2_user.level | user_level_progress.level |
| XP | v2_user.xp | user_level_progress.xp |
| 입금 누적 | v2_user.total_charge_amount | external_ranking_data.deposit_amount |

## 7. 정합성 상태
### 7.1 정합성 지표
- 식별 체계: 정상
- 금고 SoT: 정상
- 세그먼트: 정상(NEW 보호 정책 포함)
- 제재 상태: 서비스 계산식(주의)

### 7.2 주요 리스크
- benefits_suspended는 DB 필드가 아니라 계산식이다.
- FK/INDEX 누락 시 운영 장애가 발생한다.
- 세그먼트 배치 누락 시 오지급 위험이 있다.

## 8. SoT 수립일/변경일
- 최초 수립: 2026-01-19 (V2 User 최소 필드)
- 최신 변경: 2026-02-04 (레벨/XP/입금 단일화)
- 통합 재작성: 2026-02-07 (아카이브 통합)

## 9. 코드베이스 매핑 상세
### 9.1 백엔드
- 사용자 모델: app/v2/models/user.py
- 세그먼트 모델: app/v2/models/v2_user_segment.py
- 사용자 서비스: app/v2/services/user_service.py
- 금고 서비스: app/v2/services/vault_service.py
- 레벨/XP 서비스: app/v2/services/level_xp_service.py

### 9.2 어드민
- 유저 관리 API: app/v2/api/admin/user_routes.py
- 세그먼트 API: app/v2/api/admin/segment_routes.py
- 입금 API: app/v2/api/admin/economy_routes.py

### 9.3 프론트엔드
- 유저 목록: src/v2/admin/pages/users/UserListPage.tsx
- 유저 상세: src/v2/admin/pages/users/UserDetailDrawer.tsx

## 10. 정합성 항목 상세
### 10.1 식별자 정합성
- v2_user.id는 user.id와 동일해야 한다.
- cc_id는 유저 식별의 1차 기준이다.

### 10.2 금고 정합성
- 신규 write는 vault_locked_balance만 사용한다.
- 다른 금고 필드는 read-only로 취급한다.

### 10.3 레벨/XP 정합성
- v2_user.level, v2_user.xp가 기준이다.
- user_level_progress는 동기화 대상이다.

## 11. 운영 상태 요약
### 11.1 정상 상태
- 로그인 성공
- 유저 상세 조회 정상
- 금고 상태 조회 정상

### 11.2 경고 상태
- v2_user 미존재
- 세그먼트 배치 미실행
- FK 제약조건 오류

## 12. 정책/구현 충돌 표기 규칙
- 🔴 정책/구현 충돌: 즉시 기록
- 🟡 정합성 검토 필요: 추후 정비 필요
- ✅ 정합: 최신 정책과 일치

## 13. 운영 체크리스트
- v2_user와 user의 ID 불일치 여부 점검
- vault_locked_balance write 경로 점검
- 세그먼트 배치 실행 여부 점검
- KST 09:00 리셋 적용 여부 점검
- 레거시 경로 호출 여부 점검
- FK/INDEX 누락 점검

## 14. 샘플 운영 점검 항목
- 로그인 실패율 급증 여부
- 신규 유저 생성 후 v2_user 생성 여부
- 유저 상세 조회 성능 저하 여부
- 세그먼트 통계 값 불일치 여부

## 15. 결론
본 문서는 유저 SoT의 상위 원칙과 정합성 기준을 제공한다.
하위 문서에서 세부 규칙과 실행 가이드를 확장한다.

## 16. 데이터 흐름 개요
### 16.1 로그인 흐름
1) 인증 요청
2) v2_user 조회
3) 미존재 시 JIT Sync
4) 토큰 발급 및 응답

### 16.2 입금 흐름
1) 외부 누적 입금 입력
2) 델타 계산
3) 금고/XP/미션 동기화
4) 일별 델타 기록

### 16.3 세그먼트 흐름
1) HQ CSV Import 또는 배치 실행
2) 세그먼트 분류
3) v2_user_segment 갱신
4) 운영 대시보드 반영

## 17. 운영/검증 표준
### 17.1 일일 점검
- 신규 유저 v2_user 생성율
- 세그먼트 배치 실행 여부
- 금고 SoT write 경로 이상 여부

### 17.2 주간 점검
- FK/INDEX 누락 점검
- 레거시 경로 사용량 점검
- 세그먼트 분류 정확도 샘플 확인

## 18. 샘플 응답 스키마
### 18.1 유저 기본 응답
```json
{
	"id": 123,
	"cc_id": "cc001",
	"nickname": "level",
	"level": 7,
	"xp": 120,
	"vault_locked_balance": 50000
}
```

### 18.2 세그먼트 응답
```json
{
	"user_id": 123,
	"segment": "NEW",
	"pending_segment": "VIP",
	"updated_at": "2026-02-07T09:01:00+09:00"
}
```

## 19. 관련 정책 링크
- [세그먼트 정책](변경로그/v2_user_segment_policy_sot_ko.md)
- [유저 삭제/퍼지](변경로그/20260126_user_delete_api_path_fix.md)

## 20. 제한 사항
- benefits_suspended는 계산식이므로 API/FE 표시 기준을 명확히 유지한다.
- 신규 유저 7일 보호 정책은 세그먼트 로직에 우선한다.
- 금고 SoT는 V2User 컬럼이 아니라 user 테이블을 사용한다.

## 21. 용어
- SoT: 단일 진실 공급원
- JIT Sync: 필요 시점 동기화
- Operational Day: KST 09:00 기준 운영일

## 21. 참고 문서
- [user 변경로그](변경로그/02.user.md)
- [유저 SoT 원본](아카이브/02.user.md)
- [유저 일관성 가이드](아카이브/user_consistency_guide.md)

## 22. 변경 이력
- v1.0 (2026-02-07): 아카이브 통합 SoT 5문서 중 1권으로 작성
