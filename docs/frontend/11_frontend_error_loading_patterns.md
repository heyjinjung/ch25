# 에러 & 로딩 패턴

- 문서 타입: 프론트엔드 에러/로딩 가이드
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, QA

## 1. 목적 (Purpose)
- 공통 에러/로딩 UI 패턴을 정의하여 사용자 경험을 통일하고, QA에서 기대 동작을 명확히 한다.

## 2. 범위 (Scope)
- Scope: 페이지/컴포넌트 로딩, API 에러 처리, 장애 시 fallback UI, 재시도 전략.
- Out of Scope: 백엔드 에러 코드 정의(별도 문서 참조).

## 3. 용어 정의 (Definitions)
- Full-page Loading: 전체 화면 스피너/스켈레톤.
- Inline Error: 특정 섹션/카드 내부의 오류 표시.

## 4. 본문 (패턴)
- 로딩:
  - 페이지 진입 시 full-page spinner 또는 skeleton.
  - 버튼 액션 시 버튼 단위 로딩(아이콘 스피너 + disabled).
- 에러:
  - API 4xx: 사용자 메시지 + 재시도/홈 이동 버튼.
  - API 5xx/네트워크: 재시도 버튼 + 문의 안내.
  - today-feature 없음: 안내 문구/이미지 + 홈으로 이동 버튼.
- 재시도: React Query `retry` 옵션(기본 1~2회) + UI 재시도 버튼.
- 로깅: 콘솔/모니터링 연동 지점 명시(필요 시 Sentry 등).

## 5. 예시
```tsx
if (isError) {
  return <ErrorState message={errorMessage} onRetry={() => refetch()} />;
}
```

## 6. Validation / Checklist
- [ ] 페이지/버튼 로딩 패턴이 정의되었는가?
- [ ] 4xx/5xx/네트워크 에러별 UI 대응이 명시되었는가?
- [ ] today-feature 없음 등의 특수 에러 상태가 포함되었는가?
- [ ] 재시도/모니터링 연동 포인트가 언급되었는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. 로딩/에러 패턴, 재시도 전략 정의.
