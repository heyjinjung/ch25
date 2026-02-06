# troubleshooting 리포트: 프론트엔드 빌드 에러 수정 및 로컬 도커 정리 (2026-02-04)

## 📌 요약
| 항목 | 내용 |
|---|---|
| 작업 일시 | 2026-02-04 16:50 KST |
| 도메인 | FRONTEND / INFRA |
| 상태 | ✅ 완료 |
| 해결 내용 | PasteImportPage.tsx 타입 에러(TS6133) 수정 및 도커 빌드 성공 |

---

## 🔍 작업 내역

### 1. 프론트엔드 빌드 에러 수정
- **에러 메시지**: `src/v2/admin/pages/ops/PasteImportPage.tsx(9,8): error TS6133: 'React' is declared but its value is never read.`
- **원인**: Vite/React 환경에서 JSX 사용 시 `React`를 명시적으로 임포트할 필요가 없으나, `tsc` 설정에서 사용하지 않는 변수로 체크됨.
- **수정**: `PasteImportPage.tsx`에서 사용하지 않는 `React` 임포트 제거.
- **결과**: `docker compose build frontend` 성공.

### 2. 로컬 도커 환경 정리 (Cleanup)
- **조치 내용**:
  - `docker system prune -f`: 사용하지 않는 컨테이너, 네트워크 등 정리.
  - `docker image prune -a -f`: 사용 중이지 않은 모든 이미지 정리.
  - `docker builder prune -f`: 빌드 캐시 초기화.
- **결과**: 로컬 개발 환경 최적화 및 디스크 공간 확보.

---

## 📝 관리 가이드 업데이트
- 최근 린트/타입 체크 설정이 엄격해짐에 따라 사용하지 않는 임포트는 즉시 제거 권장.
- 빌드 실패 시 `docker compose build --no-cache` 전 단계로 소스 코드의 `tsc` 에러 확인 필요.
