# 퍼널(전체/보낸리스트) 분석 — 2026-02-06

## 0) 캠페인 3일차까지 진행/결과 체크(전체)

### 0-1. 일자별 집계(요청 포맷)
| 날짜 | 총 발송(sent) | 답장(replies) | reply_rate | joins(DB) | join_rate | bot_start(클릭 대체) | click_proxy_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2/4 | 11 | 6 | 54.5 | 6 | 54.5 | 8 | 72.7 |
| 2/5 | 26 | 7 | 26.9 | 5 | 19.2 | 7 | 26.9 |
### 0-1. 일자별 집계(요청 포맷)
| 날짜 | 총 발송(sent) | 답장(replies) | reply_rate | joins(DB) | join_rate | bot_start(클릭 대체) | click_proxy_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2/4 | 11 | 6 | 54.5 | 6 | 54.5 | 8 | 72.7 |
| 2/5 | 26 | 7 | 26.9 | 5 | 19.2 | 7 | 26.9 |
| 2/6 | 24 | 4 | 16.7 | 4 | 16.7 | 7 | 29.2 |

> **Note**: 2/6 Data verified via **Local DB Sync** (Dump 2026-02-07).
> - **Joins**: 4
> - **Bot Start (Created)**: 7 (3 dropped off before linking)
> - **Deposits**: 0

### 0-2. 퍼널별 전환율(발송 → 답장 → bot_start(대체) → 실질 입금)
| 날짜 | sent | replies | reply/sent | bot_start_proxy | bot_start/sent | deposits(first_deposit_at) | deposit/sent | deposit/bot_start |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2/4 | 11 | 6 | 54.5 | 8 | 72.7 | 3 | 27.3 | 37.5 |
| 2/5 | 26 | 7 | 26.9 | 7 | 26.9 | 2 | 7.7 | 28.6 |
| 2/6 | 24 | 4 | 16.7 | 4 | 16.7 | 0 | 0.0 | 0.0 |

- 실질 입금 수치: DB `v2_user.first_deposit_at` (0건)

### 0-3. 어디서 가장 많이 이탈하나(3일차까지)
- 2/4: `sent→reply` 이탈 5명(45.5%), `bot_start→deposit` 이탈 5명(62.5%)
- 2/5: `sent→reply` 이탈 19명(73.1%), `bot_start→deposit` 이탈 5명(71.4%)
- 2/6: `sent→reply` 이탈 20명(83.3%), `bot_start` 이후 입금 전환 0명 (100% 이탈)

---

## 1) 보낸 리스트 기준 퍼널 분석

> **[Warning] Source List Missing**
> `marketing_analysis_results/sent_list_20260206.txt` 파일을 찾을 수 없어 상세 명단 매칭 분석을 수행할 수 없습니다.
> 아래 내용은 `00_CC개선방안1주차_피드백.md`의 집계 데이터를 바탕으로 작성되었습니다.

### 1-1. 입력(보낸 리스트)
- 소스: `marketing_analysis_results/sent_list_20260206.txt` (Missing)
- 총 인원: 24 (추정 from Summary)

### 1-2. 매칭 요약(DB)
- HQ 매칭: (데이터 없음)
- v2_user 매칭: (데이터 없음)

### 1-3. 퍼널 집계(보낸 리스트 기준)
- 클릭(대체: 신규 v2_user 생성): 7 (Local Sync)
- 가입(joins, hq_prospective_user.linked_at): 4 (Local Sync)
- 첫입금(first_deposit_at): 0 (Local Sync)

### 1-4. 세그먼트 분포(HQ 매칭된 경우)
- (데이터 없음 - Source List Missing)

### 1-5. 가입(joins) 일자별
- 2026-02-06: 4

### 1-5a. 일자별 퍼널
- **Cohort (24명 발송 기준 추정)**
    - Click(Proxy): 7 (29.2%)
    - Joins: 4 (16.7%)
    - Deposit: 0 (0%)

### 1-6. 산출물
- CSV(유저별 상태): (생성 불가)
- 이 리포트: `marketing_analysis_results/funnel_sent_list_analysis_20260206.md`

### 1-7. 주의(클릭/답장 로그)
- **Local DB Verified**: 2/6일자 `v2_user` 생성(클릭 대체)은 **7건**, 가입은 **4건**입니다.
- 3명은 봇을 시작했으나 계정 연동(Join)까지 가지 않고 이탈했습니다.

### 1-8. 유저별 상세(보낸 리스트)
| nickname | segment(HQ) | total_margin | joined? | linked_at | v2_created_at(클릭대체) | first_deposit_at | notes |
|---|---|---:|---:|---|---|---|---|
| (DB Dump 11:26 AM 기준 없음) | | | | | | | |
