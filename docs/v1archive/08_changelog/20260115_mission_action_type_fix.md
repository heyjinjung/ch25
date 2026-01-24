# Development Log (2026-01-15) - Mission System

## Mission Action Type Mismatch Fix (PLAY vs PLAY_GAME)

### 문제
- **Issue**: "플레이 게임 횟수" 미션을 설정했으나 유저 플레이 시 카운트가 올라가지 않음
- **Impact**: 플레이 횟수 기반 미션 달성 불가 및 유저 보상 획득 차단
- **Root Cause**: 
  - 프론트엔드(어드민): 미션 생성 시 `action_type`을 `"PLAY"`로 전송
  - 백엔드(서비스): 게임 플레이 트리거 시 `"PLAY_GAME"` 키를 사용 (미스매치 발생)

### 수정 내용

#### Frontend: [src/admin/pages/AdminMissionPage.tsx](src/admin/pages/AdminMissionPage.tsx)
- **Action Type 목록 수정**: 
  - `"PLAY"`를 `"PLAY_GAME"`으로 변경하여 백엔드 트리거와 일치시킴
  - 기타 백엔드에서 지원하는 액션 타입(`LOGIN`, `JOIN_CHANNEL`, `INVITE_FRIEND` 등)을 선택 목록에 추가하여 설정 편의성 개선

#### Backend: [app/services/mission_service.py](app/services/mission_service.py)
- **Compatibility Support**: 
  - `update_progress` 로직에서 `"PLAY_GAME"` 트리거 수신 시, `action_type`이 `"PLAY"`인 미스매치 데이터도 함께 업데이트되도록 쿼리 확장
  - 스트릭(Streak) 연동 조건에도 `"PLAY"` 타입을 추가하여 기존/신규 미션 모두 스트릭 동기화가 작동하도록 보완

### 기대 효과
- **데이터 정합성**: 설정값과 실제 트리거 키의 불일치 해결
- **하위 호환성**: 기존에 `"PLAY"`로 생성된 미션들을 수정하지 않아도 즉시 정상 카운트됨
- **운영 편의성**: 어드민에서 주요 액션(로그인, 초대 등)을 더 직관적으로 설정 가능

### 검증
- ✅ 어드민 페이지에서 `PLAY_GAME` 타입 미션 생성 확인
- ✅ 백엔드 `update_progress` 호출 시 `PLAY` 및 `PLAY_GAME` 타입 미션 동시 업데이트 확인
- ✅ 스트릭 동기화(`sync_play_streak`) 누락 방지 확인
