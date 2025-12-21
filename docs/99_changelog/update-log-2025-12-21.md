# 개발 로그 (2025-12-21)

## 오늘의 목표
- `/team-battle`를 Figma UI 플로우로 복구하면서도 실제 기능(미스터리 팀 배정/데이터 표시)이 동작하도록 정리.
- 사용자가 수정한 가이드 페이지 텍스트가 배포 후에도 **항상 최신으로 반영**되도록(특히 캐시/SPA shell 이슈) 안정화.
- 팀 배틀 데이터 검증: “산타팀 4명” 등 DB 기준 실제 데이터 확인.

---

## 완료한 작업 요약

### 1) Team Battle: Figma UI 복구 + 미스터리 팀 배정(실제 API 연결)
- `/team-battle` 라우트를 TeamBattle Figma 스타일 페이지로 연결.
- “팀이 없는 상태”에서 사용자가 바로 참여할 수 있도록 **미스터리 팀 배정** 패널을 추가.
- 시즌 시작 시각 기준으로 **시즌 시작 후 24시간 내**에만 배정이 가능하도록(join window) UI/버튼 제한 로직을 적용.
- 배정 성공 시 `getMyTeam` / 리더보드 데이터가 즉시 갱신되도록 refetch 처리.

### 2) 팀 배틀 DB 검증 (로컬 DB 기준)
- MySQL DB(`xmas_event_dev`) 내 팀 배틀 테이블을 직접 조회하여 팀 구성/인원 수 확인.
- 확인 결과(당시 조회 기준):
  - Santa Team: 멤버 수 4
  - Rudolph Team: 멤버 수 4
- UI에서 팀이 여러 개 보이는 현상은 “현재 활성으로 남아있는 기존 팀 데이터가 추가로 존재”하기 때문으로 확인.

### 3) GuidePage: 수정 텍스트가 배포 후 안 바뀌는 문제 해결(캐시/SPA shell)
- 증상
  - `GuidePage.tsx`를 수정하고 빌드/재기동했는데, 브라우저에서 이전 텍스트가 계속 보이는 현상.
  - 원인 후보: 정적 자산 캐시 / 특히 SPA entry(`index.html`) 캐시로 인해 **이전 번들의 해시**를 계속 참조.

- 해결
  - 프론트 정적 서빙 Nginx 설정에서 **SPA shell에 대해 캐시를 끔**:
    - `location = /index.html` 및 `location /`에 `Cache-Control: no-store/no-cache`, `Pragma: no-cache` 적용.
    - 해시가 붙은 정적 자산(`.js/.css`)은 기존대로 장기 캐시(`immutable`) 유지.

- 배포/반영 확인(운영 관점)
  - `curl -I http://localhost:3000/`로 캐시 헤더가 실제로 적용되는지 확인.
  - `index.html`이 참조하는 번들 해시가 갱신되는지 확인.
  - 실제로 서빙 중인 JS 번들을 내려받아(예: `/assets/index-xxxx.js`) 가이드 문자열이 포함되는지 검색하여 “배포된 번들에 최신 문자열이 들어있음”을 확인.

---

## 변경/영향 범위(대화 기반 정리)
> 아래는 오늘 작업에서 관찰/수정된 영역을 대화 흐름 기준으로 정리한 것입니다.

- 프론트 라우팅
  - `/team-battle` → Figma Team Battle 페이지로 연결

- Team Battle Figma 페이지
  - 미스터리 팀 배정 버튼/패널 추가
  - 시즌 시작 후 24시간 참여창(join window) 계산/노출
  - 배정 성공 시 내 팀/리더보드 refetch

- 프론트 정적 서빙(Nginx)
  - `index.html` 및 SPA 라우팅 응답에 대해 no-cache/no-store 적용
  - 해시 정적 자산은 immutable 캐시 유지

---

## 실행/검증 메모(재현 가능한 형태)

### 프론트 반영이 애매할 때(도커 빌드 캐시 강제 무시)
- 프론트 이미지를 강제로 새로 빌드:
  - `docker compose build --no-cache frontend`
- 컨테이너 재기동:
  - `docker compose up -d --force-recreate frontend`

### 캐시 헤더 확인
- `curl -I http://localhost:3000/ | findstr /i "cache-control pragma expires"`

### 실제 번들에 가이드 문구가 들어갔는지 확인
- `/assets/index-*.js` 파일을 내려받아 문자열 검색(예: “CC카지노 이벤트” 등)

---

## 남은 이슈/다음 작업 후보
- (선택) 팀 배틀에서 “의도한 팀만 보이게” 하려면 기존 팀 데이터 정리(비활성화) 정책을 확정해야 함.
- (선택) GuidePage 콘텐츠가 잦게 바뀐다면, 운영 배포 플로우에서 `frontend` 빌드 캐시 정책/CI 캐시 정책을 한 번 더 점검 필요.

---

## 오늘 결론
- Team Battle: Figma UI 플로우로 복구하면서도 실제 “미스터리 팀 배정”이 동작하도록 연결 완료.
- GuidePage: 배포 후 텍스트가 안 바뀌는 문제는 SPA shell 캐시가 핵심이었고, `index.html` 캐시를 끄는 방식으로 안정화.
