문서 타입: 검증 로그 스니펫
작성일: 2026-01-23
작성자: GitHub Copilot

이 파일에는 2026-01-23에 로컬 환경에서 실행한 핵심 검증 테스트들의 명령 및 캡처된 출력(요약)을 보관합니다. 전체 출력은 로컬에서 재실행하여 확인할 수 있습니다.

1) 아키텍처 SOT (v2-only import 검증)
- 명령:
  pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py -q
- 캡처 출력(요약):
  ......                                                                                                                                            [100%]
- 상태: 통과 (Exit Code: 0)

2) 게임 엔진 스모크
- 명령:
  pytest -q tests/v2_tests/phase3_game/test_game_engine_smoke.py -q
- 캡처 출력(요약):
  .                                                                                                                                                [100%]
- 경고: FastAPI on_event deprecation 경고 출력(비치명)
- 상태: 통과 (Exit Code: 0)
- 추가: `/api/v2/roulette/play`, `/api/v2/dice/play`, `/api/v2/lottery/play` 라우트가 V2 서비스로 연결된 후 재실행 확인(2026-01-23) — 통과 (Exit Code: 0)

3) 상점/인벤토리 로직
- 명령:
  pytest -q tests/v2_tests/phase2_core/test_shop_inventory_logic.py -q
- 캡처 출력(요약):
  ...                                                                                                                                              [100%]
- 상태: 통과 (Exit Code: 0)

4) Mission 서비스
- 명령:
  pytest -q tests/v2_tests/phase2_core/test_v2_mission_service.py -q
- 캡처 출력(요약):
  ...                                                                                                                                              [100%]
- 상태: 통과 (Exit Code: 0)

비고:
- 모든 테스트는 로컬 컨텍스트에서 실행되어 통과(Exit Code: 0)되었음.
- 경고/Deprecation은 별도로 정리하여 릴리스 노트/tech debt 목록에 반영 권장.

참고: 필요 시 전체 `pytest -q` 출력을 첨부(로그 파일)하여 증거를 더 강화할 수 있습니다. 로그 파일 첨부를 원하시면 알려주세요.