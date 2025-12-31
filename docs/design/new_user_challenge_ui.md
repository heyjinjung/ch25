# 신규 유저 챌린지 UI 설계서 (New User Challenge UI Design)

## 디자인 컨셉 (기존 유지)
- **테마**: 다크 모드 베이스 (`#0a0a0a` ~ `#1a1a1a`)
- **액센트**: `#91F402` (Lime/Neon Green)
- **글래스모피즘**: `backdrop-blur`, 반투명 배경 (`rgba(255,255,255,0.05)`)
- **타이포**: Inter/Pretendard, Bold 위주
- **마이크로 애니메이션**: Framer Motion 또는 CSS Keyframes

---

## 컴포넌트 구조

### 1. `NewUserChallengeCard` (메인 컨테이너)
**위치**: `MissionList.tsx` 상단 또는 별도 페이지

```
┌─────────────────────────────────────────────────┐
│  🎁 신규 유저 챌린지                   [23:45:12] │
│  ─────────────────────────────────────────────  │
│  잠금 보너스: ₩10,000                           │
│  ├── ✅ 해금됨: ₩2,500 (25%)                   │
│  └── 🔒 잠금: ₩7,500 (75%)                    │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░] 25%       │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎮 첫 게임 플레이        ✅ 완료         │   │
│  │    1/1 • +₩2,500 해금                   │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 🏆 게임 마스터 (3회)     ⏳ 진행 중       │   │
│  │    1/3 • +₩2,500 해금                   │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 👥 커뮤니티 함께하기     🔒 미완료       │   │
│  │    0/1 • +₩2,500 해금                   │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 📅 2일차 출석 체크       🔒 미완료       │   │
│  │    0/1 • +₩2,500 해금                   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 스타일 가이드

### 카드 컨테이너
```css
.challenge-card {
    background: linear-gradient(135deg, rgba(145, 244, 2, 0.1), transparent);
    border: 1px solid rgba(145, 244, 2, 0.3);
    border-radius: 16px;
    padding: 20px;
    backdrop-filter: blur(10px);
}
```

### 타이머 (24시간 카운트다운)
```css
.timer {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #ff6b6b;
    animation: pulse 1s infinite;
}
```

### 진행률 바
```css
.progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #91F402, #7fdc00);
    transition: width 0.5s ease;
}
```

### 미션 아이템
```css
.mission-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.mission-item.completed {
    border-color: rgba(145, 244, 2, 0.5);
    background: rgba(145, 244, 2, 0.05);
}

.mission-item.in-progress {
    border-color: rgba(255, 193, 7, 0.5);
}
```

---

## 데이터 구조

### API Response (`/api/mission/list`)
```json
{
    "new_user_challenge": {
        "is_eligible": true,
        "locked_balance": 10000,
        "unlocked_amount": 2500,
        "expires_at": "2024-12-31T12:00:00Z",
        "missions": [
            {
                "id": 1,
                "title": "첫 게임 플레이",
                "category": "NEW_USER",
                "reward_type": "CASH_UNLOCK",
                "reward_amount": 2500,
                "progress": { "current": 1, "target": 1, "is_completed": true, "is_claimed": true }
            }
        ]
    }
}
```

---

## 구현 파일

| 파일 | 설명 |
|------|------|
| `src/components/mission/NewUserChallengeCard.tsx` | 메인 컴포넌트 |
| `src/components/mission/ChallengeTimer.tsx` | 24시간 카운트다운 |
| `src/components/mission/ChallengeProgress.tsx` | 진행률 바 |
| `src/stores/missionStore.ts` | `new_user_challenge` 상태 추가 |

---

## 사용자 시나리오

1. **신규 유저 진입**: `is_new_user=true` → 자동으로 10,000원 잠금 지급
2. **미션 페이지 진입**: `NEW_USER` 카테고리 미션만 "신규 유저 챌린지" 섹션에 표시
3. **게임 플레이**: 미션 진행률 증가 → 완료 시 `CASH_UNLOCK` 보상 수령 가능
4. **보상 수령**: `locked_balance` 감소 → `cash_balance` 증가 → UI 갱신
5. **24시간 만료**: 타이머 종료 시 남은 잠금 금액 소멸 (또는 안내 모달)

---

## Telegram Mini App 네이티브 기능 활용

### 1. HapticFeedback (진동)
미션 완료/보상 수령 시 햅틱 피드백으로 만족감 제공.

```typescript
// 미션 완료 시
Telegram.WebApp.HapticFeedback.notificationOccurred('success');

// 보상 수령 시
Telegram.WebApp.HapticFeedback.impactOccurred('medium');
```

### 2. MainButton (하단 버튼)
보상 수령 가능 시 MainButton 활성화.

```typescript
// 수령 가능 미션 있을 때
Telegram.WebApp.MainButton.setText('보상 받기 (+₩2,500)');
Telegram.WebApp.MainButton.show();
Telegram.WebApp.MainButton.onClick(() => claimReward(missionId));

// 수령 후
Telegram.WebApp.MainButton.hide();
```

### 3. BackButton (뒤로가기)
챌린지 상세 화면에서 활성화.

```typescript
Telegram.WebApp.BackButton.show();
Telegram.WebApp.BackButton.onClick(() => navigate('/mission'));
```

### 4. shareToTelegram (스토리 공유)
"커뮤니티 함께하기" 미션 달성을 위한 공유 기능.

```typescript
const shareChallenge = () => {
    // 스토리 공유 UX (Telegram 미지원 시 클립보드 복사)
    const shareText = `🎮 신규 유저 챌린지 ${unlockPercent}% 달성! 참여하기: https://t.me/${BOT_USERNAME}/${WEBAPP_SHORT_NAME}`;
    
    if (Telegram.WebApp.shareToStory) {
        // Telegram Story 공유 (일부 버전에서 지원)
        Telegram.WebApp.shareToStory({ media_type: 'photo', ... });
    } else {
        // Fallback: 텍스트 공유
        navigator.clipboard.writeText(shareText);
        toast.success('공유 링크가 복사되었습니다!');
    }
};
```

### 5. openTelegramLink (채널 입장)
"커뮤니티 함께하기" 미션의 채널 입장 버튼.

```typescript
const joinChannel = () => {
    Telegram.WebApp.openTelegramLink('https://t.me/your_channel_name');
    // 3초 후 미션 진행 상태 폴링 (서버에서 채널 가입 확인)
    setTimeout(() => checkMissionProgress(), 3000);
};
```

---

## 추가 UX 권장사항

### 애니메이션
- 잠금 해금 시: 코인이 잠금에서 지갑으로 이동하는 Lottie 애니메이션
- 타이머 만료 임박 (1시간 이내): 빨간색 펄스 + 햅틱 알림

### 접근성
- 모든 인터랙티브 요소에 `aria-label` 추가
- 고대비 모드 지원 (텔레그램 테마 감지)

### 오프라인 처리
- 네트워크 끊김 시 캐시된 미션 데이터 표시
- 재연결 시 자동 동기화
