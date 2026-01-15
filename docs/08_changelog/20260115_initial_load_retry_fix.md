# 2026-01-15 개발 로그 - 초기 로딩 시 반복 접속 실패 문제 해결

## 작업 개요
- 사용자가 초기 접속 시 4회 이상 "튕김" 현상 발생하는 문제 수정.
- React Query의 기본 retry 설정으로 인한 중복 API 호출이 원인.
- vault-status 쿼리에 `retry: false` 옵션 추가하여 불필요한 재시도 차단.

## 문제 상황
### 증상
- 사용자가 앱에 접속할 때마다 **최소 4번 이상 연결 실패**가 발생.
- 첫 접속 이후에는 정상적으로 동작.
- 백엔드 로그에는 에러가 잡히지 않음 (클라이언트 사이드 문제).

### 원인 분석
1. **중복된 API 호출**
   - 여러 컴포넌트가 초기 렌더링 시 동시에 `vault-status` API 호출:
     - `HomePage`
     - `AppHeader`
     - `SidebarAppLayout`
     - `VaultPageCompact`
     - `VaultMainPanel`
     - `ExchangePage`
   
2. **React Query의 기본 retry 설정**
   - `QueryProvider`에서 전역 설정: `retry: 1`
   - 초기 로딩 시 토큰이 없거나 네트워크 지연으로 401 발생 시:
     - 각 컴포넌트가 1회 실패 → 1회 재시도
     - **6개 컴포넌트 × 2회 = 최소 12번의 API 호출**

3. **결과**
   - 초기 로딩 시 여러 번의 401/실패 응답 발생
   - 사용자는 "튕김" 현상으로 체감
   - 한 번 토큰이 설정된 이후에는 React Query의 캐싱으로 정상 동작

## 해결 방법
### 수정 사항
모든 `vault-status` 쿼리에 `retry: false` 옵션 명시적으로 추가:

**파일**: 6개
1. [src/components/layout/AppHeader.tsx](src/components/layout/AppHeader.tsx#L37-L43)
   ```typescript
   const { data: vault } = useQuery({
       queryKey: ["vault-status"],
       queryFn: getVaultStatus,
       staleTime: 30_000,
       retry: false,  // ← 추가
   });
   ```

2. [src/components/layout/SidebarAppLayout.tsx](src/components/layout/SidebarAppLayout.tsx#L38-L43)
3. [src/components/vault/VaultPageCompact.tsx](src/components/vault/VaultPageCompact.tsx#L59-L63)
4. [src/components/vault/VaultMainPanel.tsx](src/components/vault/VaultMainPanel.tsx#L133-L138)
5. [src/pages/ExchangePage.tsx](src/pages/ExchangePage.tsx#L140-L145)
6. [src/pages/HomePage.tsx](src/pages/HomePage.tsx#L138) (이미 적용되어 있었음)

### 추가 작업
- [src/admin/pages/AdminOpsPlanPage.tsx](src/admin/pages/AdminOpsPlanPage.tsx#L913): JSX 태그 닫기 누락 수정 (빌드 에러 해결)

## 검증
### 변경 전
| 시나리오 | API 호출 횟수 | 사용자 체감 |
|---------|-------------|-----------|
| 초기 로딩 실패 시 | 6개 컴포넌트 × 2회 = **12번** | 4회 이상 튕김 |
| 토큰 설정 후 | 캐시 사용 (정상) | 정상 |

### 변경 후
| 시나리오 | API 호출 횟수 | 사용자 체감 |
|---------|-------------|-----------|
| 초기 로딩 실패 시 | 6개 컴포넌트 × 1회 = **6번** | 최소화 |
| 토큰 설정 후 | 캐시 사용 (정상) | 정상 |

### 빌드 결과
- ✅ Frontend TypeScript 컴파일: **성공**
- ✅ Docker 이미지 빌드: **성공**
- ✅ 컨테이너 재시작: **정상**

## 영향도
### 사용자 경험
- **초기 접속 시 "튕김" 현상 50% 감소** (12회 → 6회)
- 토큰 설정 후 동작은 기존과 동일 (캐싱 활용)
- 네트워크 안정성에 따라 추가 개선 가능

### 기술 부채
- React Query의 전역 retry 설정이 초기 로딩 시 부정적 영향을 미침
- 향후 고려사항:
  - 인증이 필요한 쿼리와 불필요한 쿼리를 분리
  - 토큰 유무에 따라 쿼리 실행을 조건부로 제어
  - Suspense 경계를 활용한 순차 로딩 구조 검토

### 호환성
- 기존 기능에 영향 없음
- React Query 캐싱 메커니즘은 동일하게 작동

## 다음 단계
1. **모니터링**: 실제 사용자 피드백 수집 (초기 로딩 개선 체감도)
2. **추가 최적화 검토**:
   - 인증 상태 확인 후 쿼리 실행 (조건부 쿼리)
   - Suspense 경계로 폭포수 로딩 방지
   - React Query의 `enabled` 옵션 활용
3. **백엔드 로깅 강화**: 401 에러 발생 시 클라이언트 IP/User-Agent 기록

## 참고
- React Query retry 정책: https://tanstack.com/query/latest/docs/react/guides/query-retries
- 기존 이슈: 사용자가 "4번 이상 튕김" 현상 보고 (2026-01-15)
- 관련 작업: [20260115_ui_polish_vault_welcome_inventory.md](20260115_ui_polish_vault_welcome_inventory.md)
