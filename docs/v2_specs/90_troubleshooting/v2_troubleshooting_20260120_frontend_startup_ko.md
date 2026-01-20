# V2 Admin Frontend 초기 구동 트러블슈팅 리포트

**문서 번호**: TR-20260120-02
**작성일**: 2026-01-20
**작성자**: Antigravity Agent
**상태**: 해결됨 (Resolved)
**관련**: `src/v2/admin/pages/dashboard/OpsDashboard.tsx`, `Configuration`

---

## 1. 개요 (Overview)
V2 Admin 프론트엔드(`localhost:5173/v2/admin`) 초기 구동 과정에서 발생한 3가지 연결 및 런타임 오류에 대한 원인 분석과 조치 내용을 기록한다.

## 2. 이슈 상세 및 해결 (Issues & Resolutions)

### 2.1 무한 리다이렉트 루프 (Infinite Redirect Loop)
*   **증상**: 로그인 후 대시보드 진입 시 URL이 `/v2/admin/login/dashboard/dashboard...` 형태로 무한 반복되거나 브라우저가 멈춤.
*   **원인**: `OpsDashboard.tsx` 내 Quick Action 버튼의 경로 설정 오류.
    *   **잘못된 코드**: `navigate("/admin/v2/system/modals")` -> V1 Admin Router(`/admin/*`)로 진입 시도.
    *   **라우터 충돌**: V1 라우터가 알 수 없는 경로를 다시 `/v2/...`로 리다이렉트하거나 메인 라우터와 경합하면서 루프 발생 추정.
*   **해결**: 모든 내부 링크 경로를 V2 표준(`navigate("/v2/admin/...")`)으로 수정.
    ```typescript
    // Before
    onClick={() => navigate("/admin/v2/users")}
    
    // After
    onClick={() => navigate("/v2/admin/users")}
    ```

### 2.2 연결 거부 (Connection Refused - Port 5173)
*   **증상**: 브라우저에서 `localhost:5173` 접속 시 `ERR_CONNECTION_REFUSED` 발생.
*   **원인**: 유저가 "서버 실행 중"으로 인지했으나, 실제로는 Docker 컨테이너나 로컬 Node 프로세스가 실행되고 있지 않았음 (`docker ps`로 MySQL만 실행 중임을 확인).
*   **해결**: 에이전트가 백그라운드에서 `npm run dev` 명령어를 실행하여 Vite 개발 서버 기동.

### 2.3 대시보드 런타임 크래시 (Dashboard Runtime Crash)
*   **증상**: 대시보드 로드 직후 흰 화면과 함께 `Cannot read properties of undefined (reading 'toLocaleString')` 오류 발생.
*   **원인**: `useOpsStatus` 훅이 반환하는 `status` 객체 내의 `metrics` 또는 `goldenRadar` 데이터가 초기 로드 시점이나 API 응답 지연으로 인해 `undefined` 상태였음에도, 방어 코드 없이 속성에 접근함.
*   **해결**: Optional Chaining (`?.`) 및 Nullish Coalescing (`??`) 연산자를 적용하여 데이터가 없을 경우 기본값을 표시하도록 수정.
    ```tsx
    // Before
    status.metrics.todayRevenue.toLocaleString()
    
    // After
    status?.metrics?.todayRevenue?.toLocaleString() ?? "0"
    ```

## 3. 교훈 및 예방 조치 (Lessons Learned)
1.  **경로 상수화**: `/v2/admin`과 같은 기본 경로(Base Path)를 상수(`ADMIN_BASE_PATH`)로 관리하여 타이핑 오류 방지 필요.
2.  **Safe Navigation**: UI 컴포넌트 개발 시 API 응답이 `null` 또는 `undefined`일 수 있음을 항상 가정하고(특히 Optional Chaining 사용), 스켈레톤 UI나 Fallback 처리를 기본 적용해야 함.
3.  **프로세스 확인**: 연결 오류 시 설정 파일(`vite.config.ts`)부터 확인하기보다, 실제 프로세스 실행 여부(`docker ps`, 포트 확인)를 먼저 검증하는 것이 효율적임.
