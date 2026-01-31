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

✅ 금고페이지 출금조건 확인 - 구플래쉬 작업완료 

✅ 모달 및 애니메이션 
모달 텍스트에 https://ui.aceternity.com/components/encrypted-text
Encrypted Text 적용가능한지 체크 
V2WithdrawalGuideModal.tsx
V2AttendanceStreakModal.tsx

LotteryCollectionModal.tsx
DiceResultModal.tsx
LotteryResultModal.tsx
RouletteResultModal.tsx

✅  티켓 /인벤토리 로그 kst 가능한지 확인할것 
티켓/인벤토리 로그 KST 변환 적용 
수정된 파일:
timezone.py - utc_to_kst(), utc_to_kst_iso() 헬퍼 함수 추가
economy_routes.py - TicketLogDto 응답 시 KST 변환 적용
user_routes.py - UserActivityLogDto 응답 시 KST 변환 적용
정책:
DB 저장: UTC (기존 유지)
API 응답: KST ISO 형식 (2026-01-26T15:30:00+09:00)
문서 업데이트:

✅ 미션 프론트 디비 EUAM 오류 해결 
미션 관련 프론트 enum 업데이트 기록 이후 - 인벤토리 / 티켓 관련 업데이트 사항 문서 업데이트 

✅ 유저 인박스 팝업에서 읽음처리 한번에 할수 있게 해줘 
그리고 인박스 메시지 가독성 4.5 :1 확보 

✅ 유저 삭제 / 퍼지기능 회원관리 / 서랍에 구현 
✅ 유저 삭제 / 퍼지기능 회원관리 / 서랍에 구현 / 에러발생 / 코덱스 작업완료 

✅ 상점페이지 리디자인

✅ 주사위 게임로직과 결과맵핑이 맞지않음!!! 

✅  메인페이지 메인 히어로 텍스트에 https://ui.aceternity.com/components/encrypted-text
주사위 게임로직과 결과맵핑이 맞지않음!!! 

✅ 팀배틀 닉네임으로 유저조회 및 처리 가능하게 해줘 


✅ 주사위게임에서 티켓은 차감되나
금고 잔액이 현재 차감되지 않고 있어
특별한 에러나 로그도 없어 - 금고한도 / 에러메시지 + 주사위음수차감 
[V2Adapter] Dice Status Data: {
    "config_id": 1,
    "name": "Default Digtce Config",
    "max_daily_plays": 0,
    "today_plays": 13,
    "remaining_plays": 0,
    "token_type": "DICE_TICKET",

✅ 팀배틀 
팀별 팀멤버 상세조회관리 기능
팀멤버 가입일자 게임점수 기여도내역 
어드민 프론트에 구현되야함 

✅  1. 룰렛티켓 구매시 아래와 같은 오류 발생 

shopApi.ts:76 [shopApi] Failed to purchase V2 shop product 
ct {message: 'Request failed with status code 400', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
code
"Bad Request"
[[Prototype]]
: 
"AxiosError: Request failed with status code 400\n    at kE (http://localhost:3000/assets/index-BLQ9nVW2.js:424:1088)\n    at XMLHttpRequest.N (http://localhost:3000/assets/index-BLQ9nVW2.js:424:5847)\n    at Vo.request (http://localhost:3000/assets/index-BLQ9nVW2.js:426:2094)\n    at async z (http://localhost:3000/assets/ExchangePage-DzgUxSWy.js:1:602)"
[[Prototype]]
: 
Error

✅  2. 치킨은 구매는 가능하나 금고에서 돈이 차감안됨

✅ 금고출금조건에 현재 플레이횟수가 전혀 카운팅 되고 있지 않음 
새로 빌드하거나 새로고침해도 계속 실패함 

 ✅ 팀배틀 stub v2 서비스 연결 완료 

 ✅   주사위 골든아워 (Golden Hour)
 분기 기준 확인

src/v2/components/game/DiceResultModal.tsx를 읽고 “골든아워 여부”, “승/패 여부”를 어떤 값으로 판단하는지 확인
4케이스(골든승/일반승/골든패/일반패) 매핑 테이블을 내부적으로 정리(문서화는 코드 주석 없이 내 머리에서만)
디자인 패치(분기/데이터 흐름은 그대로)

✅  “Dice Battle Result” span 제거
아이콘 74x74: 승리=주사위, 골든패=해골, 일반패=유령
타이틀(36) + 잘림 방지(줄바꿈/최대폭/패딩/leading 조정)
서브타이틀 타이핑 애니메이션:
골든승 “2배 적립 축하”, 일반승 “승리 축하”, 골든패 “2배 놓침 ㅠㅠ”, 일반패 “패배했습니다”
애니메이션:
일반 승/패: “살짝 떠오름”(opacity+translate+scale), 회전 금지
골든패: 흔들림 강도 낮춤
골든승: 불꽃 느낌은 confetti 컬러/파티클 튜닝으로 최대 근접(새 라이브러리 추가 없이)
금액 표시 섹션 정리

코인 아이콘을 public/assets/logo_cc_v2.webp로 고정
“P” 표기는 유지하되 UI 정렬만 정돈
CTA 구성 확정 및 “다른게임” 경로 연결 방식 결정

버튼은 다시하기 / 다른게임 / 닫기 3개로 통일(케이스별 노출 차이는 요구사항대로)
“다른게임”은 v2 게임 대시보드로 이동:
우선 기존 코드에 navigate나 onGoTo... 콜백이 있으면 그대로 사용
없으면 라우터에서 실제 대시보드 경로를 검색해서 정확한 path로 연결(추측 금지)

ㄴ재수정 해야함 
1) "닫기" 3번째 버튼은 6개에서 모두 삭제
2) 골든아워 패배 애니메이션 개선 
3) 모든 게임모달 햅틱 애니메이션 추가
4) 일반 주사위 승리 컬러감 개선 
5) 씨씨코인 아이콘 변경해주기


✅ 미션관리
일일 조건이 붙은건 일일 액션타입과 매치되어야 하는건지
현재 어떤 조건에 어떻게 붙어야 하는건지 관리자가 매우 헷갈려함 
로직을 타이핑하는게 어려워서 드롭다운으로 선택하게 한건데
이게 미션이 어떻게 조립이 되는지 모르겠음 

✅ 예를 들어 골든하워 * 게임플레이 = 성립가능???  
* 그리고 같은 로직키가 같은 탭안에서는 일일/주말/신규/스페셜의 조건에선 성립이 안됨 

어드민 미션관리 미션편집 모달 수정 후 테스트 - 이게 정상작동되는지 모르겠음
우선 주간단위 미션은 생성 . 편집에서 오류 있음 

✅ 어드민 회원 레벨관리 
입금 넣었는데도 회원조회시 레벨 변경이 안됨


V1레거시 삭제후  V2유지 
check_db_state.py	2026-01-27 16:27
check_deposit_baseline.py	2026-01-27 16:16
check_user_progress.py	2026-01-27 15:41
column_enums.txt	2026-01-27 15:25
compare_users_tables.py	2026-01-27 16:30
fix_user_id_mismatch.py	2026-01-27 16:36
fi


✅ 복권 게임결과 모달  
백앤드 테스트 진행 

   등급 1: BIG_WIN
   조건: 금고에 적립되는 모든 포인트(POINT) 보상.
   조건: 골드 키(Gold Key), 다이아몬드 티켓(Diamond Ticket) 등 희귀 티켓.
   연출: 'Celestial Reveal' (화려한 콘페티 + 햅틱강도 0.8 + 테두리 Shine + 레드오렌지핑크 그라데이션 배경컬러 값  + 상품명 EncryptedText 효과).
   아이콘 : 
   모든포인트 : C:\Users\JAVIS\ch\ch25\public\assets\asset_coin_gold.webp
   골드키 : C:\Users\JAVIS\ch\ch25\public\assets\icons\goldkey.png
   다이아몬드티켓 : C:\Users\JAVIS\ch\ch25\public\assets\icons\diakey.png

   from-[#컬]/70
   ring-red-500/62
   shadow-[0_0_50px_rgba(255,0,84,0.31)]
   drop-shadow 0.44

   등급 2: NORMAL (일반 당첨)
   조건: 기프티콘(GIFTICON), 바우처(VOUCHER) 보상.
   조건: 기타 아이템 및 퍼즐 조각.
   연출: 'Stable Victory' (부드러운 글로우 + 차분한 탄력모션 + 햅틱강도 0.3 +입체감 있는 카드 + 골드 0.5 테두리 ).
   전체적으로 깔끔하게 디자인. 컬러, 폰트, 흐릿한 블러처리는 금지 
   텍스트 애니메이션은 가볍게 전체적으로 움직이는 미세모션 
   아이콘 : 
   치킨 C:\Users\JAVIS\ch\ch25\public\assets\icons\chiken.png
   피자 C:\Users\JAVIS\ch\ch25\public\assets\icons\pizza2.png
   스타벅스 C:\Users\JAVIS\ch\ch25\public\assets\icons\takeaway-cup-dynamic-color.png
 
   shadow-[0_0_50px_rgba(255,0,84,0.31)]
   drop-shadow 0.44

   등급 3: FAIL, 아이콘 해골, 컬러 투명하지만 그레이, 다크그린 톤으로, 글래스모피즘
   조건: 룰렛, 주사위, 복권 등 일반 게임 티켓 (1~5매), + NONE 타입
   연출: 저채도 심플 연출. 무겁게 가라앉는 애니메이션 , 흐릿한 블러처리는 금지  


✅ 복권에서 다이아티켓 뽑았는데
실제 티켓 저장소에 들어가지 않는거 같음
RL
http://localhost:3000/api/v2/roulette/status?ticket_type=DIAMOND_TICKET
요청 메서드
strict-origin-when-cross-origin

✅  아이템 2만원치 넘게 샀는데 >> 작업중 
그리고 실제 1만으로 한도 수정해야하고
금고 출금조건에 안 잡힘 

✅ 게임결과 모달 및 애니메이션 
ㄴ 꽝에는 실패용 모달 / 애니메이션 


BackgroundPaths 에셋으로 배경효과 

Magic UI 적용:
Meteors & Shimmer: 타워 미션 영역에 Meteors (유성 효과)를 적용하고, 미션 카드에는 shimmer 애니메이션이 적용되어 시각적 주목도를 높였습니다. 
MatrixText: 텍스트가 암호처럼 변하며 나타나는 효과를 적용하여 미래지향적인 분위기를 조성했습니다.
룰렛 
   등급 1: BIG_WIN
   조건: 금고에 적립되는 모든 포인트(POINT) 보상.
   조건: 골드 키(Gold Key), 다이아몬드 티켓(Diamond Ticket) 등 희귀 티켓.
   연출: 'Celestial Reveal' (화려한 콘페티 + 햅틱강도 0.8 + 테두리 Shine + 레드오렌지핑크 그라데이션 배경컬러 값  + 상품명 EncryptedText 효과).
   아이콘 : 
   모든포인트 : C:\Users\JAVIS\ch\ch25\public\assets\asset_coin_gold.webp
   골드키 : C:\Users\JAVIS\ch\ch25\public\assets\icons\goldkey.png
   다이아몬드티켓 : C:\Users\JAVIS\ch\ch25\public\assets\icons\diakey.png

   등급 2: NORMAL (일반 당첨)
   조건: 기프티콘(GIFTICON), 바우처(VOUCHER) 보상.
   조건: 기타 아이템 및 퍼즐 조각.
   연출: 'Stable Victory' (부드러운 글로우 + 차분한 탄력모션 + 햅틱강도 0.3 +입체감 있는 카드 + 골드 0.5 테두리 ).
   전체적으로 깔끔하게 디자인. 컬러, 폰트, 흐릿한 블러처리는 금지 
   텍스트 애니메이션은 가볍게 전체적으로 움직이는 미세모션 
   아이콘 : 
   치킨 C:\Users\JAVIS\ch\ch25\public\assets\icons\chiken.png
   피자 C:\Users\JAVIS\ch\ch25\public\assets\icons\pizza2.png
   스타벅스 C:\Users\JAVIS\ch\ch25\public\assets\icons\takeaway-cup-dynamic-color.png

   등급 3: FAIL, 아이콘 해골, 컬러 투명하지만 그레이, 다크그린 톤으로, 글래스모피즘
   조건: 룰렛, 주사위, 복권 등 일반 게임 티켓 (1~5매), + NONE 타입
   연출: 저채도 심플 연출. 무겁게 가라앉는 애니메이션 , 흐릿한 블러처리는 금지  

✅ 1. 403 에러 (BENEFITS_SUSPENDED)에 대하여
네, 정상적인 동작입니다. 현재 적용된 **"강력한 금고 정책(Strict Vault Policy)"**에 따라, 최근 7일 내에 입금 내역이 없는 유저는 상점 이용 및 유료 게임 이용이 차단됩니다.
원인: 테스트 중인 계정이 7일간 입금이 없는 '혜택 중단' 상태입니다.
해결: 테스트를 위해서는 DB에서 해당 유저의 최근 입금 일자를 오늘로 수정하거나, 입금 로직을 한 번 실행하시면 차단이 해제됩니다.
ㄴ 에러메시지 마련할것 

✅ 출석미션 반영 / 횟수 카운트 - 구플래쉬3 작업중 
신규유저 관련 미션 엣지케이스 추가, 테스트 진행중 

✅ 미션허브 탭 디자인 수정
✅ 레벨페이지 배경과 아이콘 
✅ 메인페이지 디렉션 체크 1차
ㄴ 카드그리드 디렉션 위치 다양화
ㄴ  cta 버튼 디렉션 링크 확인 

✅ 레벨페이지 애니메이션 - 엘리베이터..
✅ 레벨표시 한글조건 + 수량 
✅ 룰렛페이지 세그먼트값 백엔드 데이터연동 
   어드민 API에서 정렬 순서를 ticket_type, id DESC로 변경하여 각 ticket_type별로 가장 높은 ID가 먼저 오도록 합니다.


✅ 레벨 1일 300한도 ?? 한도 폐기? 확인할 것 

✅ Auth SoT: docs/v2_specs/00_sot_meta/v2_telegram_auth_sot_ko.md
트러블 매핑표: C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\v2_auth_trouble_mapping_ko.md
기술 가이드: docs/v2_specs/00_sot_meta/v2_auth_technical_guide_ko.md
신규 생성 코드 (v2 경로)
app/v2/core/telegram.py - Telegram initData 검증 (hash 비교 수정)
app/v2/models/auth_event.py - V2UserAuthEvent 모델
app/v2/models/refresh_token.py - V2UserRefreshToken 모델
app/v2/api/telegram_routes.py - V2 Telegram 인증 API
DB Migration 생성 (v2_user_auth_event, v2_user_refresh_token)
DB Migration 실행
models/__init__.py에 새 모델 export 추가
routes.py에 telegram_routes 등록 확인
문서 업데이트 (SoT, Trouble Mapping, Technical Guide)

✅ 검증 계획
 app/v2/core/telegram.py: initData 검증 성공/실패
 V2UserAuthEvent: 이벤트 기록 CRUD
 V2UserRefreshToken: 토큰 생성/갱신/폐기
 Telegram 신규 유저 → 로그인 → 이벤트 기록
 Access Token 만료 → Refresh → 새 토큰
 로그아웃 → Refresh Token 무효화
E2E 테스트
 Telegram Mini App에서 실제 initData로 인증
 DEV 로그인 (DEV 환경) / 차단 (PROD 환경)

Telegram initData는 HMAC-SHA256 서명 기반이라 테스트용 토큰을 생성할 수 있습니다.
테스트용 initData 생성 스크립트를 만들고 pytest로 백테스트를 실행하겠습니다.
Write C:\Users\JAVIS\ch\ch25\tests\v2\test_telegram_auth.py

✅ 어드민 기능구현
- **활성 유저 통계**
  - 관련 함수/코드 미확인
- **일간 CC입금액 확익(daily_revenue) 계산**
  - 관련 함수/코드 미확인
- **일간 지출(daily_spending) 계산**
  - 관련 함수/코드 미확인
- **전체 금고 잔액 집계**
  - 사용자별 금고 합계, 제한된 금액 비율
  - 관련 함수 직접 명시 없음
- **지출 한도 추적**
  - daily_vault_spent 현황, 한도 도달율(%)
  - 관련 함수 직접 명시 없음
- **미션 강제 리셋**
  - 특정 사용자 미션 상태 초기화 (감시 로그)
  - 파일: [mission_routes.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/api/admin/mission_routes.py) → `reset_user_missions()` ✅ 구현완료
- **마일스톤 리워드 배포**
  - 관리자 임의 배포 기능 (사유 기록 필수)
  - 파일: [streak_routes.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/api/admin/streak_routes.py) → `distribute_milestone_reward()` ✅ 구현완료
- **미션 목록 조회 (Admin)**
  - 사용자별 미션 진행도 상세 조회
  - 파일: [user_routes.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/api/admin/user_routes.py) → `get_user_missions_admin()` ✅ 구현완료
- **로그인 미션 검증**
  - 금일 로그인 리셋 상태 확인 (09:00 KST 기준)
  - 파일: [mission_routes.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/api/admin/mission_routes.py) → `verify_login_missions()` ✅ 구현완료
- **감시 로그: MISSION_RESET, STREAK_REWARD_DISTRIBUTE**
  - 관리자 개입(미션/스트릭 초기화 및 지급) 기록 ✅ 구현완료 (V2AdminAuditService 연동)

✅ admin fe 구현 
reset_user_missions
get_user_missions_admin
reset_user_streak
set_streak_count
get_user_streak_admin
get_milestone_progress
force_grant_milestone
distribute_milestone_reward
유저 개별 미션 강제 리셋
로그인 미션 검증
미션 통계
활성 유저 통계
✅ admin fe 구현 
제재 해제 로깅
감사 로그 (MISSION_RESET_ALL, STREAK_RESET 등)
전체 금고 잔액 집계
지출 한도 추적
지출 한도 요약
재고 수량 조정
재고 부족 알림
보유율 분석
보유율 추이
수익/지출 분석
수익 요약
마케팅 효율성 분석
일간 수익/지출 계산

✅ http://localhost:3000/admin/ops/analytics - 이것 아직도 목업데이터 
http://localhost:3000/admin/ops/audit-logs - 아예 백지상태
http://localhost:3000/admin/inventory/stock - 역시 하드코딩or 목업데이터
실제 데이터베이스로  실제 API/WS 상태 기반으로 전환, 라우팅 연동 할 것 
데이터가 없는 상태는 없는 상태로 나오게 할것 

✅ 그리고 앞선 테스트 기록 로그 남아있는
http://localhost:3000/admin/inventory/tickets
http://localhost:3000/admin/inventory/tickets
티켓 로그 목록 (Ticket Logs)
Inventory Log List
이것도 초기화 해줘 

✅ auth.py에서 UserEventLog 삽입 로직을 V2EventLog로 변경 (장기 해결)


✅  학습 완료 - 현재 상황 분석
🔴 핵심 문제점
1. User ↔ V2User 이중 테이블 구조

user 테이블 (V1): 금고 SoT (vault_locked_balance), 레거시 데이터
v2_user 테이블 (V2): cc_id 기반 인증, V2 전용 기능
정책: "V2 Native 단일 SoT" 원칙이나, 금고는 user.vault_locked_balance가 SoT
이제 전체 비교표를 정리합니다:

시드누락 문제해결 

✅ 어드민 프론트에서 사이드바 메뉴가 성격과 카테고리가 다 제각각이야
스타일은 유지하되 체계적으로 개편해줘

✅ 사이드바에서 영어 표현 다 빼

✅ 모든게임 플레이 버튼은 가능하나
그 후 게임이 직접 진행되거나
결과가 표시되거나
티켓이 차감되어야 하는 모든 과정이 다 정지상태야 
ㄴ 에러트리아지 20260130 019번 에러
추가 마이그레이션 파일 생성 / 적용 

✅ Get Started with Sentry Issues
Your code sleuth eagerly awaits its first mission.
Set up the Sentry SDK for 

Your Source for Log-ical Data
It's about time we offered something a bit more robust than breadcrumbs. With logs, you'll be able to have a lot more control and context over all your data.

✅유저 닉네임 수정할수 있게 해야해! 

✅ 입금내역이 금고출금조건 모달에는 잡히나
레벨 xp 반영이 안되고 있음 
1-1) 주간 CC 입금 3회
이벤트 미션을 달성하고 보상받기 \
ㄴ 주간입금 체크되는거 확인
ㄴ 레벨 변경 된거 확인
ㄴ 그런데 레벨페이지에서 닉네임 조회 안되고
ㄴ 입금페이이지에서 작업로그 시간 갱신 안됨 / 추가수정 


✅ 복권모음 달성시 골드키 1개 지급 기능 풀스택 구현해야함 

[] 센트리 The transactions dataset is being deprecated. Please use Explore / Traces with the is_transaction:true filter instead. Please read these FAQs for more information.


✅ 2) 신규 다음날 로그인 1일
이벤트 미션을 달성하고 보상받기만 로그인 카운트가 안돼
주간 미션 / 일일미션 로그인 영역은 성공함 

✅ 신규유저 텔레그램 채널2개 입장 미션 프론트앤드 개선

✅ 주사위 게임 골든하워 적용이 안되고 있음

5) 마케팅..효율성
입금 / 환전... 잡을수 있나?? 


---------------------------------------

연속스트릭모달
골든아워 모달
룰렛체험티켓 하루 3번 돌릴수 있는 규칙 있으나 무시되고 계속 돌아감 


----------
https://opengameart.org/art-search-advanced?keys=&title=&field_art_tags_tid_op=or&field_art_tags_tid=&name=&field_art_type_tid%5B%5D=12&field_art_type_tid%5B%5D=13&sort_by=count&sort_order=DESC&items_per_page=24&Collection=

 docker compose build --no-cache; docker compose up -d


#1. 개선사항
 > 회원관리 유저 디테일드로우 > 금고관리에서 내역로그 볼수 있게 해줘
 > 금고현황 페이지를 기준으로 금고 분석을 통합시켜줘 >> 이 떄 FE 구현된 카드컴포넌트 클릭시 모달로 상세내역 볼수 있게 해줘 


##2.에러사항 


-----------------------------------

## 에러대응
1. C:\Users\JAVIS\ch\ch25\docs\v2_specs\90_troubleshooting\20260130_error_triage_checklist.md
위의 에러 트리아지 체크리스트에 따라서 작업을 진행한다.
완료 후 트러블슈팅 문서 업데이트 한다 
관리자가 직접 깃 커밋/ 푸쉬하니까 넌 깃은 손대지 말것 

트래블슈팅문서 업데이트 및 작성법
C:\Users\JAVIS\ch\ch25\docs\v2_specs\90_troubleshooting\README.md

기술 기준문서 :
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned 내 도메인별 폴더/문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk  모든문서
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_A_sot_code_ops_chk\learned_\00_con.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\00_INDEX.md

배포문서 
C:\Users\JAVIS\ch\ch25\docs\v2_specs\05_ops\deployment\v2_deployment_automation_script_ko.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\05_ops\deployment\v2_deployment_docker_compose_guide_ko.md
C:\Users\JAVIS\ch\ch25\docs\v2_specs\05_ops\deployment\v2_deployment_rollback_script_ko.md

ssh 접속 실제 운영서버 확인 
C:\Users\JAVIS\.ssh\id_ed25519_vultr roott@149.28.135.147

 ssh -i C:\Users\JAVIS\.ssh\id_ed25519_vultr root@149.28.135.147 "docker logs xmas-backend --tail=200"
---------
http://localhost:8501/ - 엑셀 누적 데이터! 

