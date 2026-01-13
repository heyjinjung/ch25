# Restore Korean labels
import re

# Read current file
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Define the correct LABELS object with proper Korean
labels_replacement = '''const LABELS = {
    pageTitle: "코인/티켓 관리",
    pageDescription: "게임 티켓을 지급/회수하고 플레이 로그 및 원장을 관리합니다.",
    refresh: "새로고침",

    tabGrant: "지급/회수",
    tabPlayLogs: "플레이 로그",
    tabLedger: "원장 로그",
    tabUserLookup: "유저 조회",

    statGrantToday: "오늘 지급",
    statRevokeToday: "오늘 회수",
    statActiveHolders: "보유 유저",

    labelUserId: "유저 식별자",
    labelUserIdPlaceholder: "External ID / 닉네임 / @텔레그램",
    labelTokenType: "티켓 종류",
    labelAmount: "수량",
    labelReason: "사유 (선택)",
    labelReasonPlaceholder: "지급/회수 사유 입력...",

    btnGrant: "지급",
    btnRevoke: "회수",
    btnProcessing: "처리 중..",
    btnResetFilter: "초기화",

    filterAll: "전체",
    filterUser: "유저 검색",
    filterGameType: "게임 종류",
    filterTokenType: "티켓 종류",
    filterRewardType: "보상 종류",
    filterDeltaDirection: "변동방향",
    filterDeltaPlus: "지급(+)",
    filterDeltaMinus: "차감 (-)",
    sortBy: "정렬",
    sortTimeDesc: "최신순",
    sortTimeAsc: "오래된순",
    sortAmountDesc: "금액높은순",
    sortAmountAsc: "금액낮은순",

    colTime: "시간",
    colUser: "유저",
    colGame: "게임",
    colRewardType: "보상 종류",
    colRewardAmount: "보상량",
    colTokenType: "티켓",
    colDelta: "변동",
    colBalanceAfter: "잔액",
    colReason: "사유",

    gameRoulette: "룰렛",
    gameDice: "주사위",
    gameLottery: "복권",

    loading: "불러오는 중..",
    noData: "데이터 없음",
    error: "불러오기 실패",
} as const;'''

# Replace the corrupted LABELS
content = re.sub(
    r'const LABELS = \{[^}]+\} as const;',
    labels_replacement,
    content,
    flags=re.DOTALL
)

# Write back
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'w', encoding='utf-8-sig') as f:
    f.write(content)

print("Restored Korean LABELS text")
