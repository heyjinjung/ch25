# 팀배틀 관리자 닉네임 조회 기능 추가

**작성일**: 2026-01-26
**관련 영역**: Team Battle Admin
**변경 유형**: 기능 개선

## 변경 개요

팀배틀 관리자 페이지에서 유저 강제 가입/탈퇴 시 기존에는 유저 ID만 입력 가능했으나, 닉네임으로도 유저를 조회할 수 있도록 개선했습니다.

## 문제점

- 기존: 팀배틀 멤버 강제 가입/탈퇴 시 유저 ID만 입력 가능
- 운영자가 닉네임만 알고 있는 경우, 별도로 유저 검색 후 ID를 확인해야 하는 번거로움

## 해결 방안

### 1. 프론트엔드 수정

**파일**: `src/v2/admin/pages/game/AdminTeamBattlePage.tsx`

#### Phase 1: 초기 구현 주요 변경사항

1. **유저 식별자 조회 API 활용**
   - 기존에 구현된 `resolveAdminUserIdentifier` API 활용
   - 닉네임, 유저 ID, telegram_id 등 다양한 식별자로 유저 조회 가능

2. **입력 필드 개선**
   - 입력 타입을 `number`에서 일반 `text`로 변경
   - placeholder: "유저 ID 또는 닉네임"으로 안내

3. **자동 조회 로직**
   ```typescript
   // 숫자가 아닌 입력이 들어오면 닉네임으로 간주하고 조회
   if (!/^\d+$/.test(forceJoinForm.userId.trim())) {
     const resolved = await resolveAdminUserIdentifier(forceJoinForm.userId.trim());
     userId = resolved.userId;
     setResolvedJoinUserId(userId);
   }
   ```

4. **조회 결과 표시**
   - 닉네임으로 조회 성공 시 확인된 유저 ID를 화면에 표시
   - 조회 실패 시 에러 메시지 표시

5. **양방향 지원**
   - **멤버 강제 가입**: 닉네임 또는 ID 입력 → 유저 조회 → 팀 가입
   - **멤버 강제 탈퇴**: 닉네임 또는 ID 입력 → 유저 조회 → 팀 탈퇴

#### Phase 2: 검색 버튼 및 유저 정보 카드 추가 (2차 개선)

1. **검색 전용 핸들러 분리**
   ```typescript
   const handleSearchJoinUser = async () => {
     const resolved = await resolveAdminUserIdentifier(forceJoinForm.userId.trim());
     setResolvedJoinUserInfo({
       userId: resolved.userId,
       nickname: resolved.nickname,
       externalId: resolved.externalId,
     });
   };
   ```

2. **검색 버튼 UI 추가**
   - 입력 필드 옆에 "조회" 버튼 배치
   - `flex` 레이아웃으로 입력과 버튼을 수평 정렬

3. **유저 정보 카드 컴포넌트**
   ```tsx
   {resolvedJoinUserInfo && (
     <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
       <span className="text-xs text-emerald-400 font-semibold">조회된 유저 정보</span>
       <div className="text-sm text-white space-y-0.5">
         <div>닉네임: {resolvedJoinUserInfo.nickname}</div>
         <div>유저 ID: {resolvedJoinUserInfo.userId}</div>
         <div>External ID: {resolvedJoinUserInfo.externalId}</div>
       </div>
     </div>
   )}
   ```

4. **Enter 키 지원**
   ```typescript
   onKeyDown={(e) => {
     if (e.key === "Enter") {
       handleSearchJoinUser();
     }
   }}
   ```

5. **입력값 변경 시 초기화**
   ```typescript
   onChange={(e) => {
     setForceJoinForm({ ...forceJoinForm, userId: e.target.value });
     setResolvedJoinUserId(null);
     setResolvedJoinUserInfo(null);
   }}
   ```

## 기술 구현

### API 연동

기존 백엔드 API 활용:
```typescript
GET /api/v2/admin/users/resolve?identifier={nickname_or_id}
```

**응답 예시**:
```json
{
  "userId": 12345,
  "nickname": "유저닉네임",
  "externalId": "external_123"
}
```

### 상태 관리

**Phase 1**:
```typescript
const [resolvedJoinUserId, setResolvedJoinUserId] = useState<number | null>(null);
const [resolvedLeaveUserId, setResolvedLeaveUserId] = useState<number | null>(null);
```

**Phase 2 (2차 개선)**:
```typescript
const [resolvedJoinUserInfo, setResolvedJoinUserInfo] = useState<{
  userId: number;
  nickname: string;
  externalId: string;
} | null>(null);
const [resolvedLeaveUserInfo, setResolvedLeaveUserInfo] = useState<{
  userId: number;
  nickname: string;
  externalId: string;
} | null>(null);
```

### 사용자 경험 개선

**Phase 1**:
- 입력 시 기존 조회 결과 초기화
- 조회 성공 시 확인 메시지 표시
- 작업 완료 후 폼 자동 초기화

**Phase 2 (2차 개선)**:
- "조회" 버튼으로 명시적 검색 액션
- Enter 키로 빠른 검색
- 유저 정보 카드로 시각적 확인
- 입력값 변경 시 즉시 조회 결과 초기화
- 조회와 실행을 명확히 분리하여 오작업 방지

## 검증 항목

### Phase 1 (초기 구현):
- [x] 닉네임으로 유저 조회 가능
- [x] 유저 ID로 기존과 동일하게 조회 가능
- [x] 조회 실패 시 에러 메시지 표시
- [x] 조회 성공 시 확인 메시지 표시
- [x] 강제 가입/탈퇴 정상 동작
- [x] 작업 완료 후 폼 초기화

### Phase 2 (2차 개선):
- [x] "조회" 버튼 클릭으로 유저 검색
- [x] Enter 키로 검색 실행
- [x] 유저 정보 카드에 상세 정보 표시 (닉네임, 유저 ID, External ID)
- [x] 입력값 변경 시 조회 결과 자동 초기화
- [x] 조회 없이 실행 시 자동 조회 후 진행 (fallback)
- [x] 강제 가입/탈퇴 모두 동일한 UX 제공
- [x] 작업 완료 후 조회 결과 초기화

## 운영 영향

### 긍정적 영향 (2차 개선 포함)
- 운영자 작업 효율성 대폭 향상
- 별도 유저 검색 과정 불필요
- 실수로 잘못된 유저 ID 입력 방지 (닉네임 확인 가능)
- **검색과 실행 분리로 신중한 작업 가능** (2차 개선)
- **유저 정보 시각적 확인으로 오작업 방지** (2차 개선)
- **Enter 키 지원으로 빠른 검색** (2차 개선)

### 주의사항
- 닉네임이 유일하지 않을 경우 정책에 따라 처리됨 (백엔드 API 정책 준수)
- 대소문자 구분 여부는 백엔드 API 정책에 따름
- 조회 후 유저 정보를 반드시 확인하고 작업 진행 권장

## 후속 작업

- 필요 시 점수 조정 기능에도 동일한 닉네임 조회 기능 추가 검토
- 팀배틀 외 다른 관리자 기능에도 닉네임 조회 확대 적용 검토

## 관련 파일

- `src/v2/admin/pages/game/AdminTeamBattlePage.tsx` - 팀배틀 관리자 페이지
- `src/v2/api/adminApi.ts` - Admin API (resolveAdminUserIdentifier 함수)
- `app/v2/api/admin/user_routes.py` - 백엔드 유저 조회 API

## 참고

- 기존 미션 관리자 페이지에서도 동일한 닉네임 조회 기능이 구현되어 있음
- 일관된 UX 제공을 위해 동일한 패턴 적용
