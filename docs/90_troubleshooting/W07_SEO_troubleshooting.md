문서 타입: 트러블슈팅
주차: W07 (02-10 ~ 02-16)
도메인: SEO
작성일: 2026-02-13
작성자: GitHub Copilot

# W07 SEO 트러블슈팅

---

## #1 SEO 일일 검색 미션 코드 미생성

### 증상
| 항목 | 내용 |
|---|---|
| **대상 기능** | SEO 검색 미션 (구글 검색 → cc-jm.com → 코드 확인 → 앱 내 입력) |
| **HTTP Status** | 200 (API 정상 응답, 단 `code: null` 반환) |
| **영향 범위** | 전체 유저 (모든 검색 유입 트래픽) |
| **재현 빈도** | 항상 (매일 코드가 생성되지 않음) |

### 근본 원인 (RCA)
**Celery Beat 스케줄에 SEO 코드 생성 task가 등록되지 않았음.**

흐름:
1. `app/v2/models/core/seo_daily_code.py` → 모델 준비됨 ✅
2. `app/v2/services/seo_code_service.py` → `generate_daily_code()` 정적 메서드 존재 ✅  
3. `scripts/rotate_seo_daily_code.py` → CLI 스크립트 존재 ✅ (단, import 버그: `app.v2.models.base` → `app.db.session`)
4. **Celery Beat 스케줄** → ❌ **미등록** (매일 09:00 KST 실행 설정 누락)
5. **프로덕션 crontab** → ❌ **미등록**

결과:
- DB에 코드가 수동생성분(SEOFIRST, 2/12) 1건만 존재
- `GET /api/v2/seo-mission/public/today-hint` → `{"code": null, "message": "오늘의 코드가 아직 생성되지 않았습니다."}`
- 구글 검색으로 접속한 유저에게 코드가 보이지 않음

### 수정 내역

#### 1. Celery Task 생성
- **파일**: `app/v2/tasks/seo_code_tasks.py` (신규)
- **내용**: `generate_seo_daily_code_task()` — `V2SeoCodeService.generate_daily_code()` 호출

#### 2. Celery Beat 스케줄 등록
- **파일**: `app/worker/celery_app.py`
- **변경**:
  - `include` 리스트에 `"app.v2.tasks.seo_code_tasks"` 추가
  - `beat_schedule`에 `seo-daily-code-morning` 추가 (매일 09:00 KST)

#### 3. 스크립트 import 버그 수정
- **파일**: `scripts/rotate_seo_daily_code.py`
- **변경**: `from app.v2.models.base import SessionLocal` → `from app.db.session import SessionLocal`

#### 4. 프로덕션 긴급 조치
- 수동으로 2/13 코드 생성: `SEONWJTK`
- API 응답 확인: `{"code":"SEONWJTK","message":null}`

### 배포 필요
- `docker compose build --no-cache; docker compose up -d` 실행 후 Celery Beat가 자동으로 매일 09:00에 코드 생성
- Celery Beat 컨테이너(`xmas-celery-beat`) 재시작 필요

### 검증
```bash
# 1. API 응답 확인
curl -s http://localhost:8000/api/v2/seo-mission/public/today-hint
# 예상: {"code":"SEOXXXXX","message":null}

# 2. DB 확인
docker exec xmas-db mysql -uroot -p2026 xmas_event -e "SELECT * FROM seo_daily_code ORDER BY id DESC LIMIT 5;"
```

---
