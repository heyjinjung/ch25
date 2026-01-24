# 엑셀 Raw 데이터 분석 및 업데이트 가이드

관리자 페이지의 충전 로그(Raw Data)를 기반으로 리텐션 CSV 파일을 매일 업데이트하는 루틴입니다.

## 1. 사전 준비 (Daily Routine)

1. **데이터 준비**
   - 어드민 관리자 페이지에서 `충전 내역` 텍스트를 드래그하여 복사(Copy)합니다.
   - 탭(Tab)으로 구분된 원본 텍스트 형태여야 합니다.

2. **입력 파일 수정**
   - 아래 경로의 파일을 엽니다.
     - `c:\Users\JAVIS\ch\ch25\scripts\ops\input_raw.txt`
   - 기존 내용을 모두 지우고, 복사한 데이터를 **붙여넣기(Overwrite)** 한 뒤 저장합니다.

## 2. 스크립트 실행

VS Code 터미널(PowerShell)에서 아래 명령어를 실행합니다.

```powershell
python scripts/ops/update_retention_csv.py
```

## 3. 결과 확인

1. **터미널 출력 확인**
   - `Existing Users Updated`: 기존 유저 중 충전일이 갱신된 수
   - `New Users Added`: CSV에 없던 신규 유저 추가 수
   - `Skipped`: 변경 사항이 없는 건수

2. **CSV 파일 자동 갱신**
   - 대상 파일: `docs/06_ops/202601/exports/도파민/CC0106_RAW.CSV` (또는 설정된 CSV)
   - 스크립트가 실행되면 위 파일에 '총이용일수', '최근충전일', '리텐션그룹' 등이 자동으로 업데이트됩니다.

## 4. 참고 사항

- **날짜 설정**: 
  - 기본적으로 **2026년 1월 18일**로 고정되어 있습니다 (변수: `CURRENT_DATE_OVERRIDE`).
  - 실제 현재 시간을 기준으로 하려면 스크립트 상단의 설정을 `CURRENT_DATE_OVERRIDE = None`으로 변경하세요.
  
- **데이터 필터링**:
  - 입력 데이터 중 상태가 **'충전완료'**가 아닌 행은 자동으로 무시됩니다.
