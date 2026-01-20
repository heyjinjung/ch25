# V2 Backend Runtime 트러블슈팅 리포트

**문서 번호**: TR-20260120-03  
**작성일**: 2026-01-20  
**작성자**: GitHub Copilot  
**상태**: 해결됨(Resolved) + 관찰 필요  
**관련**: `app/v2/api/admin_routes.py`, docker compose backend/nginx

---

## 1. 개요
V2 Admin API 연동 과정에서 백엔드가 재시작/런타임 에러를 발생시킨 이슈를 정리한다. 현재 백엔드는 정상 기동 상태이며, 일부 인프라(nginx)는 별도 조치 필요로 기록한다.

---

## 2. 이슈 상세 및 해결

### 2.1 NameError: Body 미정의
- **증상**: backend 컨테이너가 `NameError: name 'Body' is not defined`로 기동 실패
- **원인**: `admin_routes.py`에서 `Body` import 누락
- **해결**: `from fastapi import ... Body` 추가
- **상태**: 해결됨

### 2.2 UnboundLocalError: ticket_balance 미초기화
- **증상**: `/api/v2/admin/users/{id}` 요청 시 `ticket_balance` 참조 에러
- **원인**: `ticket_balance` 초기값 없이 누적 로직 수행
- **해결**: `ticket_balance = 0` 초기화 추가
- **상태**: 해결됨

### 2.3 RouletteSegmentDto reward_type ValidationError
- **증상**: `/api/v2/admin/game/roulette/configs` 요청 시 `reward_type=TICKET_DICE`로 Pydantic ValidationError
- **원인**: 스키마 허용값(`POINT|CREDIT|TICKET|NONE`)과 DB 값 불일치
- **해결**: `reward_type` 정규화 로직 추가 (`TICKET_*` → `TICKET`, 기타 → `NONE`)
- **상태**: 해결됨

---

## 3. 관찰 필요 (Known Issues)

### 3.1 nginx 인증서 파일 누락
- **증상**: `fullchain.pem` 미존재로 nginx 재시작 반복
- **영향**: 외부 HTTPS 리스닝 불가, 내부 백엔드와는 별개
- **상태**: 미해결 (인프라 조치 필요)

---

## 4. 재발 방지 체크리스트
- [ ] FastAPI 라우터 추가 시 `Body`/`Query`/`Path` import 확인
- [ ] DTO 변환 전 기본값 초기화 확인
- [ ] Enum/Literal 스키마와 DB 값 불일치 시 정규화/마이그레이션 계획 수립
- [ ] nginx 인증서 경로 존재 여부 점검
