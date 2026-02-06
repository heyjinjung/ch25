# [Frontend] 잠재 유저 목록 조회 제한 (100개) 트러블슈팅

**작성일:** 2026-02-04
**우선순위:** P1

## 증상 정의 (필수)
| 항목 | 내용 |
|---|---|
| 대상 기능 | Admin > Marketing > 잠재 유저 매칭 (HQ 잠재 유저 탭) |
| HTTP Status | 200 OK |
| 영향 범위 | 전체 관리자 (잠재 유저가 100명 이상인 경우) |
| 재현 빈도 | 항상 |

## 증상
- 잠재 유저 총 수가 100명을 초과함 (예: 175명)에도 불구하고, 목록에는 **정확히 100명**까지만 표시됨.
- "새로고침"을 해도 100명 이상 로드되지 않음.
- 페이지네이션 UI가 없어 다음 데이터를 볼 수 없음.

## 근본 원인 (증거 기반)
1.  **Frontend Code Hardcoding**:
    - `src/v2/admin/pages/prospect/ProspectLinkingPage.tsx`에서 API 호출 시 `limit=100`으로 고정되어 있었음.
    ```typescript
    params.append("limit", "100");
    ```

2.  **Backend Validation Limit**:
    - `app/v2/api/admin/prospect_routes.py`에서 `limit` 파라미터가 최대 `200`으로 제한되어 있었음.
    ```python
    limit: int = Query(50, ge=1, le=200)
    ```

3.  **결과**: 프론트엔드가 100을 요청하면 백엔드는 100을 반환하고, 이보다 많은 데이터는 잘림.

## 해결 방법
### Immediate Fix
- **Backend**: `limit`의 최대 허용치를 `1000`으로 상향.
- **Frontend**: API 호출 시 `limit`를 `1000`으로 상향 요청.

### Long-term Fix
- **Pagination UI 구현**: 1000명 이상의 데이터가 쌓일 경우를 대비하여 `offset` 기반 페이지네이션 UI (이전/다음 버튼) 추가 필요.

## 검증 방법
- 수정 후 Admin 페이지 새로고침.
- 네트워크 탭에서 `/api/v2/admin/prospect/prospects` 요청 파라미터가 `limit=1000`인지 확인.
- 응답 데이터(`prospects`) 배열 길이가 100을 초과하는지 확인.
- 화면에 100개 이상의 리스트가 렌더링되는지 확인.

## 관련 문서 (SoT/learned)
- [Prospect Linking Service](../../../app/v2/services/prospect_linking_service.py)
- [Frontend Page](../../../src/v2/admin/pages/prospect/ProspectLinkingPage.tsx)
