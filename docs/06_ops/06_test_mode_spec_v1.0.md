# TEST_MODE 명세서

- 문서 타입: 운영
- 버전: v1.0
- 작성일: 2025-12-07
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드/프론트엔드 개발자, QA

## 1. 목적 (Purpose)
- 개발 및 QA 환경에서 feature_schedule 검증을 우회하여 모든 게임에 접근 가능하도록 하는 TEST_MODE의 공식 스펙을 정의한다.

## 2. 환경변수 설정

### 2-1. 백엔드
```env
# .env 또는 docker-compose.yml에 설정
TEST_MODE=true
```

### 2-2. 프론트엔드
```env
# .env 또는 빌드 시점 환경변수
VITE_GATE_TODAY_FEATURE=false
```

## 3. 동작 정의

### 3-1. 백엔드 동작 (TEST_MODE=true)

| 항목 | TEST_MODE=false (운영) | TEST_MODE=true (테스트) |
|------|----------------------|------------------------|
| today-feature 검증 | feature_schedule 기준 검사 | **우회 (항상 통과)** |
| 게임 API 접근 | 오늘 feature만 허용 | **모든 게임 허용** |
| 플레이 로그 저장 | 정상 저장 | 정상 저장 |
| 보상 지급 | 정상 지급 | 정상 지급 |
| 레벨 스탬프 | 조건 충족 시 적립 | 조건 충족 시 적립 |

### 3-2. 프론트엔드 동작 (VITE_GATE_TODAY_FEATURE=false)

| 항목 | GATE=true (운영) | GATE=false (테스트) |
|------|-----------------|-------------------|
| 게임 카드 표시 | 오늘 feature만 활성화 | **모든 카드 활성화** |
| 라우트 접근 | 오늘 feature 페이지만 | **모든 페이지 접근 가능** |
| 잠금 UI 표시 | 비활성 게임에 🔒 표시 | 잠금 없음 |

## 4. 적용 범위

### 4-1. 우회되는 검증
- `FeatureService.validate_feature_active()` - 오늘 활성화된 feature인지 검사
- 프론트엔드 라우트 가드
- 게임 카드 활성화 조건

### 4-2. 우회되지 않는 검증 (정상 동작)
- JWT 인증 - 로그인 필수
- 일일 플레이 제한 (max_daily_*) - 제한 적용
- 게임 설정 검증 (슬롯 수, 확률 등)
- 재고 검증 (stock 체크)
- 레벨 레벨/보상 로직

## 5. 코드 구현 참조

### 5-1. 백엔드 (app/services/feature_service.py)
```python
async def validate_feature_active(self, feature_type: str) -> None:
    """오늘 활성화된 feature인지 검증. TEST_MODE에서는 우회."""
    if settings.test_mode:
        return  # TEST_MODE: 검증 우회
    
    today_feature = await self.get_today_feature()
    if today_feature.feature_type != feature_type:
        raise NoFeatureTodayError(...)
```

### 5-2. 프론트엔드 (src/config/featureFlags.ts)
```typescript
// 환경변수에서 gate 활성화 여부 결정
export const isFeatureGateActive = 
  import.meta.env.VITE_GATE_TODAY_FEATURE !== "false";
```

## 6. 주의사항

### 6-1. 운영 환경 금지
- **절대로 운영 환경에서 TEST_MODE=true를 설정하지 않는다**
- 운영 환경에서는 환경변수가 설정되지 않거나 `false`여야 함

### 6-2. 테스트 데이터 격리
- TEST_MODE에서 생성된 플레이 로그, 보상, 스탬프는 실제 DB에 저장됨
- 테스트용 별도 계정 또는 테스트 DB 사용 권장
- QA 종료 후 테스트 데이터 정리 필요

### 6-3. 환경별 설정 예시

| 환경 | TEST_MODE (백엔드) | VITE_GATE_TODAY_FEATURE (프론트) |
|------|-------------------|--------------------------------|
| 로컬 개발 | true | false |
| QA/스테이징 | true | false |
| 운영 | false (또는 미설정) | true (또는 미설정) |

## 7. 트러블슈팅

### 7-1. 게임 접근이 안 될 때
1. 백엔드 로그에서 `NO_FEATURE_TODAY` 에러 확인
2. `.env` 파일에 `TEST_MODE=true` 설정 확인
3. Docker 환경인 경우 컨테이너 재시작

### 7-2. 프론트에서 카드가 잠겨 있을 때
1. 브라우저 개발자 도구에서 환경변수 확인
2. `VITE_GATE_TODAY_FEATURE=false` 설정 확인
3. 프론트엔드 재빌드 필요 (Vite 환경변수는 빌드 시점에 결정)

## 변경 이력
- v1.0 (2025-12-07, 시스템 설계팀)
  - TEST_MODE 공식 명세서 최초 작성
