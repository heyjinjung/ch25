# 퍼널(전체/보낸리스트) 분석 — 2026-02-04 ~02-05

## 0) 캠페인 2일차까지 진행/결과 체크(전체)

### 0-1. 일자별 집계(요청 포맷)
| 날짜 | 총 발송(sent) | 답장(replies) | reply_rate | joins(DB) | join_rate | bot_start(클릭 대체) | click_proxy_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2/4 | 11 | 6 | 54.5 | 6 | 54.5 | 8 | 72.7 |
| 2/5 | 26 | 7 | 26.9 | 5 | 19.2 | 7 | 26.9 |

- 발송/답장 수치: `marketing_analysis_results/CC 개선방안 1주차.md`의 DAILY_SUMMARY 정의/기록값 사용
- 가입(joins) 수치: DB `hq_prospective_user.is_joined=1 AND linked_at IS NOT NULL`
- bot_start(클릭) 수치: DB에 직접 로그가 없어 **대체 지표**로 `v2_user.created_at` 일자별 건수 사용

### 0-2. 퍼널별 전환율(발송 → 답장 → bot_start(대체) → 실질 입금)
| 날짜 | sent | replies | reply/sent | bot_start_proxy | bot_start/sent | deposits(first_deposit_at) | deposit/sent | deposit/bot_start |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2/4 | 11 | 6 | 54.5 | 8 | 72.7 | 3 | 27.3 | 37.5 |
| 2/5 | 26 | 7 | 26.9 | 7 | 26.9 | 2 | 7.7 | 28.6 |

- 실질 입금 수치: DB `v2_user.first_deposit_at` 일자별 건수 (02/04~02/05: 3건/2건)

### 0-3. 어디서 가장 많이 이탈하나(2일차까지)
- 2/4: `sent→reply` 이탈 5명(45.5%), `bot_start→deposit` 이탈 5명(62.5%)
- 2/5: `sent→reply` 이탈 19명(73.1%), `bot_start→deposit` 이탈 5명(71.4%)

> 주의: bot_start는 “클릭/봇 시작” 원본 로그가 아니라 `v2_user 생성` 대체지표라서, replies의 부분집합이 아닐 수 있습니다(예: 2/4에 bot_start가 replies보다 큼). 퍼널 단계 간 정확한 이탈을 보려면 클릭/딥링크/`/start` 이벤트 로그 수집이 필요합니다.

---

## 1) 보낸 리스트 기준 퍼널 분석

### 1-1. 입력(보낸 리스트)
- 소스: `marketing_analysis_results/sent_list_20260206.txt`
- 총 인원: 25

### 1-2. 매칭 요약(DB)
- HQ(180명) 매칭: 20/25 (80.0%)
- v2_user 매칭: 9/25 (36.0%)

### 1-3. 퍼널 집계(보낸 리스트 기준)
- 클릭(대체: 신규 v2_user 생성): 8/25 (32.0%)
- 가입(joins, hq_prospective_user.linked_at): 7/25 (28.0%)
- 첫입금(first_deposit_at): 3/25 (12.0%)

### 1-4. 세그먼트 분포(HQ 매칭된 경우)
- AT_RISK: 10
- COMMON: 5
- VIP: 4
- WHALE: 1

### 1-5. 가입(joins) 일자별
- 2026-02-04: 2
- 2026-02-05: 5

### 1-5a. 일자별 퍼널(보낸 리스트 25명만, 이벤트 발생일 기준)
| 날짜 | cohort(명) | joins(DB) | join_rate | bot_start_proxy(클릭대체) | click_proxy_rate | deposits(first_deposit_at) | deposit_rate | deposit/bot_start |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2/4 | 25 | 2 | 8.0 | 2 | 8.0 | 1 | 4.0 | 50.0 |
| 2/5 | 25 | 5 | 20.0 | 6 | 24.0 | 2 | 8.0 | 33.3 |

- cohort(25명)는 고정이며, 각 값은 “메시지 발송일”이 아니라 해당 이벤트(가입/신규생성/첫입금)가 발생한 날짜 기준으로 집계했습니다.

### 1-6. 산출물
- CSV(유저별 상태): `marketing_analysis_results/funnel_sent_list_user_status_since_20260204.csv`
- 이 리포트: `marketing_analysis_results/funnel_sent_list_analysis_since_20260204.md`

### 1-7. 주의(클릭/답장 로그)
- DB에 클릭/답장 이벤트 로그 테이블이 없어, 클릭은 `v2_user.created_at`(신규 유저 생성)으로 대체했습니다.
- 답장(replies)은 운영 시트 값 외에 DB에서 재구성 불가합니다.

### 1-8. 유저별 상세(보낸 리스트 25명)
| nickname | segment(HQ) | total_margin | joined? | linked_at | v2_created_at(클릭대체) | first_deposit_at | notes |
|---|---|---:|---:|---|---|---|---|
| 돈따묵쟈 | VIP | 5450000 | 1 | 2026-02-05 09:03:51 | 2026-02-05 18:03:43 | 2026-02-05 09:14:51 | JOINED_AFTER_START|CLICK_PROXY_NEW_USER|DEPOSIT_AFTER_START |
| 팔라오 |  |  |  |  |  |  | NOT_IN_HQ_180 |
| 제트장인 | AT_RISK | 10000 | 0 |  | 2026-02-05 19:07:06 |  | CLICK_PROXY_NEW_USER |
| 일등당첨 | WHALE | -480000 | 1 | 2026-02-04 06:20:31 | 2026-02-04 13:33:04 | 2026-02-04 06:49:42 | JOINED_AFTER_START|CLICK_PROXY_NEW_USER|DEPOSIT_AFTER_START |
| 돈죠요 | COMMON | -350000 | 0 |  |  |  |  |
| 콩이랑 | AT_RISK | 20000 | 1 | 2026-02-05 02:26:08 | 2026-02-05 11:25:14 |  | JOINED_AFTER_START|CLICK_PROXY_NEW_USER |
| 동의어보감 |  |  |  |  |  |  | NOT_IN_HQ_180 |
| 킴대리임 | AT_RISK | 200000 | 0 |  |  |  |  |
| 아기상어요 | COMMON | -50000 | 1 | 2026-02-05 01:21:15 | 2026-02-05 10:13:28 |  | JOINED_AFTER_START|CLICK_PROXY_NEW_USER |
| 동추 | VIP | 10990000 | 1 | 2026-02-05 01:35:05 | 2026-02-05 10:29:13 | 2026-02-05 01:50:37 | JOINED_AFTER_START|CLICK_PROXY_NEW_USER|DEPOSIT_AFTER_START |
| 레몬향 | AT_RISK | 1000000 | 0 |  |  |  |  |
| 자르반이큐 | VIP | 1990000 | 0 |  |  |  |  |
| 으랏챠차 |  |  |  |  |  |  | NOT_IN_HQ_180 |
| 자리 | VIP | 1370000 | 0 |  |  |  |  |
| 누워서젖먹기 | AT_RISK | 100000 | 0 |  |  |  |  |
| 휴식시간 | AT_RISK | 100000 | 0 |  |  |  |  |
| 치실 | AT_RISK | 100000 | 1 | 2026-02-03 09:26:03 | 2026-02-03 18:19:50 | 2026-02-03 09:23:37 | JOINED_BEFORE_START |
| 외오리바람 | AT_RISK | 100000 | 0 |  |  |  |  |
| 비다이다 |  |  |  |  |  |  | NOT_IN_HQ_180 |
| 소노피 | COMMON | -140000 | 0 |  |  |  |  |
| 에버리치 | COMMON | -480000 | 1 | 2026-02-04 11:35:12 | 2026-02-04 20:32:12 |  | JOINED_AFTER_START|CLICK_PROXY_NEW_USER |
| 알레리노 | AT_RISK | 200000 | 0 |  |  |  |  |
| 세상은참 | AT_RISK | 370000 | 0 |  |  |  |  |
| 서간밸 |  |  |  |  |  |  | NOT_IN_HQ_180 |
| 배곧재우 | COMMON | -90000 | 1 | 2026-02-05 00:33:11 | 2026-02-05 09:29:31 |  | JOINED_AFTER_START|CLICK_PROXY_NEW_USER |
