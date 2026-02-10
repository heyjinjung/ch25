# 씨씨카지노 SEO 등록 & 점검 가이드

> **문서 타입**: 가이드  
> **버전**: v1.0  
> **작성일**: 2026-02-10  
> **대상**: 운영자  
> **상태**: SoT  

---

## 1. 개요

이 문서는 cc-jm.com (씨씨카지노 공식 이벤트 플랫폼)의 SEO 등록, 점검, 유지보수를 위한 단계별 가이드입니다.

---

## 2. 사전 준비 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| `index.html` meta title/description | ✅ 완료 | 2026-02-10 적용 |
| Open Graph (og:) 메타 태그 | ✅ 완료 | og:title, og:description, og:image |
| Twitter Card 메타 태그 | ✅ 완료 | summary_large_image |
| JSON-LD 구조화 데이터 | ✅ 완료 | FAQPage 스키마 |
| robots.txt | ⬜ 미설정 | 3단계 참고 |
| sitemap.xml | ⬜ 미설정 | 4단계 참고 |
| Google Search Console 등록 | ⬜ 미등록 | 5단계 참고 |
| Naver Search Advisor 등록 | ⬜ 미등록 | 6단계 참고 |

---

## 3. robots.txt 생성

nginx가 서빙하는 정적 파일로 `robots.txt`를 추가합니다.

### 3.1 파일 생성

`public/robots.txt` (Vite 빌드 시 `dist/` 루트에 복사됨):

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://cc-jm.com/sitemap.xml
```

### 3.2 확인

배포 후 브라우저에서 `https://cc-jm.com/robots.txt` 접속하여 내용 노출 확인.

---

## 4. sitemap.xml 생성

### 4.1 파일 생성

`public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cc-jm.com/</loc>
    <lastmod>2026-02-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cc-jm.com/home</loc>
    <lastmod>2026-02-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 4.2 확인

배포 후 `https://cc-jm.com/sitemap.xml` 접속하여 XML이 정상 출력되는지 확인.

---

## 5. Google Search Console 등록

### 5.1 접속 & 속성 추가

1. [Google Search Console](https://search.google.com/search-console) 접속
2. **속성 추가** → **URL 접두어** 선택 → `https://cc-jm.com` 입력

### 5.2 소유권 인증 (택 1)

| 방법 | 설정 위치 | 권장 |
|------|-----------|------|
| **HTML 파일 업로드** | `public/googleXXXXXXX.html` 파일 다운로드 후 추가 | ★ 가장 쉬움 |
| **HTML 메타 태그** | `index.html`의 `<head>`에 `<meta name="google-site-verification" content="...">` 추가 | ★★ 권장 |
| **DNS TXT 레코드** | 도메인 DNS 관리에서 TXT 레코드 추가 | 도메인 관리 가능 시 |

#### 5.2.1 메타 태그 방식 (권장)

Google Search Console에서 제공하는 코드를 복사하여 `index.html`의 `<head>` 안에 삽입:

```html
<meta name="google-site-verification" content="여기에_구글에서_제공한_코드_입력" />
```

### 5.3 Sitemap 제출

1. Search Console 좌측 메뉴 → **Sitemaps**
2. URL 입력: `sitemap.xml`
3. **제출** 클릭
4. 상태가 "성공"으로 표시되면 완료

### 5.4 색인 요청

1. 상단 검색창에 `https://cc-jm.com/` 입력
2. 결과 화면에서 **"색인 생성 요청"** 클릭
3. 크롤링 → 색인 완료까지 보통 **1~7일** 소요

---

## 6. Naver Search Advisor 등록

### 6.1 접속 & 사이트 추가

1. [Naver Search Advisor](https://searchadvisor.naver.com/) 접속 (네이버 로그인)
2. **웹마스터 도구** → **사이트 추가** → `https://cc-jm.com` 입력

### 6.2 소유권 인증 (택 1)

| 방법 | 설정 위치 |
|------|-----------|
| **HTML 파일 업로드** | `public/naverXXXXXXX.html` 파일 다운로드 후 추가 |
| **HTML 메타 태그** | `index.html`의 `<head>`에 `<meta name="naver-site-verification" content="...">` 추가 |

#### 메타 태그 방식:

```html
<meta name="naver-site-verification" content="여기에_네이버에서_제공한_코드_입력" />
```

### 6.3 Sitemap 제출

1. 좌측 메뉴 → **요청** → **사이트맵 제출**
2. URL: `https://cc-jm.com/sitemap.xml`
3. 제출

### 6.4 웹 페이지 수집 요청

1. 좌측 메뉴 → **요청** → **웹 페이지 수집**
2. `https://cc-jm.com/` 입력 후 수집 요청

---

## 7. SEO 점검 도구 & 체크 방법

### 7.1 무료 점검 도구

| 도구 | URL | 용도 |
|------|-----|------|
| **Google Rich Results Test** | https://search.google.com/test/rich-results | JSON-LD 구조화 데이터 검증 |
| **Google PageSpeed Insights** | https://pagespeed.web.dev/ | 성능 + Core Web Vitals |
| **Meta Tags Preview** | https://metatags.io/ | OG/Twitter Card 미리보기 |
| **Schema Markup Validator** | https://validator.schema.org/ | JSON-LD 스키마 검증 |
| **Naver 검색 결과 확인** | `site:cc-jm.com` 검색 | 네이버 색인 여부 |
| **Google 검색 결과 확인** | `site:cc-jm.com` 검색 | 구글 색인 여부 |

### 7.2 정기 점검 항목

| 주기 | 점검 내용 | 방법 |
|------|-----------|------|
| **주 1회** | Google Search Console 오류 확인 | "페이지" 메뉴 → 색인 오류 |
| **주 1회** | `site:cc-jm.com` 구글/네이버 검색 | 색인 페이지 수 확인 |
| **월 1회** | PageSpeed Insights 점수 | 모바일/데스크톱 성능 확인 |
| **콘텐츠 변경 시** | JSON-LD 검증 | Rich Results Test 재실행 |
| **콘텐츠 변경 시** | Sitemap lastmod 업데이트 | `public/sitemap.xml` 수정 |

---

## 8. SPA SEO 고려사항

### 8.1 현재 구조

씨씨카지노는 React SPA(Single Page Application)이므로, 검색 엔진 크롤러가 JavaScript를 실행해야 콘텐츠를 확인할 수 있습니다.

- **Google**: Chromium 기반 크롤러이므로 JS 렌더링 지원 → **문제없음**
- **Naver**: JS 렌더링을 어느 정도 지원하나 제한적 → **관찰 필요**
- **기타**: Bing 등도 JS 렌더링 지원

### 8.2 랜딩 페이지 특수 처리 (현재 적용됨)

1. `index.html`의 메타 태그에 핵심 SEO 정보 포함 → JS 미실행 환경에서도 크롤링 가능
2. JSON-LD 구조화 데이터를 `index.html`에 직접 삽입 → 검색 결과 리치 스니펫 지원
3. Open Graph / Twitter Card 메타 태그 → 소셜 미디어 공유 시 미리보기 지원

### 8.3 향후 개선 (선택)

| 개선 사항 | 효과 | 난이도 |
|-----------|------|--------|
| **Prerender.io 또는 Rendertron 연동** | 크롤러에게 정적 HTML 제공 | 중 |
| **SSR (Next.js 마이그레이션)** | 완전한 서버사이드 렌더링 | 높음 |
| **추가 랜딩 페이지 작성** | 키워드별 별도 페이지 | 낮음 |

---

## 9. 핵심 타겟 키워드

현재 `index.html`의 meta keywords와 `PublicLandingPage.tsx` 콘텐츠에 반영된 키워드:

| 키워드 | 유형 |
|--------|------|
| 씨씨카지노 | 브랜드 (메인) |
| 씨씨 카지노 | 브랜드 (띄어쓰기 변형) |
| CC카지노 | 브랜드 (영문) |
| CC Casino | 브랜드 (영문 풀네임) |
| 지민코드 | 브랜드 (가입 코드) |
| 텔레그램 미니앱 게임 | 일반 |
| 텔레그램 카지노 | 일반 |
| 주사위 게임 텔레그램 | 롱테일 |
| 룰렛 이벤트 | 롱테일 |
| 기프티콘 교환 | 롱테일 |

---

## 10. 즉시 실행 액션 플랜

### 10.1 지금 바로 (5분)

1. `public/robots.txt` 생성 (3단계 참고)
2. `public/sitemap.xml` 생성 (4단계 참고)
3. 커밋 & 푸시

### 10.2 오늘 중 (30분)

4. Google Search Console 등록 + 소유권 인증 (5단계)
5. Naver Search Advisor 등록 + 소유권 인증 (6단계)
6. 두 서비스에 sitemap.xml 제출

### 10.3 1주 후

7. `site:cc-jm.com`으로 구글/네이버 색인 확인
8. Google Search Console에서 색인 상태 점검
9. PageSpeed Insights로 성능 점수 확인

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-02-10 | GitHub Copilot | 최초 작성 |
