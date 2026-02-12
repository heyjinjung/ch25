문서 타입: 기술 구현 가이드
버전: v1.0
작성일: 2026-02-12
작성자: Claude Opus 4.6
대상: AI 어시스턴트 / 프론트엔드·백엔드 개발자
상태: 구현 대기

---

# SEO 일일 검색 미션 — 기술 구현 가이드 (완전판)

## 0. 목적

사용자가 구글에서 "씨씨카지노"/"씨씨지민" 등을 검색 → 공개 랜딩 페이지 방문 → 히든 코드 확인 → 앱 내 전용 페이지에서 코드 입력 → 포인트 즉시 수령.
이를 통해 실제 구글 검색 트래픽을 발생시켜 SEO 지표(CTR, 체류시간, 인덱싱)를 개선한다.

---

## 1. 전체 아키텍처 (데이터 흐름)

```
[구글 검색] → [PublicLandingPage(/)] → referrer 체크 → 히든 코드 노출
                                                          ↓
[앱 내 HomePage(/home)] → "검색 미션" 카드 클릭 → [SeoMissionPage(/v2/event/seo-mission)]
                                                          ↓
                                                   코드 입력 폼 제출
                                                          ↓
                                        POST /api/v2/seo-mission/claim
                                                          ↓
                                              V2SeoCodeService 검증
                                              (코드 유효? 오늘 이미 사용?)
                                                          ↓
                                              V2RewardService.deliver()
                                              (3,000~5,000P 랜덤 지급)
```

---

## 2. 구현 파일 목록 (총 10개)

### 신규 생성 파일

| # | 파일 경로 | 용도 |
|---|-----------|------|
| 1 | `app/v2/models/core/seo_daily_code.py` | DB 모델: SeoDailyCode + UserSeoDailyCodeClaim |
| 2 | `app/v2/services/seo_code_service.py` | 서비스: 코드 생성·검증·일일 제한 로직 |
| 3 | `app/v2/api/seo_mission_routes.py` | API 라우트: claim + today-status 엔드포인트 |
| 4 | `alembic/versions/20260213_seo_daily_code.py` | DB 마이그레이션 |
| 5 | `src/v2/api/seoMissionApi.ts` | 프론트엔드 API 모듈 |
| 6 | `src/v2/hooks/useSeoMission.ts` | React Query 훅 |
| 7 | `src/v2/pages/event/SeoMissionPage.tsx` | 전용 안내 페이지 (코드 입력 폼 포함) |
| 8 | `scripts/rotate_seo_daily_code.py` | Cron 스크립트: 매일 09:00 KST 코드 교체 |

### 기존 수정 파일

| # | 파일 경로 | 변경 내용 |
|---|-----------|-----------|
| 9 | `src/v2/pages/home/HomePage.tsx` | "레벨미션" 카드 → "검색 미션" 카드로 교체 |
| 10 | `src/v2/pages/public/PublicLandingPage.tsx` | 하단에 referrer 기반 히든 코드 섹션 추가 |
| 11 | `src/v2/router/V2UserRoutes.tsx` | `/v2/event/seo-mission` 라우트 추가 |
| 12 | `app/main.py` | seo_mission_router include 추가 |
| 13 | `src/v2/api/index.ts` | seoMissionApi export 추가 |

---

## 3. 단계별 구현 상세

---

### 3.1 [백엔드] DB 모델 생성

**파일**: `app/v2/models/core/seo_daily_code.py`

```python
"""SEO 일일 검색 미션 코드 모델."""
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class SeoDailyCode(Base):
    """매일 자동 생성되는 SEO 미션 코드.

    하루에 1개의 활성 코드만 존재한다.
    Cron 스크립트가 매일 09:00 KST에 새 코드를 생성하고,
    이전 코드의 is_active를 False로 변경한다.
    """
    __tablename__ = "seo_daily_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    target_date = Column(Date, nullable=False, index=True, comment="이 코드가 유효한 날짜 (KST)")
    reward_min = Column(Integer, nullable=False, default=3000, comment="최소 보상 포인트")
    reward_max = Column(Integer, nullable=False, default=5000, comment="최대 보상 포인트")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Seoul")))

    claims = relationship("UserSeoDailyCodeClaim", back_populates="seo_code")


class UserSeoDailyCodeClaim(Base):
    """유저의 SEO 코드 입력 기록.

    UniqueConstraint로 (user_id, seo_code_id) 중복 방지.
    → 계정당 같은 코드 1회만 입력 가능.
    target_date 기준으로 하루 1회 제한은 서비스 레이어에서 추가 검증.
    """
    __tablename__ = "user_seo_daily_code_claim"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("v2_user.id"), nullable=False, index=True)
    seo_code_id = Column(Integer, ForeignKey("seo_daily_code.id"), nullable=False)
    reward_amount = Column(Integer, nullable=False, comment="실제 지급된 포인트 (랜덤)")
    claimed_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Seoul")))

    seo_code = relationship("SeoDailyCode", back_populates="claims")

    __table_args__ = (
        UniqueConstraint("user_id", "seo_code_id", name="uq_user_seo_code"),
        Index("ix_user_seo_claim_date", "user_id", "claimed_at"),
    )
```

**models/__init__.py에 추가할 import**:
```python
from app.v2.models.core.seo_daily_code import SeoDailyCode, UserSeoDailyCodeClaim
```

> **확인 포인트**: `app/v2/models/__init__.py` 파일을 열어 기존 import 패턴을 확인하고, 같은 패턴으로 추가한다. 기존 패턴 예시: `from app.v2.models.core.event_secret_code import EventSecretCode, UserSecretCodeClaim`

---

### 3.2 [백엔드] 서비스 레이어

**파일**: `app/v2/services/seo_code_service.py`

```python
"""SEO 일일 검색 미션 코드 서비스."""
import logging
import random
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.v2.models.core.seo_daily_code import SeoDailyCode, UserSeoDailyCodeClaim
from app.v2.services.reward_service import V2RewardService

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")


class V2SeoCodeService:
    """SEO 일일 검색 미션 코드 관리 서비스."""

    def __init__(self, db: Session):
        self.db = db
        self.reward_service = V2RewardService()

    # ── 오늘의 코드 조회 ──────────────────────────────────

    def get_today_code(self) -> SeoDailyCode | None:
        """오늘 날짜(KST)의 활성 코드를 반환한다."""
        today_kst = datetime.now(KST).date()
        return (
            self.db.query(SeoDailyCode)
            .filter(
                SeoDailyCode.target_date == today_kst,
                SeoDailyCode.is_active == True,
            )
            .first()
        )

    # ── 코드 검증 및 보상 지급 ────────────────────────────

    def claim_code(self, user_id: int, code_input: str) -> dict:
        """코드 입력 → 검증 → 보상 지급.

        Returns:
            {"success": True, "reward_amount": int, "message": str}

        Raises:
            ValueError: 코드 오류 시 (error_code 속성 포함)
        """
        code_upper = code_input.strip().upper()
        today_kst = datetime.now(KST).date()

        # 1) 코드 조회
        seo_code = (
            self.db.query(SeoDailyCode)
            .filter(
                SeoDailyCode.code == code_upper,
                SeoDailyCode.is_active == True,
            )
            .first()
        )
        if not seo_code:
            raise ValueError("INVALID_CODE")

        # 2) 날짜 확인 (오늘 코드인지)
        if seo_code.target_date != today_kst:
            raise ValueError("CODE_EXPIRED")

        # 3) 중복 입력 확인
        existing = (
            self.db.query(UserSeoDailyCodeClaim)
            .filter(
                UserSeoDailyCodeClaim.user_id == user_id,
                UserSeoDailyCodeClaim.seo_code_id == seo_code.id,
            )
            .first()
        )
        if existing:
            raise ValueError("ALREADY_CLAIMED")

        # 4) 오늘 이미 다른 SEO 코드를 사용했는지 (하루 1회 제한)
        today_start = datetime.combine(today_kst, datetime.min.time()).replace(tzinfo=KST)
        today_any_claim = (
            self.db.query(UserSeoDailyCodeClaim)
            .filter(
                UserSeoDailyCodeClaim.user_id == user_id,
                UserSeoDailyCodeClaim.claimed_at >= today_start,
            )
            .first()
        )
        if today_any_claim:
            raise ValueError("DAILY_LIMIT_REACHED")

        # 5) 랜덤 보상 결정
        reward_amount = random.randint(seo_code.reward_min, seo_code.reward_max)

        # 6) 포인트 지급
        self.reward_service.deliver(
            self.db,
            user_id=user_id,
            reward_type="POINT",
            reward_amount=reward_amount,
            meta={"reason": "SEO_DAILY_MISSION", "source": "SEO_SEARCH_CODE"},
        )

        # 7) 클레임 기록
        claim = UserSeoDailyCodeClaim(
            user_id=user_id,
            seo_code_id=seo_code.id,
            reward_amount=reward_amount,
            claimed_at=datetime.now(KST),
        )
        self.db.add(claim)
        self.db.commit()

        logger.info(
            "seo_code claimed: user_id=%s code=%s reward=%sP",
            user_id, code_upper, reward_amount,
        )

        return {
            "success": True,
            "reward_amount": reward_amount,
            "message": f"{reward_amount:,}P 지급 완료!",
        }

    # ── 오늘 클레임 여부 확인 ─────────────────────────────

    def get_today_status(self, user_id: int) -> dict:
        """오늘의 미션 상태를 반환한다.

        Returns:
            {"has_claimed_today": bool, "reward_amount": int|None, "code_hint": str|None}
        """
        today_kst = datetime.now(KST).date()
        today_start = datetime.combine(today_kst, datetime.min.time()).replace(tzinfo=KST)

        claim = (
            self.db.query(UserSeoDailyCodeClaim)
            .filter(
                UserSeoDailyCodeClaim.user_id == user_id,
                UserSeoDailyCodeClaim.claimed_at >= today_start,
            )
            .first()
        )

        return {
            "has_claimed_today": claim is not None,
            "reward_amount": claim.reward_amount if claim else None,
        }

    # ── 코드 생성 (Cron에서 호출) ─────────────────────────

    @staticmethod
    def generate_daily_code(db: Session, target_date: date) -> SeoDailyCode:
        """지정 날짜의 새 코드를 생성한다. 기존 코드는 비활성화."""
        # 기존 활성 코드 비활성화
        db.query(SeoDailyCode).filter(
            SeoDailyCode.is_active == True,
        ).update({"is_active": False})

        # 새 코드 생성 (영문 대문자 + 숫자, 총 8자리 — 사용자 입력 시 대소문자 무관)
        import string
        chars = string.ascii_uppercase + string.digits
        code = "SEO" + "".join(random.choices(chars, k=5))

        # 중복 방지 (극히 드문 경우)
        while db.query(SeoDailyCode).filter(SeoDailyCode.code == code).first():
            code = "SEO" + "".join(random.choices(chars, k=5))

        new_code = SeoDailyCode(
            code=code,
            target_date=target_date,
            reward_min=3000,
            reward_max=5000,
            is_active=True,
        )
        db.add(new_code)
        db.commit()
        db.refresh(new_code)

        logger.info("seo_daily_code generated: date=%s code=%s", target_date, code)
        return new_code
```

---

### 3.3 [백엔드] API 라우트

**파일**: `app/v2/api/seo_mission_routes.py`

```python
"""SEO 일일 검색 미션 API 라우트.

Endpoints:
  POST /api/v2/seo-mission/claim    — 코드 입력 및 보상 수령
  GET  /api/v2/seo-mission/status   — 오늘 미션 상태 조회
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_user_id, get_db
from app.v2.services.seo_code_service import V2SeoCodeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/seo-mission", tags=["seo-mission"])


# ── Schemas ──────────────────────────────────────────────

class SeoCodeClaimRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20, description="검색 미션 코드")


class SeoCodeClaimResponse(BaseModel):
    success: bool
    reward_amount: int | None = None
    message: str | None = None


class SeoMissionStatusResponse(BaseModel):
    has_claimed_today: bool
    reward_amount: int | None = None


# ── Endpoints ────────────────────────────────────────────

@router.post("/claim", response_model=SeoCodeClaimResponse)
def claim_seo_code(
    payload: SeoCodeClaimRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SeoCodeClaimResponse:
    """SEO 검색 미션 코드를 입력하여 포인트를 수령한다."""
    service = V2SeoCodeService(db)

    try:
        result = service.claim_code(user_id, payload.code)
        return SeoCodeClaimResponse(**result)
    except ValueError as e:
        error_code = str(e)
        status_map = {
            "INVALID_CODE": 404,
            "CODE_EXPIRED": 400,
            "ALREADY_CLAIMED": 400,
            "DAILY_LIMIT_REACHED": 400,
        }
        raise HTTPException(
            status_code=status_map.get(error_code, 400),
            detail=error_code,
        )


@router.get("/status", response_model=SeoMissionStatusResponse)
def get_seo_mission_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SeoMissionStatusResponse:
    """오늘의 SEO 미션 상태를 조회한다."""
    service = V2SeoCodeService(db)
    result = service.get_today_status(user_id)
    return SeoMissionStatusResponse(**result)
```

**app/main.py에 추가할 코드**:

> `app/main.py`를 열어 기존 `include_router` 패턴을 찾는다. 예시: `app.include_router(event_seol_router)`

```python
from app.v2.api.seo_mission_routes import router as seo_mission_router
app.include_router(seo_mission_router)
```

---

### 3.4 [백엔드] DB 마이그레이션

**파일**: `alembic/versions/20260213_seo_daily_code.py`

```python
"""SEO 일일 검색 미션 코드 테이블 생성.

Revision ID: seo_daily_code_001
Revises: (기존 최신 revision ID — alembic/versions/ 에서 가장 최근 파일의 revision 확인)
Create Date: 2026-02-13
"""
from alembic import op
import sqlalchemy as sa


# ── 주의 ──
# revision, down_revision 값은 반드시 alembic/versions/ 폴더에서
# 가장 최근 마이그레이션 파일의 Revision ID를 확인한 후 설정할 것.
#
# 확인 방법:
#   ls alembic/versions/  → 가장 최근 파일 열기 → revision = '...' 확인
#   아래 down_revision에 그 값을 넣는다.

revision = "seo_daily_code_001"
down_revision = None  # ← 반드시 실제 값으로 교체할 것!
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) seo_daily_code 테이블
    op.create_table(
        "seo_daily_code",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("target_date", sa.Date(), nullable=False, index=True),
        sa.Column("reward_min", sa.Integer(), nullable=False, server_default="3000"),
        sa.Column("reward_max", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # 2) user_seo_daily_code_claim 테이블
    op.create_table(
        "user_seo_daily_code_claim",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("v2_user.id"), nullable=False, index=True),
        sa.Column("seo_code_id", sa.Integer(), sa.ForeignKey("seo_daily_code.id"), nullable=False),
        sa.Column("reward_amount", sa.Integer(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("user_id", "seo_code_id", name="uq_user_seo_code"),
        sa.Index("ix_user_seo_claim_date", "user_id", "claimed_at"),
    )

    # 3) 초기 시드 데이터 (첫날 코드 — 실제 운영 시 Cron이 생성)
    op.execute("""
        INSERT INTO seo_daily_code (code, target_date, reward_min, reward_max, is_active, created_at)
        VALUES ('SEOFIRST', CURDATE(), 3000, 5000, 1, NOW())
    """)


def downgrade() -> None:
    op.drop_table("user_seo_daily_code_claim")
    op.drop_table("seo_daily_code")
```

> **중요**: `down_revision` 값은 반드시 기존 최신 마이그레이션의 revision ID로 교체해야 한다. `alembic/versions/` 디렉토리에서 가장 최근 파일을 확인한다.

---

### 3.5 [백엔드] Cron 스크립트 — 매일 코드 교체

**파일**: `scripts/rotate_seo_daily_code.py`

```python
#!/usr/bin/env python3
"""SEO 일일 코드 교체 스크립트.

Cron 등록 (매일 09:00 KST):
    0 9 * * * /usr/bin/python3 /path/to/scripts/rotate_seo_daily_code.py

동작:
    1. 기존 활성 코드 비활성화
    2. 오늘 날짜(KST)의 새 코드 생성 (SEO + 랜덤 5자리)
    3. DB 커밋
"""
import sys
import os

# 프로젝트 루트를 sys.path에 추가 (Cron에서 직접 실행 시 필요)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from zoneinfo import ZoneInfo

from app.v2.models.base import SessionLocal  # DB 세션 팩토리
from app.v2.services.seo_code_service import V2SeoCodeService

KST = ZoneInfo("Asia/Seoul")


def main():
    today_kst = datetime.now(KST).date()
    db = SessionLocal()

    try:
        new_code = V2SeoCodeService.generate_daily_code(db, today_kst)
        print(f"[OK] {today_kst} SEO 코드 생성 완료: {new_code.code}")
    except Exception as e:
        print(f"[ERROR] SEO 코드 생성 실패: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

> **주의**: `SessionLocal` import 경로는 프로젝트마다 다르다. `app/v2/models/base.py` 또는 `app/database.py` 등에서 SQLAlchemy `sessionmaker`를 찾아 맞는 경로로 수정한다.
>
> 확인 방법: `grep -r "SessionLocal" app/` 실행

---

### 3.6 [프론트엔드] API 모듈

**파일**: `src/v2/api/seoMissionApi.ts`

```typescript
// src/v2/api/seoMissionApi.ts
import { v2Client } from "./client";

// ============================================================================
// SEO Daily Search Mission API
// ============================================================================

export interface SeoCodeClaimResponse {
  readonly success: boolean;
  readonly reward_amount: number | null;
  readonly message: string | null;
}

export interface SeoMissionStatusResponse {
  readonly has_claimed_today: boolean;
  readonly reward_amount: number | null;
}

/**
 * SEO 미션 코드 입력 → 보상 수령.
 */
export const claimSeoCode = async (
  code: string,
): Promise<SeoCodeClaimResponse> => {
  try {
    const response = await v2Client.post<SeoCodeClaimResponse>(
      "/api/v2/seo-mission/claim",
      { code: code.trim().toUpperCase() },
    );
    return response.data;
  } catch (error) {
    console.error("[seoMissionApi] Failed to claim SEO code", error);
    throw error;
  }
};

/**
 * 오늘의 SEO 미션 상태 조회 (이미 완료했는지).
 */
export const getSeoMissionStatus =
  async (): Promise<SeoMissionStatusResponse> => {
    try {
      const response = await v2Client.get<SeoMissionStatusResponse>(
        "/api/v2/seo-mission/status",
      );
      return response.data;
    } catch (error) {
      console.error("[seoMissionApi] Failed to fetch SEO mission status", error);
      throw error;
    }
  };
```

**`src/v2/api/index.ts`에 추가**:
```typescript
export * from "./seoMissionApi";
```

---

### 3.7 [프론트엔드] React Query 훅

**파일**: `src/v2/hooks/useSeoMission.ts`

```typescript
// src/v2/hooks/useSeoMission.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimSeoCode, getSeoMissionStatus } from "../api/seoMissionApi";

const SEO_QUERY_KEY = ["v2", "seo-mission"] as const;

/**
 * 오늘의 SEO 미션 상태 조회.
 */
export function useSeoMissionStatus() {
  return useQuery({
    queryKey: [...SEO_QUERY_KEY, "status"],
    queryFn: getSeoMissionStatus,
    staleTime: 30000, // 30초
  });
}

/**
 * SEO 코드 입력 뮤테이션.
 * 성공 시 SEO 상태 + 볼트 + 유저 캐시 무효화.
 */
export function useClaimSeoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => claimSeoCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}
```

---

### 3.8 [프론트엔드] SeoMissionPage 전용 안내 페이지

**파일**: `src/v2/pages/event/SeoMissionPage.tsx`

```tsx
// src/v2/pages/event/SeoMissionPage.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Gift, ArrowLeft, Loader2, CheckCircle2, ExternalLink,
} from "lucide-react";
import { useSeoMissionStatus, useClaimSeoCode } from "../../hooks/useSeoMission";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { useToast } from "../../components/common/ToastProvider";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "유효하지 않은 코드입니다",
  CODE_EXPIRED: "코드가 만료되었습니다 (오전 9시에 갱신)",
  ALREADY_CLAIMED: "이미 사용한 코드입니다",
  DAILY_LIMIT_REACHED: "오늘은 이미 미션을 완료하셨습니다",
};

const STEPS = [
  {
    num: 1,
    title: "구글 검색",
    desc: '"씨씨카지노" 또는 "씨씨지민"을 구글에서 검색하세요.',
    tip: "Wi-Fi 대신 LTE/5G 사용 시 검색 결과가 더 빨리 반영됩니다.",
  },
  {
    num: 2,
    title: "랜딩 페이지 방문",
    desc: "검색 결과에서 씨씨카지노 공식 페이지(cc-jm.com)를 클릭하세요.",
    tip: "페이지 맨 아래에 오늘의 미션 코드가 표시됩니다.",
  },
  {
    num: 3,
    title: "코드 입력",
    desc: "확인한 코드를 아래 입력창에 입력하고 보상을 받으세요! (대소문자 구분 없음)",
    tip: "매일 오전 9시에 새로운 코드가 생성됩니다.",
  },
];

export default function SeoMissionPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data: status } = useSeoMissionStatus();
  const claimMutation = useClaimSeoCode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || claimMutation.isPending) return;

    triggerHaptic("medium");
    setFeedback(null);

    try {
      const result = await claimMutation.mutateAsync(code);
      triggerNotification("success");
      setFeedback({
        type: "success",
        message: result.message || "보상이 지급되었습니다!",
      });
      addToast({
        type: "success",
        message: result.message || "검색 미션 보상 지급 완료!",
      });
      setCode("");
    } catch (error: any) {
      triggerNotification("error");
      const detail = error?.response?.data?.detail || "";
      setFeedback({
        type: "error",
        message: ERROR_MESSAGES[detail] || "코드 입력에 실패했습니다.",
      });
    }
  };

  const alreadyClaimed = status?.has_claimed_today === true;

  return (
    <div className="relative min-h-tg bg-[#09090B] overflow-x-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)]">
      <BackgroundPaths count={15} />

      <div className="relative z-10 px-4 pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">돌아가기</span>
          </button>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.2em]">
              일일 검색 미션
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            검색하고 <span className="text-blue-500">포인트</span> 받기
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            매일 구글에서 씨씨카지노를 검색하고 코드를 입력하면 3,000 ~ 5,000P를 받을 수 있습니다.
          </p>
        </motion.div>

        {/* 완료 상태 */}
        {alreadyClaimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <div>
                <p className="font-bold text-emerald-400">오늘 미션 완료!</p>
                <p className="text-sm text-zinc-400">
                  {status?.reward_amount
                    ? `${status.reward_amount.toLocaleString()}P 지급됨`
                    : "보상이 지급되었습니다"}
                  {" · 내일 오전 9시에 새 코드가 생성됩니다."}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3단계 안내 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-3"
        >
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-black text-blue-400">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{step.desc}</p>
                  <p className="text-xs text-zinc-600 mt-1.5">
                    TIP: {step.tip}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* 코드 입력 폼 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-5 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Search size={18} className="text-blue-400" />
            <h3 className="text-base font-black text-white">코드 입력</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3 mb-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="코드 입력 (예: seo4k2b1)"
              maxLength={20}
              disabled={claimMutation.isPending || alreadyClaimed}
              className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-mono text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!code.trim() || claimMutation.isPending || alreadyClaimed}
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-600 transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claimMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : alreadyClaimed ? (
                "완료"
              ) : (
                "보상 받기"
              )}
            </button>
          </form>

          {/* 피드백 메시지 */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-xl p-3 text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                }`}
              >
                {feedback.message}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 보상 안내 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
        >
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Gift size={16} className="text-amber-400" />
            보상 안내
          </h3>
          <div className="space-y-1.5 text-sm text-zinc-400">
            <p>일일 미션: 3,000 ~ 5,000P (랜덤)</p>
            <p>갱신 시간: 매일 오전 9시 (KST)</p>
            <p>참여 제한: 계정당 하루 1회</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

---

### 3.9 [프론트엔드] 라우트 등록

**파일**: `src/v2/router/V2UserRoutes.tsx`

변경 내용:

**1) import 추가** (기존 lazy import 영역에 추가):
```typescript
const SeoMissionPage = lazy(() => import("../pages/event/SeoMissionPage"));
```

**2) Route 추가** (V2AppLayout 내부, EventPage 라우트 근처에 추가):
```tsx
{/* SEO Daily Search Mission */}
<Route path="/v2/event/seo-mission" element={<SeoMissionPage />} />
```

> **위치 참고**: 기존 코드에서 `<Route path="/event" element={<EventPage />} />` (63번째 줄)을 찾아 그 바로 아래에 추가한다.

---

### 3.10 [프론트엔드] HomePage 카드 교체

**파일**: `src/v2/pages/home/HomePage.tsx`

**교체 대상**: 237~251줄의 "레벨미션" bento 타일

기존 코드:
```tsx
{/* Item 4: Square Card (All Games) */}
<div
  className="bento-tile bento-tile--square"
  onClick={() => {
    playTabTouch();
    navigate("/v2/missions?cat=LEVEL");
  }}
>
  <img
    src="/assets/season_pass/icon_node_cleared.webp"
    alt="all"
    className="tile-img-small"
  />
  <span className="tile-title">레벨미션</span>
</div>
```

교체 코드:
```tsx
{/* Item 4: Square Card (SEO Search Mission) */}
<div
  className="bento-tile bento-tile--square"
  onClick={() => {
    playTabTouch();
    navigate("/v2/event/seo-mission");
  }}
>
  <span className="tile-img-small text-2xl">🔍</span>
  <span className="tile-title">검색미션</span>
</div>
```

> **참고**: 아이콘 이미지가 없으므로 이모지를 임시 사용한다. 디자인팀에서 아이콘을 제공하면 `<img>` 태그로 교체.

---

### 3.11 [프론트엔드] PublicLandingPage 히든 코드 섹션

**파일**: `src/v2/pages/public/PublicLandingPage.tsx`

`</main>` 닫는 태그 직전 (현재 452줄 근처, `</section>` 아래)에 다음 섹션을 추가:

```tsx
{/* ───── SEO Mission Hidden Code (구글 검색 유입 전용) ───── */}
<SeoHiddenCodeSection />
```

**같은 파일 또는 별도 컴포넌트로 SeoHiddenCodeSection 구현**:

```tsx
function SeoHiddenCodeSection() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    // referrer 체크: 구글 검색 유입 시에만 코드 노출
    const ref = document.referrer.toLowerCase();
    const isFromSearch =
      ref.includes("google.") ||
      ref.includes("naver.") ||
      ref.includes("daum.") ||
      ref.includes("bing.");

    if (isFromSearch) {
      // 서버에서 코드를 가져오는 대신, 난독화된 코드를 렌더링
      // 실제 코드 값은 서버 API에서 가져와야 하지만,
      // 공개 페이지는 비인증 상태이므로 별도 public API가 필요하다.
      // → 방법 A: 서버에서 /api/public/seo-code-hint 엔드포인트 생성 (비인증)
      // → 방법 B: 빌드 시 환경변수로 코드 주입 (보안 약함)
      // → 방법 C: 아래처럼 클라이언트에서 날짜 기반 힌트 표시 후,
      //           실제 코드는 앱 내에서만 입력
      setCode("SEO_CODE_VISIBLE");
    }
  }, []);

  if (!code) return null;

  return (
    <section className="mt-10 rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
      <h2 className="text-lg font-bold text-white">
        일일 검색 미션 코드
      </h2>
      <p className="mt-2 text-sm text-obsidian-muted">
        구글 검색을 통해 방문해 주셔서 감사합니다!
        아래 코드를 씨씨카지노 앱 내 검색 미션 페이지에서 입력하면
        3,000 ~ 5,000P를 받을 수 있습니다.
      </p>
      {/* 난독화: CSS 클래스 랜덤화로 매크로 스크래핑 방지 */}
      <div
        className="mt-4 inline-block rounded-xl bg-white/10 px-6 py-3 font-mono text-xl font-black text-white tracking-widest select-all"
        data-nosnippet=""
      >
        {/* 이 부분은 실제 구현 시 서버 API 호출로 대체 */}
        오늘의 코드: 앱에서 확인하세요
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        매일 오전 9시에 새로운 코드가 생성됩니다. 계정당 하루 1회 참여 가능.
      </p>
    </section>
  );
}
```

> **중요 설계 결정 필요**: 공개 랜딩 페이지에서 실제 코드를 노출하려면 **비인증 공개 API**가 필요하다. 아래 3가지 방안 중 선택:
>
> | 방안 | 장점 | 단점 |
> |------|------|------|
> | A. 공개 API (`GET /api/public/seo-code-today`) | 깔끔, 실시간 | API 남용 가능 (rate limit 필요) |
> | B. 환경변수 주입 (빌드 시 코드 포함) | 서버 부하 없음 | 매일 빌드 필요, 보안 약함 |
> | C. 앱 내에서만 코드 안내 (랜딩에는 "앱에서 확인" 표시) | 가장 안전 | SEO 체류시간 효과 감소 |
>
> **권장**: 방안 A. 공개 API + rate limit + referrer 체크

### 3.11.1 [추가] 방안 A 선택 시: 공개 코드 힌트 API

**파일**: `app/v2/api/seo_mission_routes.py`에 추가

```python
@router.get("/public/today-hint")
def get_public_seo_hint(db: Session = Depends(get_db)):
    """비인증 엔드포인트: 오늘의 SEO 코드 반환.

    Referrer 체크는 프론트엔드에서 수행.
    Rate limit: 분당 30회 (nginx 또는 FastAPI middleware에서 설정).
    """
    service = V2SeoCodeService(db)
    code = service.get_today_code()
    if not code:
        return {"code": None, "message": "오늘의 코드가 아직 생성되지 않았습니다."}
    return {"code": code.code}
```

> **주의**: 이 엔드포인트는 `get_current_user_id` 의존성이 없다 (비인증). nginx rate limit 설정을 반드시 병행할 것.

---

## 4. 보안 강화 체크리스트

| # | 항목 | 구현 위치 | 방법 |
|---|------|-----------|------|
| 1 | 코드 입력 쿨다운 | 프론트엔드 + 백엔드 | FE: 버튼 3초 debounce, BE: 동일 유저 1분 내 재요청 거부 |
| 2 | 일일 1회 제한 | `V2SeoCodeService.claim_code()` | `DAILY_LIMIT_REACHED` 에러 반환 |
| 3 | CSS 난독화 | `PublicLandingPage.tsx` | `data-nosnippet` 속성 + 코드 표시 시 CSS 클래스명 랜덤화 |
| 4 | Referrer 체크 | `SeoHiddenCodeSection` | `document.referrer`에 google/naver/bing 포함 여부 확인 |
| 5 | Rate Limit | nginx / FastAPI middleware | `/api/v2/seo-mission/claim` 분당 10회, `/public/today-hint` 분당 30회 |
| 6 | Brute-force 방지 | 백엔드 | 5회 연속 실패 시 15분 차단 (향후 구현, 초기에는 미적용 가능) |

---

## 5. 연속 참여 보너스 (7일 스트릭) — 향후 확장

기획서에 "7일 연속 참여 성공 시 골드 룰렛 티켓 1매" 정의됨.
현재 구현 범위에서는 **일일 코드 클레임만 구현**하고, 스트릭 시스템은 이후 확장.

확장 시 필요한 작업:
1. `user_seo_daily_code_claim` 테이블에서 최근 7일 연속 클레임 여부 계산
2. 7일 연속 달성 시 `V2RewardService.grant_ticket(ROULETTE_TICKET, 1)` 호출
3. 스트릭 진행 UI를 `SeoMissionPage`에 추가 (기존 `DailyStreakBoard` 패턴 참조)

---

## 6. 구현 순서 (의존성 기반)

```
Phase 1 — 백엔드 (먼저)
  Step 3.1  DB 모델 생성
  Step 3.4  마이그레이션 생성 + 실행
  Step 3.2  서비스 레이어 생성
  Step 3.3  API 라우트 생성 + main.py 등록
  Step 3.5  Cron 스크립트 생성

Phase 2 — 프론트엔드 (백엔드 완료 후)
  Step 3.6   API 모듈 + index.ts 업데이트
  Step 3.7   React Query 훅
  Step 3.8   SeoMissionPage 전용 페이지
  Step 3.9   라우트 등록 (V2UserRoutes.tsx)
  Step 3.10  HomePage 카드 교체
  Step 3.11  PublicLandingPage 히든 코드 섹션

Phase 3 — 검증 + 문서
  테스트 실행
  트러블슈팅 문서 업데이트
  SOT 변경로그 작성
```

---

## 7. 검증 방법

### 7.1 백엔드 검증

```bash
# 1. 마이그레이션 실행
alembic upgrade head

# 2. 코드 생성 테스트
python scripts/rotate_seo_daily_code.py

# 3. API 테스트 (httpie 또는 curl)
# 상태 조회
http GET localhost:8000/api/v2/seo-mission/status "Authorization: Bearer {TOKEN}"

# 코드 입력
http POST localhost:8000/api/v2/seo-mission/claim code="SEOFIRST" "Authorization: Bearer {TOKEN}"

# 중복 입력 (400 ALREADY_CLAIMED 확인)
http POST localhost:8000/api/v2/seo-mission/claim code="SEOFIRST" "Authorization: Bearer {TOKEN}"

# 잘못된 코드 (404 INVALID_CODE 확인)
http POST localhost:8000/api/v2/seo-mission/claim code="WRONG" "Authorization: Bearer {TOKEN}"
```

### 7.2 프론트엔드 검증

1. `/home` 접속 → "검색미션" 카드 표시 확인
2. 카드 클릭 → `/v2/event/seo-mission` 이동 확인
3. 3단계 안내 UI 정상 렌더링 확인
4. 코드 입력 → 보상 메시지 + 토스트 알림 확인
5. 이미 완료 상태 → "오늘 미션 완료!" 배너 표시 확인
6. 잘못된 코드 → 에러 메시지 표시 확인

### 7.3 SEO 검증 (랜딩 페이지)

1. 구글에서 `씨씨카지노` 검색 → `cc-jm.com` 클릭 → 랜딩 페이지 진입
2. 페이지 하단 스크롤 → 히든 코드 섹션 노출 확인
3. 직접 URL 접속 (referrer 없음) → 히든 코드 섹션 미노출 확인

---

## 8. 기존 시스템과의 차이점

| 항목 | Valentine 이벤트 (기존) | SEO 검색 미션 (신규) |
|------|------------------------|---------------------|
| 코드 생성 | 마이그레이션에 수동 시드 | Cron으로 매일 자동 생성 |
| 유효 기간 | `expires_at` 컬럼 | `target_date` + 하루 단위 |
| 보상 금액 | 코드별 고정 (티켓/포인트) | 범위 내 랜덤 (3,000~5,000P) |
| 하루 제한 | 코드당 1회 (여러 코드 가능) | 계정당 하루 1회 (코드 무관) |
| API 경로 | `/api/events/secret-code/claim` | `/api/v2/seo-mission/claim` |
| DB 테이블 | `event_secret_code` | `seo_daily_code` (별도) |
| 공개 노출 | 텔레그램 채널 공지 | 구글 검색 랜딩 페이지 |

---

## 9. 관련 문서

- SEO SoT: `docs/SOT/00_seo/01_seo_sot_ko.md`
- SEO 실행 계획: `docs/SOT/00_seo/02_seo_execution_plan_ko.md`
- 랜딩 페이지 콘텐츠 스펙: `docs/SOT/00_seo/03_landing_page_content_spec_ko.md`
- Valentine 이벤트 기획서: `docs/events/2026_valentine_seol_event_proposal.md`
- 기존 시크릿 코드 구현: `app/v2/api/event_routes.py`
- 프론트엔드 라우팅 SoT: `docs/SOT/00_design/v2_frontend_routing_sot_ko.md`
- 미션 SoT: `docs/SOT/00_mission/00_mission_sot_master.md`

---

## 10. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-12 | v1.0 | 초안 작성 (전체 구현 가이드) | Claude Opus 4.6 |
