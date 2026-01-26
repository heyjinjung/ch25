# 0125일자 트러블슈팅 (v2)

- 작성일: 2026-01-25
- 작성자: GitHub Copilot
- 범위: v2 어드민 및 게임(주사위/룰렛/복권)/금고/회원관리 관련 문제 요약 및 우선순위화


## 🔢 사건 목록 (사용자 신고 순서 및 원문 요약)
1
   ✅ **회원관리상세페이지 회원 관리 - 구플래쉬 작업중 **
   약 11명의 회원을 관리하고 상세 정보를 조회합니다.
   회원 목록
   닉네임, CC_id, telegram_id, telegram_username 검색 필터

4. ✅**드롭다운 선택시 텍스트가 검정색** - 구글플래쉬 작업완료
   - 증상: 드롭다운(Select) 선택 항목의 텍스트가 UI 기준(밝은 테마)과 불일치 — 가독성 저하.
   - 우선순위: P2

5. ✅**레벨관리: 정의된 레벨수 / 최대레벨을 어드민에서 수정 불가** - 코텍스 작업완료 
   - 증상: 어드민에서 레벨 수/최대레벨 설정 필드가 제공되지 않음 혹은 동작하지 않음.
   - 우선순위: P1

6.✅ **레벨보상종류 DB 데이터 이상 의심 — 추가 확인 필요** - 코덱스 작업완료 
   - 증상: 레벨 보상 종류 테이블 데이터가 의심스럽고 정상 데이터보다 더 많은 값이 존재할 수 있음.
   - 우선순위: P1

7. ✅**금고페이지에서 관리자가 금액 강제조정 기능 부재** - 코덱스 작업완료 
   - 증상: 관리자(어드민)가 사용자 금고 잔액을 강제 조정하는 UI/엔드포인트가 없음.
   - 우선순위: P1


9. ✅**미션관리 페이지의 CRUD 기능 - 프론트에 저장 기능 없음** -코덱스 작업완료
   - 증상: 미션 생성/수정/저장 버튼 동작 또는 네트워크 호출이 없음(혹은 UI에서 저장 로직 누락).
   - 우선순위: P0

10. ✅**미션기능 오류 로그 (생성 시 400, DUPLICATE_LOGIC_KEY)** - 코덱스 작업완료
    - 증상: `POST /api/v2/admin/game/missions` 응답 400 (Bad Request), 상세: `DUPLICATE_LOGIC_KEY` (중복 로직키)
    - 클라이언트 에러: Axios `ERR_BAD_REQUEST` 로 포착됨.
    - 우선순위: P0
1.✅ **룰렛 플레이 실패 (POST /api/v2/roulette/play → 400 Bad Request)** - 코덱스 작업완료 
   - 클라이언트 로그: `POST /api/v2/roulette/play 400 (Bad Request)` / Axios ERR_BAD_REQUEST, V2Adapter: "Failed to play roulette" 로그
   - 우선순위: P0
   - 권장조치: 요청 payload/토큰 검증, 서버 측 validation 에러(detail) 확인, 관련 backend logs와 request body 저장(에러 시 상세 반환).

2. ✅ **룰렛 상태 조회 실패 (GET /api/v2/roulette/status?ticket_type=ROULETTE_TICKET → 400)** - 코덱스 작업완료
   - 브라우저 Request 헤더 스냅샷 포함(Authorization 포함). 응답: 400 Bad Request
   - 우선순위: P0
   - 권장조치: 쿼리 파라미터(ticket_type) 값 유효성 확인 및 API 핸들러의 validation/exception 메시지 보강.

4. ✅ **출금조건 모달 한글 깨짐** - 구플래쉬 작업완료 
   - 증상: 출금조건 모달의 한글 텍스트가 깨져 보임
   - 우선순위: P2
   - 권장조치: 프론트 i18n/인코딩 점검(문자열 원천, 폰트/encoding), 컴포넌트에서 안전한 렌더링(escape) 적용.

4. ✅**주사위 페이지 글자 깨짐(텍스트 인코딩/스타일 문제)** - 구플래쉬 작업완료
   - 증상: 주사위 페이지 일부 텍스트가 깨져 보임
   - 우선순위: P1
   - 권장조치: 폰트/인코딩/문자열 원본 점검, CSS overflow/word-break 확인.

11. ✅**룰렛 티켓관리 기능에서 체험(Trial) 티켓 관리 기능이 사라짐** - 코덱스 작업완료
   - 증상: UI에서 체험티켓 관련 관리 항목이 누락됨.
   - 조치: 룰렛 설정의 소모 티켓 타입 옵션에 체험 티켓 추가.
   - 우선순위: P2

12. ✅ **주사위관리 기능에서 오류 발생 — PUT /api/v2/admin/game/dice/config/1 -> 422 Unprocessable Entity** - 코덱스 작업완료 
    - 증상: 관리자에서 주사위 설정 저장 요청이 422 응답을 반환. (요청 payload/validation 문제 의심)
    - 우선순위: P0

13. ✅**로또(복권) 개별설정이 저장되는데 화면 재진입 시 초기화됨(비영구화)** - 코덱스 작업완료
   - 증상: 개별 설정이 API로 성공 저장되나 UI가 재진입 시 초기값으로 돌아감(프론트 상태/캐시 or 조회 호출 문제)
   - 원인: 어드민 복권 설정 목록 응답에서 `puzzle_piece_probability`가 0으로 고정 반환됨.
   - 조치: 목록 응답에서 DB 값 그대로 반환.
   - 우선순위: P1
3. ✅**복권 상태 조회 실패 (Invalid lottery config → 400 Bad Request)** - 코덱스 작업완료 
   - 클라이언트 에러: `Failed to fetch lottery status` / response.data.detail: `INVALID_LOTTERY_CONFIG`
   - 조치: 무효 설정 에러 코드를 `INVALID_LOTTERY_CONFIG`로 통일하고 경품/가중치 요약 로그 추가.
   - 우선순위: P0

7. ✅**미션 프론트 디자인 전면 재작업 필요** - 구글3 작업중
   - 증상: 미션 UI가 완성되지 않아 사용성/저장 흐름 보완 필요
   - 우선순위: P1
   - 권장조치: UX/디자인 스펙 확정 → 컴포넌트 재구축(폼, validation, 네트워크 호출, 사용자 피드백).


5. ✅ **상점 구매 기능 실패 (POST → 400 Bad Request)** - 코덱스 작업완료 
   - 클라이언트 로그: Axios ERR_BAD_REQUEST, shopApi.ts 호출 스택 포함
   - 증거: response.detail = `INSUFFICIENT_BALANCE`, payload sku=`SOT_GOLD_KEY_FRAGMENT`
   - 조치: detail 기반 사용자 안내(잔액 부족 등) 메시지 처리
   - 우선순위: P0

6. ✅ **인벤토리 아이템 사용 실패 (V2 inventory use → 400 Bad Request)** - 코덱스 작업완료 
   - 클라이언트 로그: `[inventoryApi] Failed to use V2 inventory item` / Axios ERR_BAD_REQUEST
   - 증거: response.detail = `INVALID_VOUCHER_TYPE`
   - 조치: 바우처 타입만 사용 허용 + detail 기반 사용자 안내
   - 우선순위: P0

8. ✅**복권 페이지 SVG 삽입 에러**
   - 증상: SVG 삽입 시 렌더 에러 발생(콘솔 스택 확인 필요)
   - 우선순위: P2
   - 권장조치: SVG 인라인/컴포넌트 변환 검토 및 React 안전 렌더링(권장 라이브러리 사용).

✅---. **v2 주사위 게임 요청** 구글 3 작업중 
   정적이고 재미없고 억지스러워 보임. 개선할것 

2.✅ 상점 관리 / 미션 관리 - 상점/미션 탭 수정 - 구글3 완료 


✅1. 티켓관리/ 인벤토리 - 구글 3 작업중 
티켓 관리
인벤토리 관리
인벤토리 관리(Inventory Management)
유저 아이템 지급/회수 로그를 관리하고 아이템을 지급합니다.

8.  ✅현재 미션관리에 dtet - 코덱스작업완료
스타벅스 기프티콘 1만원12개 test
tet포인트 (P)\100개 이렇게 설정했는데 유저에 대한 미션관리 기능/ 미션보상 지급기능이 없음
- 조치: 유저 미션 관리 액션(진행값 수정/리셋/강제 완료/보상 지급) 추가

1) ✅ 레벨관리에서 포인트 / cc포인트 지급시 어떻게 누적되는지 알려줘 - 코덱스작업중
2) ✅ 금고관리 페이지에 아직 강제조정 가능한 기능 없어1! - 코텍스 작업중

3) ✅룰렛에 이제 체험티켓은 열렸지만 체험티켓 설정탭이 없어상단에 3개 탭만 존재해서 설정이 안돼
   체험티켓용 탭도 만들어줘  - 코덱스 작업완료
 
----- 유저
1) ✅ ncaught TypeError: Cannot read properties of undefined (reading 'toLocaleString') -코덱스 작업완료 
    at Ze (WithdrawalRulesChecklist.tsx:113:47)
    at Vg (react-dom.production.min.js:160:137)
    at H1 (react-dom.production.min.js:289:337)
    at B1 (react-dom.production.min.js:279:389)
    at oD (react-dom.production.min.js:279:320)
    at ah (react-dom.production.min.js:279:180)
    this error2


2. ✅[V2Adapter] Failed to fetch lottery status   
[V2Adapter] Failed to fetch lottery status 
response.config
st {message: 'Request failed with status code 400', name: 'AxiosError',name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}

- 조치: 복권 상태 조회에서 INVALID_LOTTERY_CONFIG 발생 시 빈 prize_preview로 200 반환

3. ✅[V2Adapter] Failed to fetch roulette status (DIAMOND/ROULETTE/TRIAL/GOLD_KEY)
- 조치: 룰렛 상태 조회에서 INVALID_ROULETTE_CONFIG/V2_ROULETTE_CONFIG_MISSING 발생 시 빈 segments로 200 반환
4. ✅룰렛 플레이 400 (INVALID_ROULETTE_CONFIG)
- 조치: 특정 ticket_type 설정이 없으면 ROULETTE_TICKET 설정으로 fallback 후 플레이
281

8.✅ **금고페이지 프론트: 당일금고잔액 / 당일금고적립액 / 당일금고출금신청내역 카드가 없음** - 구3 
   - 증상: 관련 카드 컴포넌트가 화면에서 렌더되지 않음(데이터 없음 또는 조건부 렌더링 누락).
   - 우선순위: P1


4. ✅ 금고 출금 모달caught TypeError: Cannot read properties of undefined (reading 'toLocaleString')
    at Ze (WithdrawalRulesChecklist.tsx:113:47)
    at Vg (react-dom.production.min.js:160:137)
    at H1 (react-dom.production.min.js:289:337)
    at B1 (react-dom.production.min.js:279:389)
    at oD (react-dom.production.min.js:279:320)
    at ah (react-dom.production.min.js:279:180)
    at fx (react-dom.production.min.js:270:88)
    at F1 (react-dom.production.min.js:272:300)
    at Ji (react-dom.production.min.js:127:105)
    at react-dom.production.min.js:266:273
Ze @ WithdrawalRulesChecklist.tsx:113
Vg @ react-dom.production.min.js:160
H1 @ react-dom.production.min.js:289
B1 @ react-dom.production.min.js:279
oD @ react-dom.production.min.js:279
ah @ react-dom.production.min.js:279
fx @ react-dom.production.min.js:270
F1 @ react-dom.production.min.js:272
Ji @ react-dom.production.min.js:127
(anonymous) @ react-dom.production.min.js:266Understand this error

## 빌드 이슈
- ✅ **프론트 빌드 실패 (TS5103: Invalid value for '--ignoreDeprecations')**
   - 증상: `npm run build` 중 `tsconfig.json`의 `ignoreDeprecations: "6.0"`에서 오류 발생
   - 조치: `ignoreDeprecations` 값을 `"5.0"`으로 수정

1) ✅ 유저별 레벨관리 기능이 없음
유저별 레벨포인트 관리 / 레벨등급 관리기능 백앤드/프론트 모두 
v2 어드민시스템에 구현되어야해 
---

✅ 추가 
1) 룰렛설정값 관리에서
각 티켓별 라벨값이 다르게 설정되어야하는데
모두 동기화처리됨 하나 바꾸면 4종 다 바뀜 
가중치 / 보상타임 / 수량 / 잭팟여부 등 
모든 설정값이 다 동기화 처리됨 


✅ 2) 어드민페이지 복권설정 

http://localhost:3000/api/v2/admin/game/lottery/config/1/prize/5
요청 메서드
PUT
상태 코드
422 Unprocessable Entity
원격 주소
access-control-allow-origin
http://localhost:3000
connection


✅ 각 컨피그마다 입력/저장시 모두 오류 / 정상이 다름.. 
그리고 완전 저장/. 활성화 하고 새로고침하면
다시 비활성화 / 중지됨으로 바꾸어져 있음 

- 원인: `/api/v2/admin/game/lottery/configs` 응답이 다중일 때 프론트가 첫 항목만 사용하여 새로고침 시 다른 config가 표시됨.
- 조치: 백엔드 `/configs` 정렬 안정화 + 프론트에서 LOTTERY_TICKET 우선 선택.
- 추가: Select/Switch 경고는 undefined 값으로 uncontrolled 렌더링된 것이라 기본값 보정.


3) ✅ 개발유저 - 백앤드에서 소환하여 상태표시는 되지만
실제 게임플레이 티켓차감 / 증감
보상누적 전혀 확인되지 않음 
그냥 원래 로그인했던 그 상태임 

 ✅ 상점품목 중 골든티켓이라는 항목발견 / 데이터베이스 정합성 검증 필요 

인박스 모달
✅ 2. **어드민에서 메시지 발송했는데 네트워크/서버 로그 미존재**
   - 증상: 어드민에서 발송 작업을 수행했으나 프론트/서버(access/nginx/backend) 어디에도 관련 요청/로그가 남지 않음.
   -
admin Side (Works Correctly)
Routing: Correctly routed to MarketingTabPage > MessageSenderPage.
Logic: Uses proper V2 services (createV2AdminMessage, getAdminSegmentStats).
Component: Fully implemented and functional.
User Side (Partial - Missing UI)
Backend/Hook: useV2Inbox hook exists and is connected to V2 API (/api/v2/inbox).

✅ 골든프로젝트 백앤드 
C:\Users\JAVIS\ch\ch25\docs\v2_specs\07_golden\00_golden_project_status_v2_ko.md
✅ 팀배틀페이지 어드민 / 풀스택 연결 

✅ 유저미션관리 > 닉네임으로 조회되게 
/api/v2/admin/users/resolve?identifier=<nickname> 응답 확인

[] 금고페이지 출금조건 확인 - 구플래쉬 작업중 
--------------------


연속스트릭모달
골든아워 모달
금고페이지 출금조건 확인

이벤트페이지


게임결과 모달 및 애니메이션 
ㄴ 꽝에는 실패용 모달 / 애니메이션 
모달 텍스트에 
https://ui.aceternity.com/components/encrypted-text
Encrypted Text 
적용가능한지 체크 

미션페이지 too

메인페이지 
금고페이지!! 
Animated Testimonials
Minimal testimonials sections with image and quote.

testimonials
special 
이 효과!! 


유저미션관리 > 닉네임으로 조회되게 

-----------------



1/25일 밤 10:39

티켓 /인벤토리 로그 kst 가능한지 확인할것 
룰렛체험티켓 하루 3번 돌릴수 있는 규칙 있으나 무시되고 계속 돌아감 
---

기술기준문서 :
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\admin 내 모든문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk 내 모든문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\00_con.md

기능 생성 후
문서 업로드
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk 내 관련있는 영역에
오늘날짜_핵심변경내용_업데이트