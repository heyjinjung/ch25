# 🚨 에러 트리아지 체크리스트 (2026-01-30)

## 배포 전 대기 중인 수정사항

| # | 에러 | 영향범위 | 긴급도 | 상태 |
|---|------|----------|--------|------|
| 8 | INVALID_REWARD_TYPE (VAULT) | 어드민 | 🟡 중 | ✅ 코드완료 |
| 9 | FK 500 에러 (티켓/인벤토리 지급) | 유저 | 🔴 높음 | ✅ 코드완료 |
| ? | 주사위/복권 설정 로드 실패 | 어드민 | 🟡 중 | ❓ 미조사 |

---

## 배포 명령어

```bash
# 1. 커밋 & 푸시
git add -A
git commit -m "fix: Issue 8,9 - VAULT 보상 + FK v2_user 마이그레이션"
git push origin main

# 2. CI/CD 완료 후 마이그레이션 확인 (서버에서)
docker compose exec backend alembic current
# 예상: 20260130_1900_fk_v2_user

# 3. 문제 시 롤백
docker compose exec backend alembic downgrade 20260130_1800_add_v2_user_password_hash
```

---

## Sentry 에러 분류 기준

### ✅ 무시 (배포로 해결됨)
- `INVALID_REWARD_TYPE`
- `IntegrityError: foreign key constraint fails` (user_game_wallet, user_inventory)
- `User` 관련 join 에러

### 🔴 즉시 대응 (배포 후 새로 발생)
- 새로운 500 에러
- 마이그레이션 실패
- 인증 관련 에러

### 🟡 모니터링 (추후 조사)
- 주사위/복권 설정 로드 실패
- 기타 어드민 페이지 에러

---

## 빠른 진단 명령어

```bash
# 현재 마이그레이션 상태
docker compose exec backend alembic current

# 최근 로그 확인
docker compose logs backend --tail=50

# DB 연결 테스트
docker compose exec backend python -c "from app.db.session import SessionLocal; print('DB OK')"

# FK 제약조건 확인
docker compose exec backend python -c "
from sqlalchemy import text
from app.db.session import SessionLocal
db = SessionLocal()
r = db.execute(text('''
  SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA=DATABASE() 
  AND TABLE_NAME IN (\"user_game_wallet\",\"user_inventory_item\")
  AND REFERENCED_TABLE_NAME IS NOT NULL
''')).fetchall()
for x in r: print(x)
"
```

---

## 에러 발생 시 대응 플로우

```
새 에러 발생
    ↓
Sentry에서 확인
    ↓
┌─────────────────────────────────────┐
│ Q: 위 "무시" 목록에 있는 에러인가?   │
└─────────────────────────────────────┘
    ↓ Yes          ↓ No
 무시 (배포 대기)   즉시 조사
                      ↓
              트러블슈팅 문서에 기록
                      ↓
              수정 → 커밋 → 배포
```

---

## 변경 이력
- 2026-01-30: 최초 작성 (Issue 8, 9 대응)
