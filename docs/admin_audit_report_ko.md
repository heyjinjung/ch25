# 어드민 시스템 전수 검사 결과 보고서 (Admin System Comprehensive Audit Report)

## 요약 (Executive Summary)
[발견 사항, 중요 이슈, 전반적인 시스템 상태 요약]

### 1단계: 사용자 및 CRM 핵심 (User & Core)
| 모듈 | 파일 | DB 모델 | 주요 점검 항목 | 결과 | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Users** | `admin_users.py` | `User` | 사용자 조회/차단/삭제 | [Pass] | 목록/검색 검증완료 |
| **CRM** | `admin_crm.py` | `Activity` | 프로필 임포트, 메시지 발송 | [Pass] | 프로필 데이터 연동 확인 |
| **Segments** | `admin_segments.py` | `Segment` | 세그먼트 분류/태깅 | [Pass] | NEWBIE 세그먼트 확인 |
| **Identity** | `admin_crm.py`, `admin_game_tokens.py` | `User` | **Telegram Username Frame Switch** | **[FIXED]** | **Refactored**: CSV 임포트 및 토큰 관리지원. Sync & Frame Switch 완료. |

### 2단계: 경제 및 게임 운영 (Ops Economy)
| 모듈 | 파일 | DB 모델 | 주요 점검 항목 | 결과 | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Roulette** | `admin_roulette.py` | `Config` | 휠 세그먼트, 가중치 설정 | [Pass] | 6개 슬롯 가중치 및 보상 타입 설정 검증 완료 |
| **Team Battle** | `admin_team_battle.py` | `Team` | 시즌 제어, 정산 로직 | [Pass] | 시즌/팀 생성 및 유저 강제배정 검증 완료 |
| **Vault Accrual** | `admin_vault_...` | `Program` | 게임 리워드별 금고 적립 | [Pass] | `VaultProgram` 설정을 통한 게임별 적립액 관리 가능 확인 |

### [Deep Dive] 경제 시스템 운영 상세
*   **재화별 반영 경로 (Ledger) 이원화 확인**:
    *   `DIAMOND`: **Inventory Ledger**에 기록 (상점/장비 중심)
    *   `GOLD_KEY`, `DIAMOND_KEY`, `TICKET`: **Game Wallet Ledger**에 기록 (플레이 티켓 중심)
    *   `CC_COIN`: Game Wallet 시스템 내에서 관리 가능 확인
*   **쿠폰 (Coupon) 시스템 상태**:
    *   **[CAUTION]** `RewardService` 내 `grant_coupon`이 현재 'Deferred (TODO)' 상태임. 즉, 어드민에서 쿠폰 지급 시 실제 로직이 작동하지 않을 수 있음. - 오케이 
*   **금고 적립 관리**:
    *   `VaultProgram`의 `config_json` 내 `game_earn_config` 필드를 통해 각 게임(Roulette, Dice 등)의 결과(WIN/LOSE)에 따른 금고 적립액을 세부 조정할 수 있음을 확인했습니다.

### 3단계: 인게이지먼트 및 콘텐츠 (Engagement)
| 모듈 | 파일 | DB 모델 | 주요 점검 항목 | 결과 | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Season Pass** | `admin_seasons.py` | `PassConfig` | 시즌 XP/보상 설정 | [ ] | |
| **Survey** | `admin_survey.py` | `Survey` | 설문 생성/데이터 수집 | [ ] | |
| **Ranking** | `admin_ranking...` | `Ranking` | 리더보드 집계 | [ ] | |

### 4단계: 금고(Vault) 시스템 (Priority)
| 모듈 | 파일 | DB 모델 | 주요 점검 항목 | 결과 | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vault Ops** | `admin_vault_ops.py` | `User` | 타이머 제어, VIP 상태 | [ ] | |
| **Programs** | `admin_vault_programs.py` | `Program` | 프로그램 JSON 설정 | [ ] | |
| **Transitions** | `admin_vault2.py` | `User` | 배치 Tick 처리 | [ ] | |

### 5단계: 시스템 및 기타 (System)
| 모듈 | 파일 | DB 모델 | 주요 점검 항목 | 결과 | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `admin_dashboard.py` | `Logs` | 지표 정확성/속도 | [ ] | |
| **Config** | `admin_ui_config...` | `Config` | 기능 플래그, UI 텍스트 | [ ] | |

## 조치 항목 / 발견된 이슈 (Action Items / Issues Found)
- [ ] 이슈 1...
- [ ] 이슈 2...
