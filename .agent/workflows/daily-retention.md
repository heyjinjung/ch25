---
description: 일일 리텐션 운영분석 리포트 생성
---
# 일일 리텐션 분석 워크플로우

매일 아침 운영서버 데이터를 동기화하고 리텐션 분석 리포트를 생성합니다.

## 전제조건
- Docker Desktop 실행 중
- xmas-db 컨테이너 가동 중

## 실행 단계

// turbo-all

### 1. 서버 데이터 동기화 (선택)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync_db_production.ps1
```

### 2. 분석 스크립트 실행
```powershell
python scripts/daily_retention_report.py
```

### 3. 동기화 + 분석 한번에 실행
```powershell
python scripts/daily_retention_report.py --sync
```

## 분석 결과 포함 항목
1. **외부 랭킹 입금**: 입금 유저, 총액, 플레이 횟수
2. **금고 적립 현황**: 일별 금고 적립액 및 유저 수
3. **게임 플레이 현황**: 주사위/룰렛/복권 일별 플레이
4. **티켓 보유 현황**: 각 토큰별 총 보유량
5. **금고/인벤토리 현황**: 총 금고 보유액, 기프티콘 등
6. **게임→입금 전환**: 게임 플레이어 중 외부 입금 비율

## 상세 리포트 생성 (마크다운)
더 상세한 마크다운 리포트가 필요한 경우:

```
@antigravity 오늘자 리텐션 운영일지를 작성해줘. 
서버 데이터를 동기화 후 1/1부터 어제까지의 평균과 
어제, 오늘 데이터를 비교 분석해줘.
```
