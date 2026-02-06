문서 타입: 게임 장애 전수검사 기록
버전: v1.0
작성일: 2026-01-25
작성자: GitHub Copilot
대상: BE/FE/QA
상태: Draft

# V2 게임 장애 전수검사 기록 (2026-01-24 ~ 2026-01-25)

## 1) 목적
- v2_game_failures_for_ai_20260124.md 및 v2_game_failures_for_ai_20260125.md에 기록된 **게임 관련 항목 전수검사** 결과를 통합 정리한다.
- 해당 문서들에서 **내가 실행한 수정값(파일/핵심 변경)**을 항목별로 상세 기록한다.

## 2) 범위
- 게임: 룰렛/주사위/복권 (V2)
- 어드민 게임 설정, 유저 게임 상태/플레이 API
- 문서 출처:
  - docs/v2_specs/00_sot_meta/v2_game_failures_for_ai_20260124.md
  - docs/v2_specs/00_sot_meta/v2_game_failures_for_ai_20260125.md

## 3) 요약 (핵심 결론)
- 이번 변경은 **게임 활성화를 보장하지 않는다**.
- 목적은 **설정 누락/무효로 인한 500/멈춤을 200/빈 데이터로 안전 응답**하도록 하여 운영 UI가 복구할 여지를 확보하는 것이다.
- **게임 활성화는 DB 설정/활성 플래그/유효성 조건이 충족되어야만** 가능하다.
좇같은 소리하고 있네
이렇게 해놓고 몇일을 시간 낭비하면서 게임 안 돌아갔고 결국 다 망가짐 

---

## 4) 전수검사 — 게임 관련 항목 및 실행된 수정값

1월 25일 kst 기준 실시간 오류 상황

주사위섹션 / 유저 

요청 URL
http://localhost:3000/api/v2/dice/play
요청 메서드
POST
상태 코드
500 Internal Server Error
원격 주소
[::1]:3000
리퍼러 정책
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
http://localhost:3000
connection
keep-alive
content-length
56
content-type
application/json
date
Sun, 25 Jan 2026 08:27:31 GMT
server
nginx/1.28.0
vary
Origin
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
1; mode=block
accept
application/json, text/plain, */*
accept-encoding
gzip, deflate, br, zstd
accept-language
ko-KR,ko;q=0.9
authorization
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNSIsImlhdCI6MTc2OTMyOTYyNSwiZXhwIjoxNzY5NDE2MDI1LCJ0eXAiOiJhY2Nlc3MifQ.gtMCqMCy3oQix7kaKUFPnEIVDylreqCMnI4aB8liKco
cache-control
no-cache
connection
keep-alive
content-length
34
content-type
application/json
dnt
1
host
localhost:3000
origin
http://localhost:3000
pragma
no-cache
referer
http://localhost:3000/game/dice
sec-ch-ua
"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"
sec-ch-ua-mobile
?1
sec-ch-ua-platform
"Android"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
same-origin
user-agent
Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36



청 URL
http://localhost:3000/api/v2/dice/status
요청 메서드
GET
상태 코드
200 OK
원격 주소
[::1]:3000
리퍼러 정책
strict-origin-when-cross-origin
connection
keep-alive
content-encoding
br
content-type
application/json
date
Sun, 25 Jan 2026 08:27:49 GMT
server
nginx/1.28.0
transfer-encoding
chunked
vary
Accept-Encoding
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
1; mode=block

client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
code
: 
"ERR_BAD_RESPONSE"
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
message
: 
"Request failed with status code 500"
name
: 
"AxiosError"
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
response
: 
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
data
: 
{error: {…}}
headers
: 
xr {access-control-allow-credentials: 'true', access-control-allow-origin: 'http://localhost:3000', connection: 'keep-alive', content-length: '56', content-type: 'application/json', …}
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
status
: 
500
statusText
: 
"Internal Server Error"
[[Prototype]]
: 
Object
status
: 
500
stack
: 
"AxiosError: Request failed with status code 500\n    at d2 (http://localhost:3000/assets/index-CMkhguWK.js:399:1088)\n    at XMLHttpRequest.N (http://localhost:3000/assets/index-CMkhguWK.js:399:5847)\n    at Oo.request (http://localhost:3000/assets/index-CMkhguWK.js:401:2094)\n    at async oee (http://localhost:3000/assets/index-CMkhguWK.js:482:30875)"
[[Prototype]]
: 
Error
(익명)	@	client.ts:89
Promise.then		
_request	@	Axios.js:163
request	@	Axios.js:40
(익명)	@	Axios.js:224
(익명)	@	bind.js:12
oee	@	v1CompatAdapter.ts:457
mutationFn	@	DicePage.tsx:72
fn	@	mutation.js:74
b	@	retryer.js:77
start	@	retryer.js:119
execute	@	mutation.js:113
await in execute		
mutate	@	mutationObserver.js:61
P	@	DicePage.tsx:103
CI	@	react-dom.production.min.js:54
TI	@	react-dom.production.min.js:54
EI	@	react-dom.production.min.js:55
c_	@	react-dom.production.min.js:105
u_	@	react-dom.production.min.js:106
(익명)	@	react-dom.production.min.js:117
hx	@	react-dom.production.min.js:273
gb	@	react-dom.production.min.js:52
hg	@	react-dom.production.min.js:109
Yp	@	react-dom.production.min.js:74
HI	@	react-dom.production.min.js:73


게임하여도 테스트유저 (백앤드 cc_id 0126) 티켓차감없음
결과보상 없음


- 룰렛섹션 룰렛 4종 기본/골드/다이아/체험 
- 네트워크에 5개 기본/기본/골드/다이아/체험 이렇게 잡힘 

요청 URL
http://localhost:3000/api/v2/roulette/status?ticket_type=ROULETTE_TICKET
요청 메서드
GET
상태 코드
200 OK
원격 주소
[::1]:3000
리퍼러 정책
strict-origin-when-cross-origin
connection
keep-alive
content-encoding
br
content-type
application/json
date
Sun, 25 Jan 2026 08:28:41 GMT
server
nginx/1.28.0
transfer-encoding
chunked
vary
Accept-Encoding
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
1; mode=block 


client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
code
: 
"ERR_BAD_RESPONSE"
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
message
: 
"Request failed with status code 500"
name
: 
"AxiosError"
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
response
: 
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
data
: 
{error: {…}}
headers
: 
xr {access-control-allow-credentials: 'true', access-control-allow-origin: 'http://localhost:3000', connection: 'keep-alive', content-length: '56', content-type: 'application/json', …}
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
status
: 
500
statusText
: 
"Internal Server Error"
[[Prototype]]
: 
Object
status
: 
500
stack
: 
"AxiosError: Request failed with status code 500\n    at d2 (http://localhost:3000/assets/index-CMkhguWK.js:399:1088)\n    at XMLHttpRequest.N (http://localhost:3000/assets/index-CMkhguWK.js:399:5847)\n    at Oo.request (http://localhost:3000/assets/index-CMkhguWK.js:401:2094)\n    at async iee (http://localhost:3000/assets/index-CMkhguWK.js:482:28163)"
[[Prototype]]
: 
Error
(익명)	@	client.ts:89
Promise.then		
_request	@	Axios.js:163
request	@	Axios.js:40
(익명)	@	Axios.js:224
(익명)	@	bind.js:12
iee	@	v1CompatAdapter.ts:329
mutationFn	@	RoulettePage.tsx:96
fn	@	mutation.js:74
b	@	retryer.js:77
start	@	retryer.js:119
execute	@	mutation.js:113
await in execute		
mutate	@	mutationObserver.js:61
(익명)	@	useMutation.js:33
A	@	RoulettePage.tsx:132
CI	@	react-dom.production.min.js:54
TI	@	react-dom.production.min.js:54
EI	@	react-dom.production.min.js:55
c_	@	react-dom.production.min.js:105
u_	@	react-dom.production.min.js:106
(익명)	@	react-dom.production.min.js:117
hx	@	react-dom.production.min.js:273
gb	@	react-dom.production.min.js:52
hg	@	react-dom.production.min.js:109
Yp	@	react-dom.production.min.js:74
HI	@	react-dom.production.min.js:73
v1CompatAdapter.ts:356 [V2Adapter] Failed to play roulette 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
xhr.js:198 
 POST http://localhost:3000/api/v2/roulette/play 500 (Internal Server Error)
client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
v1CompatAdapter.ts:356 [V2Adapter] Failed to play roulette 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}


client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
code
: 
"ERR_BAD_RESPONSE"
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
message
: 
"Request failed with status code 500"
name
: 
"AxiosError"
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
response
: 
{data: {…}, status: 500, statusText: 'Internal Server Error', headers: xr, config: {…}, …}
status
: 
500
stack
: 
"AxiosError: Request failed with status code 500\n    at d2 (http://localhost:3000/assets/index-CMkhguWK.js:399:1088)\n    at XMLHttpRequest.N (http://localhost:3000/assets/index-CMkhguWK.js:399:5847)\n    at Oo.request (http://localhost:3000/assets/index-CMkhguWK.js:401:2094)\n    at async iee (http://localhost:3000/assets/index-CMkhguWK.js:482:28163)"
[[Prototype]]
: 
Error
(익명)	@	client.ts:89
Promise.then		
_request	@	Axios.js:163
request	@	Axios.js:40
(익명)	@	Axios.js:224
(익명)	@	bind.js:12
iee	@	v1CompatAdapter.ts:329
mutationFn	@	RoulettePage.tsx:96
fn	@	mutation.js:74
b	@	retryer.js:77
start	@	retryer.js:119
execute	@	mutation.js:113
await in execute		
mutate	@	mutationObserver.js:61
(익명)	@	useMutation.js:33
A	@	RoulettePage.tsx:132
CI	@	react-dom.production.min.js:54
TI	@	react-dom.production.min.js:54
EI	@	react-dom.production.min.js:55
c_	@	react-dom.production.min.js:105
u_	@	react-dom.production.min.js:106
(익명)	@	react-dom.production.min.js:117
hx	@	react-dom.production.min.js:273
gb	@	react-dom.production.min.js:52
hg	@	react-dom.production.min.js:109
Yp	@	react-dom.production.min.js:74
HI	@	react-dom.production.min.js:73

v1CompatAdapter.ts:356 [V2Adapter] Failed to play roulette 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}

﻿

---- 룰렛 게임 안됨 / 플레이 회전이 아예 안 돌아감
일반은 아예 버튼 비활성화
골든은 티켓 차감되나 액션없고 보상확인 안됨
다이아 역시 버튼은 눌러지나 아무것도 확인안됨
체험티켓 버튼 비활성화



 


----복권섹션 

복권역시 전체에러

POST http://localhost:3000/api/v2/lottery/play 500 (Internal Server Error)
(익명) @ xhr.js:198
xhr @ xhr.js:15
oj @ dispatchRequest.js:49
Promise.then
_request @ Axios.js:163
request @ Axios.js:40
(익명) @ Axios.js:224
(익명) @ bind.js:12
cee @ v1CompatAdapter.ts:537
mutationFn @ LotteryPage.tsx:38
fn @ mutation.js:74
b @ retryer.js:77
start @ retryer.js:119
execute @ mutation.js:113
await in execute
mutate @ mutationObserver.js:61
$ @ LotteryPage.tsx:98
CI @ react-dom.production.min.js:54
TI @ react-dom.production.min.js:54
EI @ react-dom.production.min.js:55
c_ @ react-dom.production.min.js:105
u_ @ react-dom.production.min.js:106
(익명) @ react-dom.production.min.js:117
hx @ react-dom.production.min.js:273
gb @ react-dom.production.min.js:52
hg @ react-dom.production.min.js:109
Yp @ react-dom.production.min.js:74
HI @ react-dom.production.min.js:73이 오류 이해하기
client.ts:89 [v2Client] response error ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
(익명) @ client.ts:89
Promise.then
_request @ Axios.js:163
request @ Axios.js:40
(익명) @ Axios.js:224
(익명) @ bind.js:12
cee @ v1CompatAdapter.ts:537
mutationFn @ LotteryPage.tsx:38
fn @ mutation.js:74
b @ retryer.js:77
start @ retryer.js:119
execute @ mutation.js:113
await in execute
mutate @ mutationObserver.js:61
$ @ LotteryPage.tsx:98
CI @ react-dom.production.min.js:54
TI @ react-dom.production.min.js:54
EI @ react-dom.production.min.js:55
c_ @ react-dom.production.min.js:105
u_ @ react-dom.production.min.js:106
(익명) @ react-dom.production.min.js:117
hx @ react-dom.production.min.js:273
gb @ react-dom.production.min.js:52
hg @ react-dom.production.min.js:109
Yp @ react-dom.production.min.js:74
HI @ react-dom.production.min.js:73이 오류 이해하기
v1CompatAdapter.ts:560 [V2Adapter] Failed to play lottery ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
cee @ v1CompatAdapter.ts:560
await in cee
mutationFn @ LotteryPage.tsx:38
fn @ mutation.js:74
b @ retryer.js:77
start @ retryer.js:119
execute @ mutation.js:113
await in execute
mutate @ mutationObserver.js:61
$ @ LotteryPage.tsx:98
CI @ react-dom.production.min.js:54
TI @ react-dom.production.min.js:54
EI @ react-dom.production.min.js:55
c_ @ react-dom.production.min.js:105
u_ @ react-dom.production.min.js:106
(익명) @ react-dom.production.min.js:117
hx @ react-dom.production.min.js:273
gb @ react-dom.production.min.js:52
hg @ react-dom.production.min.js:109
Yp @ react-dom.production.min.js:74
HI @ react-dom.production.min.js:73이 오류 이해하기
LotteryPage.tsx:40 [LotteryPage] Play failed: ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
onError @ LotteryPage.tsx:40
execute @ mutation.js:153
await in execute
mutate @ mutationObserver.js:61
$ @ LotteryPage.tsx:98
CI @ react-dom.production.min.js:54
TI @ react-dom.production.min.js:54
EI @ react-dom.production.min.js:55
c_ @ react-dom.production.min.js:105
u_ @ react-dom.production.min.js:106
(익명) @ react-dom.production.min.js:117
hx @ react-dom.production.min.js:273
gb @ react-dom.production.min.js:52
hg @ react-dom.production.min.js:109
Yp @ react-dom.production.min.js:74
HI @ react-dom.production.min.js:73이 오류 이해하기
LotteryPage.tsx:116 [LotteryPage] Play error: ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
$ @ LotteryPage.tsx:116
await in $
CI @ react-dom.production.min.js:54
TI @ react-dom.production.min.js:54
EI @ react-dom.production.min.js:55
c_ @ react-dom.production.min.js:105
u_ @ react-dom.production.min.js:106
(익명) @ react-dom.production.min.js:117
hx @ react-dom.production.min.js:273
gb @ react-dom.production.min.js:52
hg @ react-dom.production.min.js:109
Yp @ react-dom.production.min.js:74
HI @ react-dom.production.min.js:73이 오류 이해하기

[v2Client] response error 

client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
code
: 
"ERR_BAD_RESPONSE"
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
message
: 
"Request failed with status code 500"
name
: 
"AxiosError"
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
response
: 
config
: 
adapter
: 
(3) ['xhr', 'http', 'fetch']
allowAbsoluteUrls
: 
true
baseURL
: 
""
data
: 
"{}"
env
: 
{FormData: ƒ, Blob: ƒ}
headers
: 
xr {Accept: 'application/json, text/plain, */*', Content-Type: 'application/json', Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdW…3MifQ.gtMCqMCy3oQix7kaKUFPnEIVDylreqCMnI4aB8liKco'}
maxBodyLength
: 
-1
maxContentLength
: 
-1
method
: 
"post"
timeout
: 
15000
transformRequest
: 
[ƒ]
transformResponse
: 
[ƒ]
transitional
: 
{silentJSONParsing: true, forcedJSONParsing: true, clarifyTimeoutError: false}
url
: 
"/api/v2/lottery/play"
validateStatus
: 
ƒ (e)
xsrfCookieName
: 
"XSRF-TOKEN"
xsrfHeaderName
: 
"X-XSRF-TOKEN"
[[Prototype]]
: 
Object
data
: 
{error: {…}}
headers
: 
xr
access-control-allow-credentials
: 
"true"
access-control-allow-origin
: 
"http://localhost:3000"
connection
: 
"keep-alive"
content-length
: 
"56"
content-type
: 
"application/json"
date
: 
"Sun, 25 Jan 2026 08:32:55 GMT"
server
: 
"nginx/1.28.0"
vary
: 
"Origin"
x-content-type-options
: 
"nosniff"
x-frame-options
: 
"SAMEORIGIN"
x-xss-protection
: 
"1; mode=block"
clear
: 
(…)
concat
: 
(…)
constructor
: 
(…)
delete
: 
(…)
get
: 
(…)
getAccept
: 
(…)
getAcceptEncoding
: 
(…)
getAuthorization
: 
(…)
getContentLength
: 
(…)
getContentType
: 
(…)
getSetCookie
: 
(…)
getUserAgent
: 
(…)
has
: 
(…)
hasAccept
: 
(…)
hasAcceptEncoding
: 
(…)
hasAuthorization
: 
(…)
hasContentLength
: 
(…)
hasContentType
: 
(…)
hasUserAgent
: 
(…)
normalize
: 
(…)
set
: 
(…)
setAccept
: 
(…)
setAcceptEncoding
: 
(…)
setAuthorization
: 
(…)
setContentLength
: 
(…)
setContentType
: 
(…)
setUserAgent
: 
(…)
toJSON
: 
(…)
toString
: 
(…)
Symbol(Symbol.toStringTag)
: 
(…)
[[Prototype]]
: 
Object
request
: 
XMLHttpRequest
onabort
: 
ƒ ()
onerror
: 
ƒ (T)
onload
: 
null
onloadend
: 
ƒ N()
onloadstart
: 
null
onprogress
: 
null
onreadystatechange
: 
null
ontimeout
: 
ƒ ()
readyState
: 
4
response
: 
"{\"error\":{\"code\":\"DB_ERROR\",\"message\":\"DATABASE_ERROR\"}}"
responseText
: 
"{\"error\":{\"code\":\"DB_ERROR\",\"message\":\"DATABASE_ERROR\"}}"
responseType
: 
""
responseURL
: 
"http://localhost:3000/api/v2/lottery/play"
responseXML
: 
null
status
: 
500
statusText
: 
"Internal Server Error"
timeout
: 
15000
upload
: 
XMLHttpRequestUpload {onloadstart: null, onprogress: null, onabort: null, onerror: null, onload: null, …}
withCredentials
: 
false
[[Prototype]]
: 
XMLHttpRequest
status
: 
500
statusText
: 
"Internal Server Error"
[[Prototype]]
: 
Object
status
: 
500
stack
: 
"AxiosError: Request failed with status code 500\n    at d2 (http://localhost:3000/assets/index-CMkhguWK.js:399:1088)\n    at XMLHttpRequest.N (http://localhost:3000/assets/index-CMkhguWK.js:399:5847)\n    at Oo.request (http://localhost:3000/assets/index-CMkhguWK.js:401:2094)\n    at async cee (http://localhost:3000/assets/index-CMkhguWK.js:482:32071)"
[[Prototype]]
: 
Error



이것들이 다!!! 아래에 있는 조치를 취했음에도 유저화면에서 겪는 오류값임
그렇다면 어드민은 ? 

룰렛페이지 들어가자마자 오류
client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
(익명)	@	client.ts:89
Promise.then		
_request	@	Axios.js:163
request	@	Axios.js:40
Oo.<computed>	@	Axios.js:211
(익명)	@	bind.js:12
L8	@	adminApi.ts:1541
i	@	query.js:224
b	@	retryer.js:77
start	@	retryer.js:119
fetch	@	query.js:271
Uu	@	queryObserver.js:179
onSubscribe	@	queryObserver.js:52
subscribe	@	subscribable.js:9
(익명)	@	useBaseQuery.js:58
L_	@	react-dom.production.min.js:167
Qf	@	react-dom.production.min.js:243
jl	@	react-dom.production.min.js:285
(익명)	@	react-dom.production.min.js:281
E	@	scheduler.production.min.js:13
L	@	scheduler.production.min.js:14
xhr.js:198 
 GET http://localhost:3000/api/v2/admin/game/roulette/configs 500 (Internal Server Error)
(익명)	@	xhr.js:198
xhr	@	xhr.js:15
oj	@	dispatchRequest.js:49
Promise.then		
_request	@	Axios.js:163
request	@	Axios.js:40
Oo.<computed>	@	Axios.js:211
(익명)	@	bind.js:12
L8	@	adminApi.ts:1541
i	@	query.js:224
b	@	retryer.js:77
(익명)	@	retryer.js:101
Promise.then		
(익명)	@	retryer.js:97
Promise.catch		
b	@	retryer.js:81
start	@	retryer.js:119
fetch	@	query.js:271
Uu	@	queryObserver.js:179
onSubscribe	@	queryObserver.js:52
subscribe	@	subscribable.js:9
(익명)	@	useBaseQuery.js:58
L_	@	react-dom.production.min.js:167
Qf	@	react-dom.production.min.js:243
jl	@	react-dom.production.min.js:285
(익명)	@	react-dom.production.min.js:281
E	@	scheduler.production.min.js:13
L	@	scheduler.production.min.js:14
client.ts:89 [v2Client] response error 
ot {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
code
: 
"ERR_BAD_RESPONSE"
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
message
: 
"Request failed with status code 500"
name
: 
"AxiosError"
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
response
: 
config
: 
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 15000, …}
data
: 
{error: {…}}
headers
: 
xr {connection: 'keep-alive', content-length: '56', content-type: 'application/json', date: 'Sun, 25 Jan 2026 08:34:26 GMT', server: 'nginx/1.28.0', …}
request
: 
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 15000, withCredentials: false, upload: XMLHttpRequestUpload, …}
status
: 
500
statusText
: 
"Internal Server Error"
[[Prototype]]
: 
Object
status
: 
500
stack
: 
"AxiosError: Request failed with status code 500\n    at d2 (http://localhost:3000/assets/index-CMkhguWK.js:399:1088)\n    at XMLHttpRequest.N (http://localhost:3000/assets/index-CMkhguWK.js:399:5847)\n    at Oo.request (http://localhost:3000/assets/index-CMkhguWK.js:401:2094)\n    at async L8 (http://localhost:3000/assets/index-CMkhguWK.js:402:14229)"
[[Prototype]]
: 
Error
(익명)	@	client.ts:89
Promise.then		
_request	@	Axios.js:163
request	@	Axios.js:40
Oo.<computed>	@	Axios.js:211
(익명)	@	bind.js:12
L8	@	adminApi.ts:1541
i	@	query.js:224
b	@	retryer.js:77
(익명)	@	retryer.js:101
Promise.then		
(익명)	@	retryer.js:97
Promise.catch		
b	@	retryer.js:81
start	@	retryer.js:119
fetch	@	query.js:271
Uu	@	queryObserver.js:179
onSubscribe	@	queryObserver.js:52
subscribe	@	subscribable.js:9
(익명)	@	useBaseQuery.js:58
L_	@	react-dom.production.min.js:167
Qf	@	react-dom.production.min.js:243
jl	@	react-dom.production.min.js:285
(익명)	@	react-dom.production.min.js:281
E	@	scheduler.production.min.js:13
L	@	scheduler.production.min.js:14

﻿


요청 URL
http://localhost:3000/api/v2/admin/game/roulette/configs
요청 메서드
GET
상태 코드
500 Internal Server Error
원격 주소
[::1]:3000
리퍼러 정책
strict-origin-when-cross-origin
connection
keep-alive
content-length
56
content-type
application/json
date
Sun, 25 Jan 2026 08:34:25 GMT
server
nginx/1.28.0
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
1; mode=block
accept
application/json, text/plain, */*
accept-encoding
gzip, deflate, br, zstd
accept-language
ko-KR,ko;q=0.9
authorization
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiaWF0IjoxNzY5MzMwMDYyLCJleHAiOjE3Njk0MTY0NjIsInR5cCI6ImFjY2VzcyIsInJvbGUiOiJBRE1JTiIsInJvbGVzIjpbIkFETUlOIl19.JQqns-u-2Ht3sSRlsqbtC-EnzLZxCI3Mz6mVOzt2yF0
cache-control
no-cache
connection
keep-alive
dnt
1
host
localhost:3000
pragma
no-cache
referer
http://localhost:3000/admin/game/roulette
sec-ch-ua
"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"
sec-ch-ua-mobile
?1
sec-ch-ua-platform
"Android"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
same-origin
user-agent
Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari


- 주사위섹션 

가장 정상적 


---복권섹션


http://localhost:3000/api/v2/admin/game/lottery/config/1
요청 메서드
PUT
상태 코드
200 OK
원격 주소
[::1]:3000
리퍼러 정책
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
http://localhost:3000
connection
keep-alive
content-encoding
br
content-type
application/json
L
http://localhost:3000/api/v2/admin/game/lottery/configs
요청 메서드
GET
상태 코드
200 OK
원격 주소
[::1]:3000
리퍼러 정책
strict-origin-when-cross-origin
connection
keep-alive
content-encoding
br
content-type
application/json


200 정상 작동하나 새로고침하면 무조건 초기화됨

특별한 로그나 콘솔에러도 안나오고 이래서 진짜 미칠거 같음 




### 4.1 공통 장애: status 500/멈춤 (룰렛/주사위/복권)
- 증상
  - /api/v2/dice/status, /api/v2/roulette/status, /api/v2/lottery/status 가 500 또는 통신 실패
- 원인(문서 기준)
  - v2 user 매핑 실패 / config 미존재 / 예외 미처리 등
- 내가 실행한 수정값
  - 주사위 status에서 InvalidConfigError를 안전 처리하여 200 + 빈 데이터 반환
    - 파일: app/v2/services/v2_dice_game_service.py
    - 변경: get_status에서 InvalidConfigError 발생 시 UNCONFIGURED 응답 반환
  - 복권 status에서 InvalidConfigError/설정 미존재 시 200 + 빈 데이터 반환
    - 파일: app/v2/services/v2_lottery_game_service.py
    - 변경: config 미존재 시 UNCONFIGURED 응답 반환
- 기대 효과
  - 상태 조회에서 500 제거, UI가 오류 대신 비활성 상태를 표시 가능

### 4.2 공통 장애: play 400/500 (주사위/복권)
- 증상
  - 설정 오류 시 play가 500 또는 불명확한 에러로 종료
- 내가 실행한 수정값
  - play에서 InvalidConfigError를 400으로 명확히 반환
    - 파일: app/v2/api/routes.py
    - 변경: dice_play/lottery_play에 try/except 추가
- 기대 효과
  - 운영/프론트가 원인을 명확히 구분 가능 (INVALID_CONFIG 400)

---

### 4.3 룰렛 설정/상태 불일치 (티켓 타입/grade)
- 증상
  - 룰렛 status/play에서 V2_ROULETTE_CONFIG_MISSING 400
  - ticket_type/grade 매칭 실패
- 문서상 기록된 수정값(내가 실행한 항목)
  - ticket_type fallback 및 alias 처리
    - 파일: app/v2/services/v2_roulette_game_service.py
  - status/play에서 INVALID_CONFIG 처리 방식 보강
    - 파일: app/v2/api/routes.py
- 기대 효과
  - 설정 누락 시에도 fallback 가능, status/play 정상화

---

### 4.4 주사위 보상 표시 동기화 실패
- 증상
  - 어드민 설정된 보상이 유저 화면에 반영되지 않음
- 문서상 기록된 수정값(내가 실행한 항목)
  - status 응답에 reward_config 포함
    - 파일: app/schemas/dice.py
    - 파일: app/v2/services/v2_dice_game_service.py

---

### 4.5 복권 status INVALID_LOTTERY_CONFIG
- 증상
  - 복권 상태 조회 400 (INVALID_LOTTERY_CONFIG)
- 문서상 기록된 수정값(내가 실행한 항목)
  - status에서 INVALID_LOTTERY_CONFIG 시 빈 prize_preview로 200 반환
    - 파일: app/v2/services/v2_lottery_game_service.py

---

### 4.6 룰렛/복권/주사위: Admin 설정 저장 오류
- 증상
  - 주사위 확률 저장 422
  - 복권 prize 생성 500
- 문서상 기록된 수정값(내가 실행한 항목)
  - 주사위 확률 단위 보정 (0~1 vs 0~100)
    - 파일: src/v2/api/adminApi.ts
  - 복권 prize 생성 시 validation/예외 처리 강화 (문서 내 계획 기록)
    - 파일: app/v2/api/admin/game_config_routes.py

---

### 4.7 룰렛 8세그 확장
- 증상
  - 슬롯 범위 0~5 제한으로 8세그 설정 불가
- 문서상 기록된 수정값(내가 실행한 항목)
  - 슬롯 index 범위 0~7로 확장
    - 파일: app/v2/models/v2_roulette.py
    - 파일: app/v2/schemas/v2_admin_game_config.py
    - 파일: app/v2/schemas/v2_admin_game.py
    - 파일: app/v2/services/game_config_service.py
  - 마이그레이션 추가
    - 파일: alembic/versions/20260125_1600_expand_v2_roulette_segment_slots.py

---

### 4.8 룰렛 어드민 소모 티켓 타입 동기화
- 증상
  - 탭/Select 이중 소스로 인해 값 원복
  - GOLDEN_TICKET 레거시 표기 오류
- 문서상 기록된 수정값(내가 실행한 항목)
  - 탭 티켓 타입: GOLDEN_TICKET → GOLD_KEY_TICKET
    - 파일: src/v2/admin/pages/game/RouletteConfigPage.tsx
  - 소모 티켓 타입 Select 비활성화(탭 고정)
    - 파일: src/v2/admin/pages/game/RouletteConfigPage.tsx

---

### 4.9 유저 게임 상태 동기화 지연
- 증상
  - DEV 로그인 후 금고/티켓 수치 즉시 반영 안됨
- 문서상 기록된 수정값(내가 실행한 항목)
  - /api/v2/vault/status로 경로 정합화
    - 파일: src/v2/api/v1CompatAdapter.ts
  - 주사위/복권 플레이 후 v2-vault-status invalidate
    - 파일: src/v2/pages/game/DicePage.tsx
    - 파일: src/v2/pages/game/LotteryPage.tsx

---

### 4.10 룰렛/복권 상태 조회 오류의 UI 대응
- 증상
  - INVALID_CONFIG 시 UI가 오류로 멈춤
- 문서상 기록된 수정값(내가 실행한 항목)
  - 룰렛 status 400도 fallback 처리
    - 파일: src/v2/api/v1CompatAdapter.ts
  - 복권 status INVALID_LOTTERY_CONFIG 시 빈 prize_preview로 대응
    - 파일: app/v2/services/v2_lottery_game_service.py

---

### 4.11 보상 타입 SoT 불일치
- 증상
  - 어드민 보상 타입 셀렉트에 SoT 외 값 표시
- 문서상 기록된 수정값(내가 실행한 항목)
  - rewardItems SoT 기준 정합화
    - 파일: src/v2/constants/rewardItems.ts

---

### 4.12 어드민 라우팅 오류 (v1/v2 경로 혼선)
- 증상
  - /api/admin/* 호출로 404/422
- 문서상 기록된 수정값(내가 실행한 항목)
  - /api/v2/admin/*로 전면 정합화
    - 파일: src/v2/api/adminApi.ts

---

## 5) 추가 실행 수정값 (최근 실행)
- 주사위/복권 status 안전 응답(UNCONFIGURED) 추가
  - 파일: app/v2/services/v2_dice_game_service.py
  - 파일: app/v2/services/v2_lottery_game_service.py
- 주사위/복권 play InvalidConfigError 400 처리
  - 파일: app/v2/api/routes.py

## 6) 검증 체크리스트
- 복권 활성화 저장 → status ACTIVE 즉시 반영
- 룰렛/주사위/복권 status와 play가 동일 규칙으로 판단
- 설정 변경 후 UI 표시가 서버 응답과 1:1 일치
- status는 INVALID_CONFIG에서도 200 + 빈 데이터 반환
- play는 INVALID_CONFIG에서 400 반환

## 7) 남은 리스크
- DB 설정/활성 플래그가 충족되지 않으면 게임은 **활성화되지 않음**.
- UI 캐시 무효화가 누락되면 저장 직후 원복처럼 보일 수 있음.

## 8) 변경 이력
- v1.0 (2026-01-25, GitHub Copilot): 2026-01-24/25 게임 관련 항목 전수검사 기록 작성
