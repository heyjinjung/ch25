# V2 어드민 회원 입금 후 레벨 동기화 버그 수정 (V2 Native)

**작성일**: 2026-01-27
**상태**: ✅ 해결됨
**영향 범위**: 어드민 입금 처리, 회원 레벨 조회

---

## 1. 문제 요약

어드민에서 회원 입금 처리 후, 회원조회 시 **레벨이 즉시 변경되지 않는** 문제 발생.

### 증상
- 입금 내역은 정상 반영
- 하지만 **V2 어드민 수동 입금 동기화** 시 XP 적립 로직 호출 누락
- 일일 XP 획득 한도가 기존 1000 XP로 너무 높아 하향 조정 필요 (V2 정책 반영)
- 결과적으로 V2 회원조회 시 레벨이 즉시 갱신되지 않음

---

## 2. 근본 원인 분석

### 2.1 데이터 흐름 (문제 전)

```
입금 처리 (admin_cc_deposit_service.py)
  ↓
level_xp.add_xp() 호출
  ↓
UserLevelProgress.level 업데이트 ✓
  ↓
[문제1] User.level 업데이트 안 함 ✗
  ↓
[문제2] db.commit() 없음 ✗
  ↓
return results
```

### 2.2 회원조회 API (user_routes.py:494)

```python
level=int(user.level or 1)  # User.level 사용!
```

**문제**: 회원조회 API는 `User.level`을 사용하지만, XP 적립 시 `UserLevelProgress.level`만 업데이트됨.

---

## 3. 문제점 상세

### 문제 1: User.level 미동기화

**위치**: `app/services/level_xp_service.py:222`

```python
# Before (버그)
progress.level = current_level
return {"added_xp": delta, ...}
# User.level은 업데이트하지 않음!
```

### 문제 2: db.commit() 누락

**위치**: `app/v2/services/admin_cc_deposit_service.py:346`

```python
# Before (버그)
row.deposit_remainder = remainder
# XP 적립 후 commit 없음!
return results
```

---

## 4. 해결 방안

### 4.1 level_xp_service.py 수정

```python
# After (수정)
progress.level = current_level

# User.level 동기화 (어드민 회원조회 API에서 User.level 사용)
user = db.get(User, user_id)
if user and user.level != current_level:
    user.level = current_level
    db.add(user)

return {"added_xp": delta, ...}
```

### 4.2 admin_cc_deposit_service.py 수정

```python
# After (수정)
row.deposit_remainder = remainder

# XP 적립 후 DB 커밋 (User.level 동기화 포함)
db.commit()
```

---

## 5. 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/v2/services/level_xp_service.py` | `V2LevelXPService`를 통한 `User.level` 동기화 보강 |
| `app/v2/services/admin_cc_deposit_service.py` | XP 적립 루프 후 `db.commit()` 추가 (V2 Native 트랜잭션) |
| `app/v2/api/admin/economy_routes.py` | V2 수동 트리거 로직 최신화 |
| `app/core/config.py` | V2 일일 최대 XP 스텝 제한(5 스텝) 반영 |

---

## 6. 수정 후 데이터 흐름

```
입금 처리 (admin_cc_deposit_service.py)
  ↓
level_xp.add_xp() 호출
  ↓
UserLevelProgress.level 업데이트 ✓
  ↓
User.level 동기화 ✓ (신규)
  ↓
db.commit() ✓ (신규)
  ↓
return results
```

---

## 7. 추가 참고: 쿨다운/스텝 제한

입금 후 XP가 적립되지 않는 또 다른 원인:

| 설정 | 기본값 | 현재값 (2026-01-27) | 설명 |
|------|--------|---------------------|------|
| `cooldown_minutes` | 0 | 0 | 동일 유저 연속 입금 시 쿨다운 |
| `max_steps_per_day`| 50 | **5** (100 XP) | 1일 최대 XP 스텝 제한 |
| `step_amount` | 100,000 | 100,000 | 1스텝 당 입금액 (원) |
| `xp_per_step` | 20 | 20 | 1스텝 당 XP |

**확인 방법**:
- `admin_cc_deposit_service.py:330-333`: 쿨다운 체크 로직
- `admin_cc_deposit_service.py:327-328`: 일일 최대 스텝 체크

---

## 8. 테스트 방법

1. 어드민에서 회원 입금 처리
2. DB에서 `UserLevelProgress.xp`, `UserLevelProgress.level` 확인
3. DB에서 `User.level` 확인 (동기화 여부)
4. 회원조회 API 응답의 `level` 필드 확인

---

## 9. 관련 문서 (V2 Native Stack)

- V2 레벨 시스템: `app/v2/services/level_xp_service.py`
- V2 어드민 입금 서비스: `app/v2/services/admin_cc_deposit_service.py`
- V2 어드민 회원 API: `app/v2/api/admin/user_routes.py`

---

**문서 끝**
