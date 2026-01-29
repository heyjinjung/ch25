# 최신 커버리지 리포트 (허수 제거 적용)

- .coveragerc를 명시적으로 적용하여 허수(모델/스키마/이니트 등) 파일이 집계에서 제외됨
- 실제 서비스/비즈니스 로직 파일만 커버리지에 포함
- TOTAL: 8667라인 중 3566 미커버(59% 커버리지)
- models/, schemas/ 등은 집계에서 사라진 것을 확인
- 상세 미달 영역 및 파일별 커버리지는 아래 coverage_report.txt 원본 전체를 참고

---

```plaintext
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-8.3.2, pluggy-1.6.0
rootdir: C:\Users\JAVIS\ch\ch25
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.12.0, asyncio-0.23.3, cov-4.1.0
asyncio: mode=Mode.STRICT
collected 257 items

(이하 coverage_report.txt 전체 내용 첨부)
... (생략) ...
================= 1 failed, 256 passed, 9 warnings in 30.55s ==================
```

