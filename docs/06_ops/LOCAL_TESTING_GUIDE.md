# 🎄 로컬 통합 테스트 가이드

> 백엔드/프론트엔드 전체 동기화 테스트를 위한 가이드

## 📋 사전 준비

### 1. 데이터베이스 설정
```bash
# MySQL 실행 (Docker 사용 시)
docker-compose up -d mysql

# 또는 로컬 MySQL 사용
# DATABASE_URL이 .env에 올바르게 설정되어 있는지 확인
```

### 2. 환경변수 확인

**백엔드 (.env)**
```env
TEST_MODE=true        # ✅ 모든 게임 접근 가능 (스케줄 검증 우회)
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/xmas_event_dev
ENV=local
```

**프론트엔드 (.env.development)**
```env
VITE_ENABLE_DEMO_FALLBACK=true    # API 실패 시 mock 데이터 사용
VITE_GATE_TODAY_FEATURE=false     # 프론트엔드 게이팅 비활성화
```

---

## 🚀 시작하기

### Step 1: 테스트 데이터 시딩
```bash
# 가상환경 활성화
.\.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate    # Linux/Mac

# 테스트 데이터 생성
python scripts/seed_test_data.py
```

이 스크립트가 생성하는 데이터:
- ✅ feature_config (5개 게임 타입)
- ✅ feature_schedule (오늘 날짜)
- ✅ roulette_segment (6개 세그먼트)
- ✅ lottery_prize (5개 상품)
- ✅ 테스트 유저 + 시즌패스 진행도

### Step 2: 백엔드 시작
```bash
# 터미널 1
uvicorn app.main:app --reload --port 8000
```

확인:
- http://localhost:8000/docs → Swagger UI
- http://localhost:8000/api/today → 오늘의 이벤트 확인

### Step 3: 프론트엔드 시작
```bash
# 터미널 2
npm run dev
```

확인:
- http://localhost:5173 → 메인 페이지

---

## 🧪 테스트 시나리오

### 1. 홈페이지 확인
- [ ] 5개 게임 카드가 모두 활성화되어 있는지
- [ ] 클릭하여 각 페이지로 이동 가능한지

### 2. 룰렛 테스트
- [ ] 세그먼트가 표시되는지 (가중치, 잭팟 표시)
- [ ] "룰렛 돌리기" 버튼 클릭
- [ ] 회전 애니메이션 동작
- [ ] 결과 표시

### 3. 주사위 테스트
- [ ] "주사위 던지기" 버튼 클릭
- [ ] 굴리는 애니메이션 동작
- [ ] 유저/딜러 주사위 표시
- [ ] WIN/LOSE/DRAW 결과 표시

### 4. 복권 테스트
- [ ] 상품 목록 표시
- [ ] "복권 긁기" 버튼 클릭
- [ ] 스크래치 애니메이션 동작
- [ ] 당첨 결과 표시

### 5. 랭킹 테스트
- [ ] 리더보드 표시
- [ ] 내 순위 표시 (로그인 시)

### 6. 시즌패스 테스트
- [ ] 현재 레벨/XP 표시
- [ ] 레벨별 보상 목록
- [ ] 보상 수령 버튼 동작

---

## 🔧 문제 해결

### API 연결 실패
```
증상: "오늘 활성화된 이벤트가 없습니다" 또는 네트워크 에러
해결:
1. 백엔드가 8000 포트에서 실행 중인지 확인
2. .env의 TEST_MODE=true 확인
3. seed_test_data.py 실행 여부 확인
```

### 게임 접근 불가
```
증상: 특정 게임 페이지에서 에러
해결:
1. 백엔드 TEST_MODE=true 확인
2. 프론트엔드 VITE_GATE_TODAY_FEATURE=false 확인
3. npm run dev 재시작 (환경변수 반영)
```

### 데이터베이스 연결 실패
```
증상: 백엔드 시작 시 DB 연결 에러
해결:
1. MySQL/Docker 실행 상태 확인
2. DATABASE_URL 형식 확인
3. 데이터베이스 존재 여부 확인
```

---

## 📊 체크리스트

### 백엔드 동기화
- [ ] Alembic 마이그레이션 최신 상태
- [ ] 모든 API 엔드포인트 응답 확인 (/docs에서 테스트)
- [ ] TEST_MODE 동작 확인

### 프론트엔드 동기화
- [ ] 빌드 에러 없음 (`npm run build`)
- [ ] 모든 페이지 렌더링 확인
- [ ] API 연동 확인

### 데이터 일관성
- [ ] 룰렛 세그먼트 API ↔ UI 매칭
- [ ] 복권 상품 API ↔ UI 매칭
- [ ] 시즌패스 레벨 API ↔ UI 매칭

---

## 🛠 개발 모드 vs 프로덕션 모드

| 설정 | 개발 모드 | 프로덕션 모드 |
|------|----------|--------------|
| TEST_MODE | `true` | `false` |
| VITE_ENABLE_DEMO_FALLBACK | `true` | `false` |
| VITE_GATE_TODAY_FEATURE | `false` | `true` |
| 스케줄 검증 | 우회 | 적용 |
| 일일 제한 | 0=무제한 | 설정값 적용 |

---

## 📝 추가 참고

- 백엔드 API 문서: http://localhost:8000/docs
- 프론트엔드 개발 서버: http://localhost:5173
- 테스트 유저 ID: `test-user-001`
