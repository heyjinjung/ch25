# 프론트엔드 인증 & 보안

- 문서 타입: 프론트엔드 보안 가이드
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, 보안 검토자

## 1. 목적 (Purpose)
- User/Admin 앱의 인증 흐름과 토큰 저장/보호 라우트 정책을 정의해 보안 리스크를 최소화한다.

## 2. 범위 (Scope)
- Scope: 토큰 저장 방식, Axios 인터셉터, 보호 라우트, 민감정보 취급 금지 항목.
- Out of Scope: 백엔드 JWT 발급/검증 로직 상세.

## 3. 용어 정의 (Definitions)
- Protected Route: 인증 필요 라우트.
- HttpOnly Cookie: JS 접근이 불가능한 쿠키(우선 선택).

## 4. 본문 (정책)
- 토큰 저장: HttpOnly 쿠키 우선, 대안으로 localStorage(+CSRF 대응) 가능하나 지양.
- Axios 인터셉터: 401 시 로그인/토큰 만료 처리, Admin은 `/admin/login` 리디렉션.
- 보호 라우트: React Router PrivateRoute/loader에서 토큰 검증 후 접근 허용.
- 민감정보: 토큰/유저정보를 쿼리스트링이나 로그에 남기지 않는다.
- CORS/HTTPS: HTTPS 전제, 쿠키 사용 시 SameSite 설정 고려.

## 5. 예시
```ts
// 보호 라우트 의사 코드
if (!authStore.token) return <Navigate to="/admin/login" replace />;
return <Outlet />;
```

## 6. Validation / Checklist
- [ ] 토큰 저장/전달 방식이 문서에 정의되어 있는가?
- [ ] 401 처리/리다이렉트 규칙이 명시되어 있는가?
- [ ] Protected Route 구현 패턴이 설명되어 있는가?
- [ ] 민감정보 로그/쿼리스트링 금지 규칙이 포함되어 있는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. 토큰 저장, 보호 라우트, 401 처리, 민감정보 규칙 정의.
