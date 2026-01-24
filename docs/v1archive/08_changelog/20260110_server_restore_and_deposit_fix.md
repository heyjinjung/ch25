# [2026-01-10] 서버 복원 및 외부 입금 데이터 보정

## 1. 개요 (Overview)
- **목적**: 구서버(149.28.135.147) 복원 후 외부 입금 데이터 임포트 및 XP/레벨 보정
- **배경**: 1/9 서버 재설치로 데이터 유실 → 백업 복원 → 외부 입금 데이터 수동 임포트 필요

## 2. 작업 내역

### 2.1 서버 복원 (완료)
- GitHub Actions CI/CD를 통한 Docker 컨테이너 재배포
- SSL 인증서 발급 (Let's Encrypt, cc-jm.com)
- DB 백업 복원 (server_dump.sql → alembic migrations)

### 2.2 외부 입금 데이터 임포트

#### 문제 1: 직접 SQL 업데이트로 XP 훅 우회
- **원인**: `import_external_ranking_data.py`가 직접 SQL로 `external_ranking_data` 테이블 업데이트
- **결과**: `AdminExternalRankingService.upsert_many()` 내부의 XP 지급 훅 미실행
- **영향**: 
  - `season_pass_progress` (SoT): XP 미반영
  - `user_level_progress` (레거시): XP 미반영

#### 해결 1: 레거시 XP 지급 (`grant_xp_for_deposits.py`)
- `LevelXPService.add_xp()` 호출하여 `user_level_progress` 업데이트
- 8명 유저, 총 1,440 XP 지급

#### 문제 2: 시즌패스 XP 누락 (percipic)
- **분석**: 다른 유저는 이전 입금(1/2~1/5)의 XP 누적분이 있어 문제 없음
- **percipic**: 이전 base가 낮아(140,000원) 이번 증분(700,000원)의 XP가 시즌패스에 미반영
  - 시즌 XP: 60 (예상: 140)

#### 해결 2: 시즌패스 XP 보정 (`fix_season_xp.py`)
- `SeasonPassService.add_bonus_xp()` 호출
- percipic: Lv.4 → **Lv.8**, XP: 60 → **200**
- 레벨업 보상 자동 지급: 주사위 티켓 6장 + 배민 기프티콘 5,000원

## 3. SoT 정리

### 레벨/XP SoT
| 테이블 | 용도 | 상태 |
|--------|------|------|
| `season_pass_progress` | **SoT** - 어드민 회원정보 표시 | 활성 |
| `user_level_progress` | 레거시 (deprecated) | auto_grant=False |

> **참고**: `level_xp_service.py`의 `LEVELS` 배열은 `auto_grant: False`로 비활성화됨.
> DB 기반 `SeasonPassService`가 유일한 보상 소스(SoT).

### 입금 → XP 정상 흐름
```
AdminExternalRankingService.upsert_many()
├─ season_pass.add_bonus_xp() → season_pass_progress 업데이트 ✅
└─ level_xp.add_xp() → user_level_progress 업데이트 ✅
```

## 4. 최종 상태 (8명 유저)

| 닉네임 | 입금액 | 시즌 레벨 | 상태 |
|--------|--------|----------|------|
| 커피사랑 | 13,552,526 | Lv.15 | ✅ |
| 봄꽃잎 | 2,200,000 | Lv.9 | ✅ |
| 아사카 | 2,200,000 | Lv.9 | ✅ |
| 민똘이 | 1,800,000 | Lv.8 | ✅ |
| 성민이 | 1,520,000 | Lv.8 | ✅ |
| 동추 | 1,400,000 | Lv.8 | ✅ |
| 기프트 | 1,400,000 | Lv.8 | ✅ |
| percipic | 840,000 | Lv.8 | ✅ 보정 완료 |

## 5. 생성된 스크립트

| 파일 | 용도 |
|------|------|
| `scripts/import_external_ranking_data.py` | 외부 입금 데이터 직접 SQL 임포트 (XP 훅 우회) |
| `scripts/grant_xp_for_deposits.py` | 레거시 XP 지급 (LevelXPService) |
| `scripts/fix_season_xp.py` | 시즌패스 XP 보정 (SeasonPassService) |
| `scripts/check_xp_status.py` | XP/레벨 현황 확인 |

## 6. 백업

- `/opt/xmas-event/backup_20260110.sql` (790KB)

## 7. 교훈

1. **외부 데이터 임포트 시 서비스 계층 사용 필수**
   - 직접 SQL 대신 `AdminExternalRankingService.upsert_many()` 사용
   - XP/레벨 자동 계산 훅이 정상 실행됨

2. **SoT 확인 필수**
   - 레벨/XP SoT는 `season_pass_progress`
   - `user_level_progress`는 deprecated

## 8. 변경 이력
- v1.0 (2026-01-10): 초안 작성
