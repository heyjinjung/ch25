# app/api/admin/routes/admin_reward_types.py
"""Admin endpoints for reward type definitions."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.deps import get_current_admin_id

router = APIRouter(
    prefix="/admin/api/reward-types",
    tags=["admin-reward-types"]
)


class RewardTypeDefinition(BaseModel):
    """Reward type with display metadata."""
    key: str
    display_name: str
    icon: str
    color: str
    category: str
    description: str


class RewardTypesListResponse(BaseModel):
    reward_types: list[RewardTypeDefinition]


# Static reward type definitions based on GameTokenType enum
REWARD_TYPE_DEFINITIONS = [
    {
        "key": "ROULETTE_COIN",
        "display_name": "룰렛 코인",
        "icon": "Coins",
        "color": "#F59E0B",
        "category": "게임 토큰",
        "description": "룰렛 게임에서 사용하는 코인"
    },
    {
        "key": "DICE_TOKEN",
        "display_name": "주사위 토큰",
        "icon": "Dices",
        "color": "#10B981",
        "category": "게임 토큰",
        "description": "주사위 게임에서 사용하는 토큰"
    },
    {
        "key": "TRIAL_TOKEN",
        "display_name": "체험 토큰",
        "icon": "Gift",
        "color": "#8B5CF6",
        "category": "게임 토큰",
        "description": "신규 유저에게 지급되는 체험용 토큰"
    },
    {
        "key": "LOTTERY_TICKET",
        "display_name": "복권 티켓",
        "icon": "Ticket",
        "color": "#EC4899",
        "category": "게임 토큰",
        "description": "복권 게임에서 사용하는 티켓"
    },
    {
        "key": "GOLD_KEY",
        "display_name": "골드 키",
        "icon": "Key",
        "color": "#EAB308",
        "category": "금고 키",
        "description": "골드 금고를 개방할 수 있는 키"
    },
    {
        "key": "DIAMOND_KEY",
        "display_name": "다이아몬드 키",
        "icon": "KeyRound",
        "color": "#06B6D4",
        "category": "금고 키",
        "description": "다이아몬드 금고를 개방할 수 있는 키"
    },
    {
        "key": "DIAMOND",
        "display_name": "다이아몬드",
        "icon": "Gem",
        "color": "#0EA5E9",
        "category": "미션 보상",
        "description": "미션 완료 시 지급되는 프리미엄 화폐"
    },
    {
        "key": "VOUCHER_GOLD_KEY_1",
        "display_name": "골드 키 교환권",
        "icon": "Key",
        "color": "#EAB308",
        "category": "교환권",
        "description": "사용 시 골드 키 1개를 획득합니다."
    },
    {
        "key": "VOUCHER_DIAMOND_KEY_1",
        "display_name": "다이아몬드 키 교환권",
        "icon": "KeyRound",
        "color": "#06B6D4",
        "category": "교환권",
        "description": "사용 시 다이아몬드 키 1개를 획득합니다."
    },
    {
        "key": "VOUCHER_ROULETTE_COIN_1",
        "display_name": "룰렛 코인 교환권",
        "icon": "Coins",
        "color": "#F59E0B",
        "category": "교환권",
        "description": "사용 시 룰렛 코인 1개를 획득합니다."
    },
    {
        "key": "VOUCHER_DICE_TOKEN_1",
        "display_name": "주사위 토큰 교환권",
        "icon": "Dices",
        "color": "#10B981",
        "category": "교환권",
        "description": "사용 시 주사위 토큰 1개를 획득합니다."
    },
    {
        "key": "VOUCHER_LOTTERY_TICKET_1",
        "display_name": "복권 티켓 교환권",
        "icon": "Ticket",
        "color": "#EC4899",
        "category": "교환권",
        "description": "사용 시 복권 티켓 1개를 획득합니다."
    },
    {
        "key": "GIFTICON_BAEMIN",
        "display_name": "배민 기프티콘",
        "icon": "Gift",
        "color": "#2AC1BC",
        "category": "기프티콘",
        "description": "배달의민족 상품권"
    },
    {
        "key": "GIFTICON_COMPOSE",
        "display_name": "컴포즈커피 기프티콘",
        "icon": "Coffee",
        "color": "#FBBF24",
        "category": "기프티콘",
        "description": "컴포즈커피 아메리카노 교환권"
    },
    {
        "key": "GIFTICON_CC_COIN",
        "display_name": "씨씨코인 기프티콘",
        "icon": "Gift",
        "color": "#6366F1",
        "category": "기프티콘",
        "description": "씨씨코인 교환 가능한 상품권"
    }
]


@router.get("", response_model=RewardTypesListResponse)
@router.get("/", response_model=RewardTypesListResponse)
def list_reward_types() -> RewardTypesListResponse:
    """Get all reward type definitions with display metadata."""
    return RewardTypesListResponse(
        reward_types=[RewardTypeDefinition(**rt) for rt in REWARD_TYPE_DEFINITIONS]
    )
