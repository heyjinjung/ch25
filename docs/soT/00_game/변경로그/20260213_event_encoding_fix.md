# 변경 로그: 설날/발렌타인 이벤트 한글 인코딩 수정

**날짜:** 2026-02-13
**작성자:** Antigravity
**관련 이슈:** 설날/발렌타인 이벤트 페이지 한글 깨짐 (Mojibake)

## 개요
이벤트 페이지(`ValentineSeolPage`)의 한글 텍스트가 깨져 보이는 현상을 수정하기 위해, 불필요한 `KoreanConstants.ts` 파일을 제거하고 표준 UTF-8 문자열을 로직 파일에 직접 통합함.

## 변경 사항

### 1. `KoreanConstants.ts` 제거
- **파일**: `src/v2/pages/event/KoreanConstants.ts`
- **조치**: 파일 삭제
- **이유**: 유니코드 이스케이프 시퀀스 사용으로 인한 인코딩 문제 유발 가능성 및 프로젝트 표준(직접 문자열 사용)과의 불일치.

### 2. 컴포넌트 리팩토링
- **파일**:
  - `src/v2/pages/event/ValentineSeolPage.tsx`
  - `src/v2/components/event/SecretCodeInput.tsx`
  - `src/v2/components/event/ValentineSeolBanner.tsx`
- **조치**:
  - `KOREAN.*` 상수 참조를 모두 하드코딩된 한글 문자열로 교체.
  - 관련 import 제거.

## 검증
- **수동 검증**: 이벤트 페이지 접속 시 한글 텍스트 정상 출력 확인 필요.
- **코드 검증**: 정적 분석을 통해 `KoreanConstants` 잔존 참조 없음 확인.

## 영향 범위
- 설날/발렌타인 이벤트 페이지 전체 UI (헤더, 배너, 미션 카드, 시크릿 코드 입력창, 버튼, 토스트 메시지 등)

## [SEO] Daily Mission Reward Range Update
- **Date**: 2026-02-13
- **Change**: Updated SEO Daily Mission reward range from 3000-5000P to 1000-5000P.
- **Details**:
  - Updated `SeoCodeService` and `SeoDailyCode` model (reward_min: 1000).
  - Updated `SeoMissionPage` UI text.
  - Documented in `00_mission_sot_master.md`.
- **Author**: Antigravity
