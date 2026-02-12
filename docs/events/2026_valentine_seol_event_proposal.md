# 🎁 씨씨카지노 발렌타인데이 & 설 연휴 통합 이벤트 기획서

**문서 정보**
- **작성일**: 2026-02-11 (v1.1 수정)
- **이벤트 기간**: 2026-02-14 (발렌타인데이) ~ 2026-02-17 (설 연휴 종료)
- **목적**: 씨씨카지노 리텐션율 상승 및 고액 입금 유저 확보
- **타겟**: 한국 도박 성향 20-50대 남성
- **문서 상태**: 기획안 v1.1 (입금 조건 상향, 비밀코드 추가)

---

## 📋 목차
1. [이벤트 개요](#1-이벤트-개요)
2. [이벤트 상세 기획](#2-이벤트-상세-기획)
3. [비밀코드 시스템](#3-비밀코드-시스템)
4. [기술 구현 방안](#4-기술-구현-방안)
5. [운영 체크리스트](#5-운영-체크리스트)
6. [리스크 관리](#6-리스크-관리)

---

## 1. 이벤트 개요

### 1.1 컨셉 설명 (쉬운 버전)

**"설날 세뱃돈 + 발렌타인 럭키박스 + 비밀코드 이벤트"**

명절이면 어른들께 세배하면 세뱃돈 받잖아요? 씨씨카지노에서도 똑같이 해드립니다!
- **2월 14일 (발렌타인데이)**: 달달한 초콜릿처럼 달콤한 보너스 티켓을 드려요
- **2월 15~17일 (설 연휴)**: 매일 입금하고 게임하면 세뱃돈처럼 포인트와 티켓을 팡팡!
- **비밀코드**: 텔레그램 채널에서 매일 공개되는 비밀코드 입력하면 추가 보상!
- **이벤트 꿀팁**: 4일 내내 매일 참여하면 **6만 포인트 + 프리미엄 티켓**까지!

---

### 1.2 이벤트 목표 및 전략

#### 목표
1. **리텐션 강화**: 4일 연속 접속 유도로 DAU(일일 활성 사용자) 30% ↑
2. **고액 입금 유도**: 10만원/30만원 입금 조건으로 ARPU 50% ↑
3. **텔레그램 채널 활성화**: 비밀코드 공개로 채널 체류시간 증가

#### 전략
- **고액 입금 조건**: 2/15 (10만원), 2/17 (30만원) 입금 필수
- **연속 참여 인센티브**: 4일 연속 접속 시 보너스 보상 (스트릭 시스템 활용)
- **비밀코드 게이미피케이션**: 텔레그램 채널에서 코드 공개 → 앱에서 입력 → 즉시 보상

---

## 2. 이벤트 상세 기획

### 2.1 이벤트 일정 및 구성

| 날짜 | 이벤트명 | 주요 액션 | 기본 보상 | 비밀코드 보너스 |
|------|----------|-----------|----------|-----------------|
| **2/14 (금)** | 발렌타인 럭키박스 | 로그인 + 게임 3회 플레이 | 🎁 티켓 번들 3종 (룰렛+주사위+복권) | 🎫 룰렛 티켓 +2장 |
| **2/15 (토)** | 설날 세뱃돈 DAY 1 | 로그인 + **입금 10만원** | 💰 포인트 10,000P + 룰렛 티켓 2장 | 복권티켓 1장 |
| **2/16 (일)** | 설날 세뱃돈 DAY 2 | 로그인 + 게임 5회 플레이 | 복권티켓 1장 + 주사위 티켓 3장 | 🎲 주사위 티켓 +2장 |
| **2/17 (월)** | 설날 세뱃돈 DAY 3 | 로그인 + **입금 30만원** | 🏆 포인트 20,000P + 다이아몬드 티켓 1장 | 💰 포인트 +10,000P |
| **연속 달성** | 4일 연속 접속 보너스 | 위 4일 모두 완료 | 🎉 포인트 20,000P + 골드키 티켓 1장 | - |

**총 획득 가능 보상 (4일 완료 + 비밀코드 전부 입력 기준)**
- 💰 포인트: **60,000P** (기본 50,000P + 비밀코드 10,000P)
- 🎟️ 티켓: 룰렛 5장, 주사위 8장, 복권 3장, 골드키 1개, 다이아몬드 1장


---

### 2.2 입금 조건 상세

#### 입금 미션 상세 정책

| 날짜 | 입금 조건 | 보상 | ROI |
|------|----------|------|-----|
| **2/15 (토)** | 10만원 이상 | 10,000P + 룰렛 티켓 2장 | 약 10% (포인트 기준) |
| **2/17 (월)** | 30만원 이상 | 20,000P + 다이아몬드 티켓 1장 | 약 6.7% (포인트 기준) |

**입금 검증 방식**:
- CC 시스템 `cc_deposit` 순증 기준
- 당일 00:00 ~ 23:59:59 (KST) 누적 입금액 확인
- 미션 진행도 자동 업데이트: `action_type="CC_DEPOSIT"`

**코드 근거**:
- `app/v2/services/mission_service.py` - `update_progress()` 메서드
- CC 입금 웹훅에서 자동 호출

---

### 2.3 미션 구조 설계

기존 **미션 시스템**(`docs/SOT/00_mission/00_mission_sot_master.md`)을 재활용하여 이벤트 참여를 미션 형태로 구현합니다.

#### 미션 목록 정의

```sql
-- 2월 14일 - 발렌타인 럭키박스
INSERT INTO mission (
    title, description, category, logic_key, action_type,
    target_value, reward_type, reward_amount, xp_reward,
    requires_approval, auto_claim, is_active, visible,
    start_date, end_date, start_time, end_time
) VALUES (
    '💝 발렌타인 럭키박스 받기',
    '오늘 로그인하고 게임 3회 플레이하면 티켓 번들 GET!',
    'SPECIAL', 'EVENT_VALENTINE_2026', 'PLAY_GAME',
    3, 'TICKET_BUNDLE', 3, 500,
    FALSE, FALSE, TRUE, TRUE,
    '2026-02-14', '2026-02-14', '00:00:00', '23:59:59'
);

-- 2월 15일 - 설날 세뱃돈 DAY 1 (입금 10만원)
INSERT INTO mission (
    title, description, category, logic_key, action_type,
    target_value, reward_type, reward_amount, xp_reward,
    requires_approval, auto_claim, is_active, visible,
    start_date, end_date, start_time, end_time
) VALUES (
    '🧧 설날 세뱃돈 DAY 1 - 10만원 입금',
    '오늘 10만원 이상 입금하면 포인트 10,000P + 룰렛 티켓!',
    'SPECIAL', 'EVENT_SEOL_DAY1_2026', 'CC_DEPOSIT',
    100000, 'BUNDLE', 23, 1000,
    FALSE, FALSE, TRUE, TRUE,
    '2026-02-15', '2026-02-15', '00:00:00', '23:59:59'
);

-- 2월 16일 - 설날 세뱃돈 DAY 2 (플레이 미션)
INSERT INTO mission (
    title, description, category, logic_key, action_type,
    target_value, reward_type, reward_amount, xp_reward,
    requires_approval, auto_claim, is_active, visible,
    start_date, end_date, start_time, end_time
) VALUES (
    '🎮 설날 세뱃돈 DAY 2 - 게임 즐기기',
    '오늘 게임 5회 플레이하면 복권 + 주사위 티켓!',
    'SPECIAL', 'EVENT_SEOL_DAY2_2026', 'PLAY_GAME',
    5, 'BUNDLE', 21, 800,
    FALSE, FALSE, TRUE, TRUE,
    '2026-02-16', '2026-02-16', '00:00:00', '23:59:59'
);

-- 2월 17일 - 설날 세뱃돈 DAY 3 (입금 30만원)
INSERT INTO mission (
    title, description, category, logic_key, action_type,
    target_value, reward_type, reward_amount, xp_reward,
    requires_approval, auto_claim, is_active, visible,
    start_date, end_date, start_time, end_time
) VALUES (
    '💎 설날 세뱃돈 DAY 3 - 30만원 입금',
    '오늘 30만원 이상 입금하면 포인트 20,000P + 다이아몬드 티켓!',
    'SPECIAL', 'EVENT_SEOL_DAY3_2026', 'CC_DEPOSIT',
    300000, 'BUNDLE', 22, 1500,
    FALSE, FALSE, TRUE, TRUE,
    '2026-02-17', '2026-02-17', '00:00:00', '23:59:59'
);

-- 연속 달성 보너스 (스트릭 미션)
INSERT INTO mission (
    title, description, category, logic_key, action_type,
    target_value, reward_type, reward_amount, xp_reward,
    requires_approval, auto_claim, is_active, visible,
    start_date, end_date, start_time, end_time
) VALUES (
    '🏆 4일 연속 달성 보너스',
    '2/14~2/17 모든 미션 완료 시 추가 보상!',
    'SPECIAL', 'EVENT_SEOL_STREAK_2026', 'EVENT_STREAK',
    4, 'BUNDLE', 25, 2000,
    FALSE, FALSE, TRUE, TRUE,
    '2026-02-14', '2026-02-17', '00:00:00', '23:59:59'
);
```

---

### 2.4 보상 번들 정의

기존 **RewardService**(`app/v2/services/reward_service.py`)의 번들 시스템을 활용합니다.

> [!IMPORTANT]
> 기존 번들 15/20은 레벨 보상에서 사용 중이므로 **수정하지 않고 원본 유지**합니다.
> 이벤트 전용으로 새로운 번들 ID (21, 22, 23, 25)를 추가하였습니다.

#### 기존 번들 (변경 없음 — 원본 유지)

| 번들 ID | 포인트 | 티켓/아이템 | 용도 |
|---------|--------|-------------|------|
| **3** | 0 | 룰렛 1 + 주사위 1 + 복권 1 | 2/14 발렌타인 (기존 번들 재활용) |
| **15** | 100,000P | 골드키 2장 | 레벨 보상 (원본 유지) |
| **20** | 300,000P | 다이아몬드 3장 | 레벨 보상 (원본 유지) |

#### 이벤트 전용 신규 번들

| 번들 ID | 포인트 | 티켓/아이템 | 용도 |
|---------|--------|-------------|------|
| **21** | 0 | 복권 1장 + 주사위 3장 | 2/16 DAY 2 보상 |
| **22** | 20,000P | 다이아몬드 1장 | 2/17 DAY 3 보상 |
| **23** | 10,000P | 룰렛 2장 | 2/15 DAY 1 보상 |
| **25** | 20,000P | 골드키 1장 | 4일 연속 보너스 |

**구현 위치**: `app/v2/services/reward_service.py` — `deliver()` 메서드 내 `BUNDLE` 분기

```python
# === Event Bundles (2026 Valentine & Seol) ===
elif reward_amount == 21:  # DAY 2: 복권 1장 + 주사위 3장
    bundle_items = [(GameTokenType.LOTTERY_TICKET, 1), (GameTokenType.DICE_TICKET, 3)]
elif reward_amount == 22:  # DAY 3: 포인트 20,000P + 다이아몬드 1장
    self._grant_vault_locked(db, user_id=user_id, amount=20000, reason="EVENT_SEOL_DAY3", ...)
    bundle_items = [(GameTokenType.DIAMOND_TICKET, 1)]
elif reward_amount == 23:  # DAY 1: 포인트 10,000P + 룰렛 2장
    self._grant_vault_locked(db, user_id=user_id, amount=10000, reason="EVENT_SEOL_DAY1", ...)
    bundle_items = [(GameTokenType.ROULETTE_TICKET, 2)]
elif reward_amount == 25:  # 4일 연속 보너스: 포인트 20,000P + 골드키 1장
    self._grant_vault_locked(db, user_id=user_id, amount=20000, reason="EVENT_SEOL_STREAK", ...)
    bundle_items = [(GameTokenType.GOLD_KEY_TICKET, 1)]
```

---

## 3. 비밀코드 시스템

### 3.1 비밀코드 컨셉

**목적**: 텔레그램 채널 활성화 및 유저 참여도 극대화

**플로우**:
1. 매일 오전 10시, 텔레그램 채널에 비밀코드 공개 (예: "LOVE2026", "SEOL777")
2. 유저가 씨씨카지노 앱 → 이벤트 페이지 → 비밀코드 입력창에 코드 입력
3. 정확한 코드 입력 시 즉시 보상 지급
4. 하루 1회만 입력 가능, 자정(00:00 KST) 리셋

---

### 3.2 일별 비밀코드 및 보상

| 날짜 | 비밀코드 | 보상 | 공개 시간 |
|------|----------|------|-----------|
| **2/14** | `LOVE2026` | 룰렛 티켓 2장 | 10:00 AM (텔레그램) |
| **2/15** | `SEOL777` | 복권 티켓 1장 | 10:00 AM |
| **2/16** | `LUCKY888` | 주사위 티켓 2장 | 10:00 AM |
| **2/17** | `JACKPOT999` | 포인트 10,000P | 10:00 AM |

**비밀코드 규칙**:
- 영문 대문자 + 숫자 조합
- 6~10자 이내
- 유추하기 어렵지만 테마 연관성 있음

---

### 3.3 비밀코드 기술 구현

#### 3.3.1 DB 테이블 추가

**테이블명**: `event_secret_code`

```sql
CREATE TABLE event_secret_code (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    event_date DATE NOT NULL,
    reward_type VARCHAR(50) NOT NULL,
    reward_amount INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_event_secret_code_code ON event_secret_code(code);
CREATE INDEX idx_event_secret_code_date ON event_secret_code(event_date);

-- 유저별 코드 입력 기록 테이블
CREATE TABLE user_secret_code_claim (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES v2_user(id),
    secret_code_id INTEGER NOT NULL REFERENCES event_secret_code(id),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, secret_code_id)  -- 중복 입력 방지
);

-- 인덱스 추가
CREATE INDEX idx_user_secret_code_claim_user ON user_secret_code_claim(user_id);
```

#### 3.3.2 비밀코드 시드 데이터

```sql
INSERT INTO event_secret_code (code, event_date, reward_type, reward_amount, expires_at) VALUES
('LOVE2026', '2026-02-14', 'ROULETTE_TICKET', 2, '2026-02-14 23:59:59+09'),
('SEOL777', '2026-02-15', 'LOTTERY_TICKET', 1, '2026-02-15 23:59:59+09'),
('LUCKY888', '2026-02-16', 'DICE_TICKET', 2, '2026-02-16 23:59:59+09'),
('JACKPOT999', '2026-02-17', 'POINT', 10000, '2026-02-17 23:59:59+09');
```

#### 3.3.3 백엔드 API

**파일**: `app/v2/api/event_routes.py` (신규 생성)

**엔드포인트**:
- `POST /api/events/secret-code/claim` — 비밀코드 입력 & 보상 즉시 지급
- `GET /api/events/valentine-seol/status` — 이벤트 미션 현황 + 코드 상태

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from zoneinfo import ZoneInfo

from app.v2.api.deps import get_db, get_current_user_id
from app.v2.services.reward_service import V2RewardService

router = APIRouter(prefix="/api/events", tags=["events-valentine-seol"])

@router.post("/secret-code/claim", response_model=SecretCodeClaimResponse)
def claim_secret_code(
    payload: SecretCodeClaimRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SecretCodeClaimResponse:
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))

    # 1) 코드 조회 (is_active + 대소문자 무관)
    code_upper = payload.code.strip().upper()
    secret = db.query(EventSecretCode).filter(
        EventSecretCode.code == code_upper,
        EventSecretCode.is_active == True,
    ).first()
    if not secret:
        raise HTTPException(status_code=404, detail="INVALID_CODE")

    # 2) 만료 확인 (KST 기준)
    expires_at = secret.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=ZoneInfo("Asia/Seoul"))
    if now_kst > expires_at:
        raise HTTPException(status_code=400, detail="CODE_EXPIRED")

    # 3) 중복 입력 확인
    existing = db.query(UserSecretCodeClaim).filter(
        UserSecretCodeClaim.user_id == user_id,
        UserSecretCodeClaim.secret_code_id == secret.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="ALREADY_CLAIMED")

    # 4) 보상 지급 (티켓 또는 포인트)
    _grant_secret_code_reward(db, user_id=user_id,
                              reward_type=secret.reward_type,
                              reward_amount=secret.reward_amount)

    # 5) claim 기록 저장
    db.add(UserSecretCodeClaim(
        user_id=user_id, secret_code_id=secret.id,
        claimed_at=datetime.utcnow(),
    ))
    db.commit()

    return SecretCodeClaimResponse(
        success=True,
        reward_type=secret.reward_type,
        reward_amount=secret.reward_amount,
        message=f"{secret.reward_type} x{secret.reward_amount} 지급 완료!",
    )
```

**보상 지급 함수** (`_grant_secret_code_reward`):

```python
def _grant_secret_code_reward(db, *, user_id, reward_type, reward_amount):
    TICKET_MAP = {
        "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
        "DICE_TICKET": GameTokenType.DICE_TICKET,
        "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
        "GOLD_KEY_TICKET": GameTokenType.GOLD_KEY_TICKET,
        "DIAMOND_TICKET": GameTokenType.DIAMOND_TICKET,
    }
    token_type = TICKET_MAP.get(reward_type.upper())
    if token_type:
        V2RewardService().grant_ticket(db, user_id=user_id,
            token_type=token_type, amount=reward_amount,
            meta={"reason": "SECRET_CODE", "source": "EVENT_SEOL_2026"})
    elif reward_type.upper() == "POINT":
        V2RewardService().deliver(db, user_id=user_id,
            reward_type="POINT", reward_amount=reward_amount,
            meta={"reason": "SECRET_CODE", "source": "EVENT_SEOL_2026"})
```

#### 3.3.4 프론트엔드 UI

**파일**: `frontend/src/components/Event/SecretCodeInput.tsx` (신규 생성)

```typescript
import React, { useState } from 'react';
import { apiClient } from '@/utils/apiClient';
import './SecretCodeInput.css';

const SecretCodeInput: React.FC = () => {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await apiClient.post('/api/events/secret-code/claim', {
                code: code.toUpperCase()
            });

            setIsSuccess(true);
            setMessage(response.data.message);
            setCode('');

            // 3초 후 성공 메시지 사라짐
            setTimeout(() => {
                setMessage('');
                setIsSuccess(false);
            }, 3000);
        } catch (error: any) {
            setIsSuccess(false);
            setMessage(error.response?.data?.detail || '코드 입력에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="secret-code-container">
            <div className="secret-code-header">
                <h3>🎁 비밀코드 입력</h3>
                <p className="hint">텔레그램 채널에서 매일 공개되는 비밀코드를 입력하세요!</p>
            </div>

            <form onSubmit={handleSubmit} className="secret-code-form">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="비밀코드 입력 (예: LOVE2026)"
                    className="code-input"
                    maxLength={10}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={!code || isLoading}
                >
                    {isLoading ? '확인 중...' : '보상 받기'}
                </button>
            </form>

            {message && (
                <div className={`message ${isSuccess ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="telegram-link">
                <p>
                    💬 <a href="https://t.me/ccCasino_official" target="_blank" rel="noopener noreferrer">
                        텔레그램 채널 바로가기
                    </a>
                </p>
            </div>
        </div>
    );
};

export default SecretCodeInput;
```

**CSS 파일**: `frontend/src/components/Event/SecretCodeInput.css`

```css
.secret-code-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px;
    border-radius: 16px;
    color: white;
    margin-bottom: 20px;
}

.secret-code-header h3 {
    font-size: 24px;
    margin-bottom: 8px;
}

.secret-code-header .hint {
    font-size: 14px;
    opacity: 0.9;
    margin-bottom: 16px;
}

.secret-code-form {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}

.code-input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    font-size: 16px;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.code-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.submit-btn {
    padding: 12px 24px;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
    background: #f0f0f0;
}

.submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.message {
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    font-weight: 500;
}

.message.success {
    background: rgba(76, 175, 80, 0.3);
    border: 1px solid rgba(76, 175, 80, 0.5);
}

.message.error {
    background: rgba(244, 67, 54, 0.3);
    border: 1px solid rgba(244, 67, 54, 0.5);
}

.telegram-link {
    text-align: center;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.telegram-link a {
    color: white;
    text-decoration: underline;
    font-weight: 500;
}
```

---

### 3.4 텔레그램 공지 스크립트

**파일**: `scripts/send_secret_code_announcement.py`

```python
import requests
import os
from datetime import datetime

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")

def send_telegram_message(message: str):
    """텔레그램 채널에 메시지 발송"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHANNEL_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    response = requests.post(url, json=payload)
    return response.json()

# 일별 비밀코드 공지
secret_codes = {
    "2026-02-14": {
        "code": "LOVE2026",
        "reward": "룰렛 티켓 2장"
    },
    "2026-02-15": {
        "code": "SEOL777",
        "reward": "복권 티켓 1장"
    },
    "2026-02-16": {
        "code": "LUCKY888",
        "reward": "주사위 티켓 2장"
    },
    "2026-02-17": {
        "code": "JACKPOT999",
        "reward": "포인트 10,000P"
    }
}

if __name__ == "__main__":
    today = datetime.now().strftime("%Y-%m-%d")

    if today in secret_codes:
        code_info = secret_codes[today]
        message = f"""
🎁 *오늘의 비밀코드 공개!* 🎁

📢 비밀코드: `{code_info['code']}`
🎁 보상: {code_info['reward']}

👉 씨씨카지노 앱 → 이벤트 페이지에서 입력하세요!
⏰ 오늘 자정까지만 유효합니다!

💡 *입력 방법*
1. 앱 실행 → 이벤트 배너 클릭
2. 비밀코드 입력창에 위 코드 입력
3. 즉시 보상 받기!

❗ 하루 1회만 입력 가능하니 놓치지 마세요!
        """
        send_telegram_message(message)
        print(f"✅ {today} 비밀코드 공지 발송 완료: {code_info['code']}")
    else:
        print(f"⚠️ {today}는 이벤트 기간이 아닙니다.")
```

**Cron 설정** (매일 오전 10시 실행):

```bash
0 10 * * * /usr/bin/python3 /path/to/scripts/send_secret_code_announcement.py
```

---

## 4. 기술 구현 방안

### 4.1 백엔드 구현 체크리스트

#### 4.1.1 마이그레이션 파일

**파일**: `alembic/versions/20260214_1000_event_valentine_seol_missions.py`

```python
"""이벤트 미션 및 비밀코드 테이블 추가

Revision ID: 20260214_1000
Create Date: 2026-02-14
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # 비밀코드 테이블 생성
    op.execute("""
        CREATE TABLE event_secret_code (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            event_date DATE NOT NULL,
            reward_type VARCHAR(50) NOT NULL,
            reward_amount INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_event_secret_code_code ON event_secret_code(code);
        CREATE INDEX idx_event_secret_code_date ON event_secret_code(event_date);

        CREATE TABLE user_secret_code_claim (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES v2_user(id),
            secret_code_id INTEGER NOT NULL REFERENCES event_secret_code(id),
            claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, secret_code_id)
        );

        CREATE INDEX idx_user_secret_code_claim_user ON user_secret_code_claim(user_id);
    """)

    # 비밀코드 시드 데이터
    op.execute("""
        INSERT INTO event_secret_code (code, event_date, reward_type, reward_amount, expires_at) VALUES
        ('LOVE2026', '2026-02-14', 'ROULETTE_TICKET', 2, '2026-02-14 23:59:59+09'),
        ('SEOL777', '2026-02-15', 'LOTTERY_TICKET', 1, '2026-02-15 23:59:59+09'),
        ('LUCKY888', '2026-02-16', 'DICE_TICKET', 2, '2026-02-16 23:59:59+09'),
        ('JACKPOT999', '2026-02-17', 'POINT', 10000, '2026-02-17 23:59:59+09');
    """)

    # 이벤트 미션 삽입
    op.execute("""
        INSERT INTO mission (
            title, description, category, logic_key, action_type,
            target_value, reward_type, reward_amount, xp_reward,
            requires_approval, auto_claim, is_active, visible,
            start_date, end_date, start_time, end_time, created_at, updated_at
        ) VALUES
        ('💝 발렌타인 럭키박스', '게임 3회 플레이하면 티켓 번들!',
         'SPECIAL', 'EVENT_VALENTINE_2026', 'PLAY_GAME',
         3, 'TICKET_BUNDLE', 3, 500,
         FALSE, FALSE, TRUE, TRUE,
         '2026-02-14', '2026-02-14', '00:00:00', '23:59:59', NOW(), NOW()),

        ('🧧 설날 세뱃돈 DAY 1', '10만원 이상 입금하면 10,000P + 룰렛 티켓!',
         'SPECIAL', 'EVENT_SEOL_DAY1_2026', 'CC_DEPOSIT',
         100000, 'BUNDLE', 23, 1000,
         FALSE, FALSE, TRUE, TRUE,
         '2026-02-15', '2026-02-15', '00:00:00', '23:59:59', NOW(), NOW()),

        ('🎮 설날 세뱃돈 DAY 2', '게임 5회 플레이로 복권 + 주사위 티켓!',
         'SPECIAL', 'EVENT_SEOL_DAY2_2026', 'PLAY_GAME',
         5, 'BUNDLE', 21, 800,
         FALSE, FALSE, TRUE, TRUE,
         '2026-02-16', '2026-02-16', '00:00:00', '23:59:59', NOW(), NOW()),

        ('💎 설날 세뱃돈 DAY 3', '30만원 이상 입금하면 20,000P + 다이아몬드 티켓!',
         'SPECIAL', 'EVENT_SEOL_DAY3_2026', 'CC_DEPOSIT',
         300000, 'BUNDLE', 22, 1500,
         FALSE, FALSE, TRUE, TRUE,
         '2026-02-17', '2026-02-17', '00:00:00', '23:59:59', NOW(), NOW()),

        ('🏆 4일 연속 달성', '모든 미션 완료 시 추가 보상!',
         'SPECIAL', 'EVENT_SEOL_STREAK_2026', 'EVENT_STREAK',
         4, 'BUNDLE', 25, 2000,
         FALSE, FALSE, TRUE, TRUE,
         '2026-02-14', '2026-02-17', '00:00:00', '23:59:59', NOW(), NOW())
    """)

def downgrade():
    op.execute("DROP TABLE IF EXISTS user_secret_code_claim")
    op.execute("DROP TABLE IF EXISTS event_secret_code")
    op.execute("""
        UPDATE mission SET is_active = FALSE WHERE logic_key IN (
            'EVENT_VALENTINE_2026', 'EVENT_SEOL_DAY1_2026',
            'EVENT_SEOL_DAY2_2026', 'EVENT_SEOL_DAY3_2026',
            'EVENT_SEOL_STREAK_2026'
        )
    """)
```

---

### 4.2 프론트엔드 구현 체크리스트

#### 미션 페이지 수정

**파일**: `frontend/src/pages/MissionsPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import ValentineSeolBanner from '@/components/Event/ValentineSeolBanner';
import SecretCodeInput from '@/components/Event/SecretCodeInput';
import MissionList from '@/components/Mission/MissionList';
import { apiClient } from '@/utils/apiClient';

const MissionsPage: React.FC = () => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [eventDay, setEventDay] = useState<string | null>(null);
    const [streakProgress, setStreakProgress] = useState<number>(0);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];

        if (today === '2026-02-14') setEventDay('valentine');
        else if (today === '2026-02-15') setEventDay('seol_day1');
        else if (today === '2026-02-16') setEventDay('seol_day2');
        else if (today === '2026-02-17') setEventDay('seol_day3');

        fetchMissions();
    }, []);

    const fetchMissions = async () => {
        // 이벤트 미션 현황 조회 (비밀코드 상태 포함)
        const response = await apiClient.get('/api/events/valentine-seol/status');
        setMissions(response.data.missions);
        setStreakProgress(response.data.streak_current);
    };

    return (
        <div className="missions-page">
            <h1>미션</h1>

            {/* 이벤트 배너 */}
            {eventDay && <ValentineSeolBanner eventDay={eventDay as any} />}

            {/* 비밀코드 입력 (이벤트 기간만 노출) */}
            {eventDay && <SecretCodeInput />}

            {/* 기존 미션 리스트 */}
            <MissionList missions={missions} />
        </div>
    );
};

export default MissionsPage;
```

---

## 5. 운영 체크리스트

### 5.1 배포 전 준비 (2/13까지)

#### 백엔드
- [x] 마이그레이션 파일 생성 및 테스트 (`20260214_1000_event_valentine_seol_missions.py`)
- [x] RewardService 이벤트 전용 번들 추가 (ID 21/22/23/25, 기존 15/20 유지)
- [x] 비밀코드 API 엔드포인트 생성 (`POST /api/events/secret-code/claim`)
- [x] 이벤트 현황 API 생성 (`GET /api/events/valentine-seol/status`)
- [x] DB 테이블 생성 (`event_secret_code`, `user_secret_code_claim`)
- [x] CC_DEPOSIT delta 수정 (횟수→금액)
- [x] EVENT_STREAK 스트릭 핸들러 구현

#### 프론트엔드
- [ ] 비밀코드 입력 컴포넌트 생성 (`SecretCodeInput.tsx`)
- [ ] 미션 페이지에 컴포넌트 삽입
- [ ] CSS 스타일링 완료

#### 운영
- [ ] 텔레그램 공지 스크립트 작성 및 Cron 설정
- [ ] 비밀코드 4종 확정 (LOVE2026, SEOL777, LUCKY888, JACKPOT999)
- [ ] FAQ 준비 (비밀코드 입력 방법, 중복 입력 불가 안내)

---

### 5.2 이벤트 진행 중 (매일)

#### 오전 10시 (자동)
- [ ] Cron으로 텔레그램 비밀코드 공지 발송

#### 오후 6시 (수동)
- [ ] 비밀코드 입력 현황 확인 (어드민 대시보드)
- [ ] 입금 미션 달성률 확인 (2/15, 2/17)

---

## 6. 리스크 관리

### 6.1 기술적 리스크

| 리스크 | 발생 가능성 | 영향도 | 대응 방안 |
|--------|-------------|--------|-----------|
| **비밀코드 유출** | 중 (30%) | 높음 | 하루 1회 제한, IP/디바이스 중복 체크, 의심 계정 수동 검토 |
| **대량 보상 지급** | 낮 (15%) | 높음 | Circuit Breaker 임계값 모니터링, VaultLedger 실시간 확인 |
| **입금 미션 미달성** | 중 (40%) | 중 | 2/15 18:00 기준 달성률 30% 미만 시 입금 조건 하향 (10만원 → 5만원) |

---

### 6.2 운영적 리스크

| 리스크 | 발생 가능성 | 영향도 | 대응 방안 |
|--------|-------------|--------|-----------|
| **텔레그램 공지 실패** | 낮 (10%) | 중 | 수동 백업 공지 프로세스, 봇 상태 사전 확인 |
| **비밀코드 오타** | 낮 (5%) | 낮 | 대소문자 구분 없음 처리 (`code.upper()`), 공백 자동 제거 |
| **고객 문의 폭증** | 높음 (50%) | 낮 | FAQ 사전 준비, 텔레그램 봇 자동응답 설정 |

---

## 7. 성공 지표 (KPI)

### 7.1 핵심 지표

| 지표명 | 목표값 | 측정 방법 |
|--------|--------|-----------|
| **DAU 증가율** | +30% | 2/14~2/17 평균 DAU vs 2/7~2/10 평균 |
| **고액 입금 유저** | +50명 | 10만원 이상 입금 고유 유저 수 |
| **총 입금액** | +1억원 | 이벤트 기간 `cc_deposit` 합계 |
| **비밀코드 입력률** | 40% | 비밀코드 입력 유저 / 전체 참여 유저 |
| **4일 연속 달성률** | 15% | 연속 보너스 수령 유저 / 전체 참여 유저 |

---

## 8. FAQ

### Q1. 비밀코드는 어디서 확인하나요?
**A**: 매일 오전 10시, 씨씨카지노 공식 텔레그램 채널에서 공개됩니다. 채널 링크: [텔레그램 바로가기]

### Q2. 비밀코드를 잘못 입력했어요. 다시 입력할 수 있나요?
**A**: 입력 전에는 몇 번이든 다시 입력 가능하지만, 한 번 보상을 받으면 그날은 다시 입력할 수 없어요.

### Q3. 10만원/30만원 입금은 한 번에 해야 하나요?
**A**: 아니요! 당일(00:00~23:59) 누적 입금액 기준이므로 나눠서 입금해도 합산됩니다.

### Q4. 이벤트 미션을 놓쳤어요. 다음날 두 개 할 수 있나요?
**A**: 안타깝지만 각 미션은 해당 날짜에만 참여 가능합니다. 연속 보너스도 받을 수 없게 됩니다.

### Q5. 비밀코드와 미션 보상은 따로 받나요?
**A**: 네! 미션 완료 후 보상 받기 + 비밀코드 입력 보상은 별도로 지급됩니다.

---

## 9. 변경 로그

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-12 | v1.2 | **코드 정합성 반영**: DAY 2 복권+주사위(Bundle 21), DAY 3 Bundle 22, 스트릭 Bundle 25/EVENT_STREAK, SEOL777 복권 1장, API 경로 `/api/events/*`, FE 엔드포인트 수정, 배포 체크리스트 업데이트 | Claude Sonnet 4.5 |
| 2026-02-11 | v1.1 | 입금 조건 상향 (10만/30만), 세그먼트 차등 삭제, 비밀코드 시스템 추가 | Claude Sonnet 4.5 |
| 2026-02-11 | v1.0 | 초안 작성 | Claude Sonnet 4.5 |

---

**면책 조항**: 본 기획서는 현재 백엔드 시스템의 기술 스펙을 기반으로 작성되었으며, 실제 구현 전 개발팀 검토가 필요합니다.


-----
로컬 기록은 파일이 제외되었거나 너무 크지 않은 한 저장 시 최근 변경 내용을 추적합니다.
Walkthrough
4 minutes ago

Review
🔍 2026 Valentine & Seol Event — SOT 교차 검증 보고서
검증일: 2026-02-12 검증 범위: 이벤트 기획서 vs SOT 문서 vs 실제 코드베이스 결론: 🔴 배포 불가 — 치명적 설계 결함 3건 발견

검증 요약
등급	건수	상태
🔴 CRITICAL	3건	미해결
🟠 MAJOR	2건	미해결
🟡 WARNING	3건	확인 필요
✅ PASS	5건	정상
🔴 CRITICAL Issues (배포 차단)
C1. CC_DEPOSIT 미션 — delta=1 vs target_value=100000 불일치
CAUTION

입금 미션이 절대 완료될 수 없는 치명적 설계 결함입니다.

기획서 의도:

2/15 미션: CC_DEPOSIT, target_value=100000 (10만원 이상 입금)
2/17 미션: CC_DEPOSIT, target_value=300000 (30만원 이상 입금)
실제 코드 (
admin_cc_deposit_service.py:L353-356
):

python
mission_service.update_progress(
    user_id=row.user_id,
    action_type="CC_DEPOSIT",
    delta=1  # 입금 1회로 카운트 ← 금액이 아닌 "횟수"
)
문제: 
update_progress
는 current_value += delta로 동작합니다. delta=1이면 current_value는 1, 2, 3... 으로 증가하지만, target_value가 100,000이므로 10만번 입금해야 미션이 완료됩니다.

해결 방안 (택 1):

target_value를 1로 변경 → 입금 1회면 완료 (금액 검증은 별도 로직)
delta를 입금 금액으로 변경 → delta=deposit_delta 전달
별도 logic_key 핸들러 생성 → EVENT_SEOL_DAY1_2026용 커스텀 진행도 계산
C2. Bundle ID 21, 23 — 코드에 미정의
CAUTION

미션 보상 claim 시 빈 보상이 지급됩니다 (silent failure).

기획서 참조:

Bundle 21: 골드키 1개 + 주사위 3장 (2/16 DAY 2)
Bundle 23: 포인트 10,000P + 룰렛 2장 (2/15 DAY 1)
실제 코드 (
reward_service.py:L197-221
):

python
if reward_type in {"BUNDLE", "TICKET_BUNDLE"}:
    bundle_items = []
    if reward_amount == 3: ...
    elif reward_amount == 6: ...
    elif reward_amount == 7: ...
    elif reward_amount == 12: ...
    elif reward_amount == 15: ...
    elif reward_amount == 30: ...
    elif reward_amount == 20: ...
    elif reward_amount == 4: ...
    # ❌ reward_amount == 21, 23 분기 없음!
    
    for token_type, amount in bundle_items:  # bundle_items = [] → 루프 실행 안 됨
        self.grant_ticket(...)
    return  # 아무것도 지급하지 않고 종료
영향: 미션 완료 → claim → 
deliver(reward_type="BUNDLE", reward_amount=21)
 호출 → bundle_items=[] → 보상 0

C3. CONSECUTIVE_LOGIN 스트릭 — 이벤트 범위 비분리
CAUTION

기존 일반 연속 로그인과 이벤트 4일 연속 달성이 동일 카운터를 공유합니다.

기획서 의도:

2/14~2/17 4일 모두 이벤트 미션 완료 시 추가 보상
실제 코드 (
mission_service.py:L683-693
):

python
# ensure_login_progress에서 호출
service.update_progress(user_id, "CONSECUTIVE_LOGIN", delta=1)
문제점:

CONSECUTIVE_LOGIN은 일반적인 연속 로그인을 추적함
이벤트 미션(EVENT_SEOL_STREAK_2026)이 action_type="CONSECUTIVE_LOGIN"으로 설정됨
이벤트 전(2/13)부터 로그인하면 이미 streak이 쌓여 2/15에 4일 달성 가능
이벤트 미션만 완료하고 로그인만 했어도 카운트됨 → "모든 미션 완료" 조건 미반영
해결 방안:

별도 logic_key 핸들러로 "4일 모든 이벤트 미션 완료" 검증 로직 구현
또는 
reset_date
를 이벤트 시작일(2/14)로 고정
🟠 MAJOR Issues
M1. Bundle 15/20 수정 충돌
기획서 제안:

Bundle 15: 100,000P → 20,000P, 골드키 2개 → 1개
Bundle 20: 300,000P → 20,000P, 다이아몬드 3개 → 1개
현재 코드 상태: 원본 유지 (사용자가 변경 취소)

Bundle 15: 100,000P + 골드키 2개 (유지)
Bundle 20: 300,000P + 다이아몬드 3개 (유지)
결정 필요:

기획서의 수정안을 적용할 것인가? → 기존 레벨 보상에 영향
원본 유지하고 이벤트용 별도 Bundle ID 사용할 것인가?
M2. 마이그레이션 expires_at 타임존 불일치
기획서: '2026-02-14 23:59:59+09' (KST 명시) 마이그레이션: '2026-02-14 23:59:59' (타임존 없음 → UTC로 해석됨)

영향: 코드에서 datetime.now(pytz.timezone('Asia/Seoul'))로 비교하면, UTC 23:59:59는 KST 08:59:59가 되어 오전 9시 이후 코드가 만료 처리됨.

🟡 WARNING
W1. 비밀코드 API — pytz 의존성
기획서 코드 예시에서 import pytz 사용. 프로젝트는 zoneinfo 사용이 표준 (SOT 확인). pytz 대신 ZoneInfo("Asia/Seoul") 사용 권장.

W2. 비밀코드 reward_type GOLD_KEY_FRAGMENT — 지급 경로 확인 필요
reward_service.py
 ticket_map에 GOLD_KEY_FRAGMENT → GameTokenType.GOLD_KEY_FRAGMENT 매핑이 존재하여 정상 동작 가능. 단, 10개 자동합성 로직 확인 필요.

W3. MissionCategory.SPECIAL — 
_get_reset_date_str
 처리 미확인
SPECIAL 카테고리의 reset_date 포맷이 DAILY/WEEKLY와 다를 수 있음. 이벤트 미션이 start_date/end_date로 제한되므로 reset_date 충돌 가능성 낮지만 확인 필요.

✅ PASS (정상 항목)
항목	상태	근거
EventSecretCode
 모델	✅	FK, 고유 제약, 인덱스 정상
UserSecretCodeClaim
 모델	✅	중복 방지 UniqueConstraint 정상
Secret Code reward_type	✅	ROULETTE_TICKET, DICE_TICKET, POINT, GOLD_KEY_FRAGMENT 모두 ticket_map/
deliver
 경로 존재
VaultLedger 기록 경로	✅	
_grant_vault_locked
 → V2VaultService.deposit() 경로 정합
benefits_suspended
 체크	✅	
claim_reward()
에서 제재 유저 차단 로직 존재
권장 조치 우선순위
순위	이슈	조치
1	C1	CC_DEPOSIT delta를 금액으로 변경하거나 target_value=1로 조정
2	C2	Bundle 21/23 분기를 
reward_service.py
에 추가
3	C3	이벤트 스트릭 전용 logic_key 핸들러 구현
4	M1	Bundle 15/20 수정 여부 최종 결정
5	M2	마이그레이션 expires_at에 KST 타임존 명시

실제 진행된 수정내용
🔧 2026 Valentine & Seol Event — 결함 수정 완료 보고서
수정 요약
5건 모두 수정 완료. 기존 시스템(Bundle 15/20, 일반 스트릭) 영향 0.

적용된 수정 사항
C1. CC_DEPOSIT delta → 실제 금액
admin_cc_deposit_service.py

diff
-delta=1  # 입금 1회로 카운트
+delta=int(deposit_delta)  # 실제 입금 금액 전달
효과: 유저가 10만원 입금 → current_value += 100000 → target_value=100000 도달 → 미션 완료

C2+M1. 이벤트 전용 Bundle 추가 (기존 15/20 보존)
reward_service.py

Bundle ID	포인트	아이템	용도
21	0	골드키 1 + 주사위 3	DAY 2 (2/16)
22	20,000P	다이아몬드 1	DAY 3 (2/17)
23	10,000P	룰렛 2	DAY 1 (2/15)
25	20,000P	골드키 1	4일 연속 보너스
15	100,000P	골드키 2	원본 유지 (레벨)
20	300,000P	다이아몬드 3	원본 유지 (레벨)
C3. 이벤트 스트릭 전용 핸들러
mission_service.py:check_all_daily_completed

동작 방식:

미션 claim 후 
check_all_daily_completed(user_id)
 자동 호출
4개 이벤트 미션(EVENT_VALENTINE_2026, DAY1/2/3) 완료 수 카운트
EVENT_SEOL_STREAK_2026 미션의 current_value를 완료 수로 업데이트
4개 전부 완료 시 → streak 미션 완료 → claim 가능
일반 CONSECUTIVE_LOGIN과 완전 분리 — action_type을 EVENT_STREAK으로 변경.

M2. 마이그레이션 expires_at KST 타임존
migration

diff
-'2026-02-14 23:59:59'  ← UTC로 해석 → KST 오전 9시 만료
+'2026-02-14 23:59:59+09'  ← KST 자정까지 유효
미션 → 번들 최종 매핑
날짜	미션	action_type	target_value	Bundle
2/14	발렌타인 럭키박스	PLAY_GAME	3	3
2/15	설날 DAY 1	CC_DEPOSIT	100,000	23
2/16	설날 DAY 2	PLAY_GAME	5	21
2/17	설날 DAY 3	CC_DEPOSIT	300,000	22
연속	4일 달성 보너스	EVENT_STREAK	4	25
수정 파일 목록
파일	수정 내용
admin_cc_deposit_service.py
C1: delta=deposit_delta
reward_service.py
C2+M1: Bundle 21/22/23/25 추가
mission_service.py
C3: check_all_daily_completed + EVENT_STREAK alias
20260214_1000_...py	M1+M2: bundle 22/25, timezone +09

--------
백엔드 구현 상태 확인 결과
✅ 구현 완료 (7건)
항목	파일	상태
DB 모델 (EventSecretCode, UserSecretCodeClaim)	event_secret_code.py	✅
모델 Export	models/__init__.py	✅
마이그레이션 (테이블 + 시드 데이터)	20260214_1000_...py	✅
이벤트 번들 21/22/23/25	reward_service.py	✅
CC_DEPOSIT delta=금액 전달	admin_cc_deposit_service.py	✅
이벤트 스트릭 핸들러	mission_service.py	✅
expires_at KST 타임존	마이그레이션	✅
❌ 미구현 (1건)
항목	상태
Event API Route (POST /secret-code/claim)	❌ event_routes.py 파일 미생성
⚠️ 기획서 변경 vs 코드 불일치 (2건)
메시지에서 보내주신 수정된 2.1 표와 현재 코드가 다른 부분이 있습니다:

2/16 DAY 2 기본보상
기획서 수정본: 복권티켓 1장 + 주사위 3장
현재 코드 (Bundle 21): 골드키 1개 + 주사위 3장 ← 원본 기획서 기준
2/15 비밀코드 보상
기획서 수정본: 복권티켓 1장
현재 마이그레이션: GOLD_KEY_FRAGMENT 3개 ← 원본 기획서 기준
기획서 원본 파일(디스크)은 아직 원래 값(골드키+주사위, 골드키조각3)이 들어있고, 메시지에서 보내주신 표만 다릅니다. 어느 쪽이 최종 확정인가요?

정리: 결정 필요 사항
DAY 2 보상: 골드키 1 + 주사위 3 vs 복권 1 + 주사위 3 — 어느 쪽?
2/15 비밀코드: 골드키조각 3개 vs 복권티켓 1장 — 어느 쪽?
Event API Route (event_routes.py) 생성 진행할까요?
reward_service.py
Open
20260214_1000_event_valentine_seol_missions.py
Open
mission_service.py
Open
admin_cc_deposit_service.py
Open
DAY 2 보상: 복권 1 + 주사위 3
2/15 비밀코드  복권티켓 1장 
Event API Route (event_routes.py) 생성 진행하여 최종까지 쭉 이어서 작업해줘
먼저 단계별로 작업 완료시 
남은 단계 사용자에게 보고 및 문서 작성할것 