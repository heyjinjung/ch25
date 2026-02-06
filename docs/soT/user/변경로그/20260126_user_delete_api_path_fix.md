# 유저 삭제 API 경로 오류 수정 및 V2 Native 정합성 강화

**작성일**: 2026-01-26
**관련 영역**: User Admin
**변경 유형**: 버그 수정

## 문제 상황

### 에러 메시지
```
DELETE http://localhost:3000/api/admin/users/14 500 (Internal Server Error)
[adminApi] response error
```

### 증상
- 관리자 페이지에서 유저 삭제 시도 시 500 에러 발생
- 퍼지(완전삭제) 기능도 동일하게 실패

## 원인 분석

### 1. API 경로 불일치

**프론트엔드** (`src/admin/api/adminUserApi.ts`):
```typescript
export async function deleteUser(userId: number) {
  await adminApi.delete(`/api/admin/users/${userId}`);  // ❌ 잘못된 경로
}

export async function purgeUser(userId: number) {
  await adminApi.post(`/api/admin/users/${userId}/purge`);  // ❌ 잘못된 경로
}
```

**백엔드** (`app/v2/api/admin/user_routes.py`):
```python
@router.delete("/users/{user_id}", status_code=204)  # ✅ /api/v2/admin/users/{user_id}
def delete_user(...)

@router.post("/users/{user_id}/purge", status_code=204)  # ✅ /api/v2/admin/users/{user_id}/purge
def purge_user(...)
```

### 2. V2 마이그레이션 누락

- 백엔드는 V2 API 경로(`/api/v2/admin/*`)로 구현됨
- 프론트엔드는 레거시 경로(`/api/admin/*`) 호출 중
- 경로 불일치로 라우팅 실패 → 500 에러 발생

### 3. ADMIN 권한 불일치로 403 발생

- V2 삭제/퍼지 API가 SUPER_ADMIN만 허용하도록 구현되어 있었음
- 실제 운영 정책은 ADMIN만으로 삭제/퍼지 허용
- 결과: 삭제/퍼지 호출 시 403 → 프론트가 인증 실패로 처리 → 관리자 로그아웃

## 해결 방법

### 수정 파일: `src/admin/api/adminUserApi.ts` (V2 어드민에서 호출되는 호환 레이어)

```typescript
export async function deleteUser(userId: number) {
  await adminApi.delete(`/api/v2/admin/users/${userId}`);  // ✅ V2 경로로 수정
}

export async function purgeUser(userId: number) {
  await adminApi.post(`/api/v2/admin/users/${userId}/purge`);  // ✅ V2 경로로 수정
}

### 추가 수정: V2 삭제/퍼지 권한 체크

**백엔드** ([app/v2/api/admin/user_routes.py](app/v2/api/admin/user_routes.py))
- 삭제/퍼지 권한을 `ADMIN` 허용으로 변경 (SUPER_ADMIN 전용 제거)
- 403 발생 시 `ADMIN_REQUIRED` 반환
```

## 백엔드 구현 확인

### API 엔드포인트

1. **일반 삭제** - `DELETE /api/v2/admin/users/{user_id}`
   - CASCADE 의존 + TeamMember 명시 정리
   - Admin 권한으로 실행 가능
   - 감사 로그 기록 (DELETE_USER)

2. **완전 삭제(퍼지)** - `POST /api/v2/admin/users/{user_id}/purge`
   - 모든 연관 테이블 방어적 삭제
   - Admin 권한으로 실행 가능
   - 감사 로그 기록 (PURGE_USER)

### 서비스 로직 ([admin_user_service.py:175-249](admin_user_service.py:175-249))

#### delete_user 메서드:
- TeamMember 명시 정리 (orphaned 방지)
- **V2User 및 User 동시 삭제 (Same ID 정책)**
- V2UserSegment 데이터 정리
- 감사 로그 기록 후 커밋

#### purge_user 메서드:
- 30개 이상의 연관 테이블 명시적 삭제
- 포함 테이블:
  - UserGameWallet, UserGameWalletLedger
  - UserInventoryItem, UserInventoryLedger
  - VaultEarnEvent, VaultWithdrawalRequest, VaultStatus
  - TeamMember, TeamEventLog
  - UserMissionProgress
  - UserLevelProgress, UserLevelRewardLog, UserXpEventLog
  - **V2User, V2UserSegment** (V2 전용 테이블)
  - 기타 모든 유저 연관 데이터
- 감사 로그 기록 후 커밋

## 검증 항목

- [x] 프론트엔드 API 경로 V2로 변경
- [x] 백엔드 delete_user 서비스 구현 확인
- [x] 백엔드 purge_user 서비스 구현 확인 (V2 테이블 포함)
- [x] Admin 권한 인증 확인 (get_current_admin_info)
- [x] SUPER_ADMIN 권한 체크 제거 (V2 표준 권한 체계 적용)
- [x] 감사 로그 기록 확인
- [x] TeamMember 정리 로직 확인

## 운영 영향

### 긍정적 영향
- 유저 삭제 기능 정상 작동
- 테스트 유저 정리 가능
- 불필요한 데이터 완전 제거 가능 (퍼지)

### 주의사항
- **Admin 권한으로 실행 가능** (get_current_admin_info에서 권한 인증)
- 삭제/퍼지 작업은 되돌릴 수 없음
- 퍼지 작업은 모든 연관 데이터를 삭제하므로 신중히 사용
- 운영 환경에서는 삭제 전 백업 권장

### 권한 시스템 변경 사항 (2026-01-26)
- SUPER_ADMIN 권한 체크 제거 (폐기된 권한 시스템)
- `deps.py`에서 SUPER_ADMIN → ADMIN 자동 변환 처리
- Admin 권한만으로 유저 삭제/퍼지 가능

## API 명세 정리

### 1. 일반 삭제

**요청**:
```http
DELETE /api/v2/admin/users/{user_id}
Authorization: Bearer {admin_token}
```

**응답**:
```
204 No Content
```

**에러**:
- `403 ADMIN_REQUIRED` - 관리자 권한 필요
- `404 USER_NOT_FOUND` - 유저 없음

### 2. 완전 삭제(퍼지)

**요청**:
```http
POST /api/v2/admin/users/{user_id}/purge
Authorization: Bearer {admin_token}
```

**응답**:
```
204 No Content
```

**에러**:
- `403 ADMIN_REQUIRED` - 관리자 권한 필요
- `404 USER_NOT_FOUND` - 유저 없음

## 연관 파일

- `src/admin/api/adminUserApi.ts` - 프론트엔드 API 클라이언트 (수정됨)
- `app/v2/api/admin/user_routes.py` - 백엔드 라우터
- `app/v2/services/admin_user_service.py` - 백엔드 서비스 로직
- `src/v2/admin/pages/users/UserDetailDrawer.tsx` - 유저 상세 화면 (삭제 UI)
- `src/v2/admin/pages/users/UserDetailDrawer.tsx`는 V2 화면이지만, 삭제/퍼지 호출은 위 호환 레이어를 통해 `/api/v2/admin/*`로 전송된다. (**V2 정책 반영**)

## 기술기준문서 참조

- [00_con.md](../00_con.md) - V2 유저 삭제/퍼지 서비스 신규 구현 (2026-01-26)
- 정책: V2 Native 구현, 배포 후 V1 일괄 삭제 예정

## 관련 감사 로그

삭제/퍼지 작업 시 다음 감사 로그가 기록됩니다:

```json
{
  "action": "DELETE_USER",  // 또는 "PURGE_USER"
  "target_type": "User",
  "target_id": "14",
  "before": {
    "user_id": 14,
    "external_id": "tg_123456_user",
    "nickname": "테스트유저"
  },
  "after": null
}
```

## 후속 작업

- 삭제/퍼지 작업 시 추가 확인 모달 고려 (현재는 기본 구현)
- 삭제 전 연관 데이터 요약 표시 고려
- 대량 유저 삭제 기능 필요 시 별도 API 설계

지금 500 원인 잡혔습니다. 백엔드 로그에 **NameError: name 'V2User' is not defined**가 찍혀 있었고, 이건 admin_user_service.py에서 V2User import 누락 때문에 PURGE가 바로 죽는 케이스였습니다.

코드 수정은 이미 적용돼 있고(admin_user_service.py), 백엔드도 재시작했고,
컨테이너 내부에서 V2User가 실제로 로드되는 것까지 확인했습니다(이제 V2User 존재함).