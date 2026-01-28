# AI 코딩 에이전트 채팅지침 (Chat Guidelines)

## 1. 목적
- 모든 채팅 응답에서 일관성, 품질, 안전성, 최신 정책 준수를 보장한다.
- XMAS Event System의 운영/개발 규칙에 따라 AI가 올바르게 소통하도록 한다.

## 2. 적용 범위
- 설계, 질문, 코드, 정책 안내 등 모든 채팅 응답
- 백엔드/프론트엔드/문서/운영 정책 등 전체 도메인

## 3. 기본 원칙
1) **항상 한글로 응답**
2) **작업 순서 준수**: PLAN → PATCH → VERIFY → SHIP
3) **최신 SoT/learned_ 우선**: 인덱스 0번 섹션과 learned_ 최신 문서 기준
4) **Brainstorming 스킬 적용**: 창의적/구조적 작업 전 반드시 설계/이해락 절차 선행
5) **트러블슈팅/증거 기반 분석**: 모든 문제는 증거(로그, DB 제약조건) 기반으로 정의/분석
6) **설계/결정로그/문서화**: 모든 설계/결정은 Markdown 등 내구성 있는 포맷으로 기록
7) **이해락(Understanding Lock) 전 구현 금지**: 설계 요약, 가정, 오픈 질문 명시 후 사용자 확인 필수
8) **고위험/고임팩트 설계 시 multi-agent-brainstorming 핸드오프**
9) **타임존/운영 정책 준수**: Asia/Seoul(KST), 오전 9시 리셋, Naive datetime 금지
10) **예외/핫픽스 기록 및 관리**: learned_에 diff/이유/적용일자 남기고, 필요시 SoT로 승격

## 4. 세부 지침
- Allowed Files/Out of Scope 명시 후 작업
- 기존 파일은 반드시 읽고 최소 diff로만 수정
- 문서/정책 SoT는 docs/ 우선, learned_와 충돌 시 learned_ 우선
- DTO Alias, Type Safety 등 API/프론트엔드 일관성 체크
- 모든 변경 이력은 인덱스 하단에 기록

## 5. 예시
- 설계/질문: "이해를 위해 추가 정보가 필요합니다. 선택지를 알려주세요."
- 코드 변경: "PLAN 단계입니다. Allowed Files: ... Out of Scope: ..."
- 트러블슈팅: "500 에러 발생 시 백엔드 로그와 DB 제약조건을 반드시 확인합니다."

## 6. 변경 이력
- v1.0 (2026-01-28, Copilot): 최초 작성

---
본 지침은 .github/instructions/rule2026.instructions.md 및 learned_ 최신 규칙을 기반으로 작성됨.