# .coveragerc 적용 후 커버리지 집계 결과

- 모델/스키마/이니트 파일 등 의미 없는 파일은 커버리지 집계에서 제외됨
- 서비스/비즈니스 로직 위주로 커버리지 집계
- 전체 테스트 275개 모두 통과
- coverage_report.txt, coverage_summary.txt를 참고하여 
	실제 커버리지 품질을 확인하라고

## 적용 방법
- .coveragerc 파일을 루트에 두면 pytest/coverage가 자동 인식
- 필요시 [run] source, [report] omit 항목을 추가로 조정 가능

## 참고
- 기존 100%로 잡히던 models/schemas 등은 이제 집계에서 제외되어, 실제 테스트가 커버하는 비즈니스 로직의 커버리지 품질이 명확히 드러남
- 커버리지 향상은 서비스/로직 단위 테스트 추가로 진행할 것
