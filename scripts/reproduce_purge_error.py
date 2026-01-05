import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

def test_imports():
    print("Testing imports inside purge_user...")
    try:
        from app.models import (
            AdminMessageInbox,
            ExternalRankingData,
            ExternalRankingRewardLog,
            RankingDaily,
            SeasonPassProgress,
            SeasonPassRewardLog,
            SeasonPassStampLog,
            TeamEventLog,
            TeamMember,
            TrialTokenBucket,
            UserActivity,
            UserActivityEvent,
            UserCashLedger,
            UserEventLog,
            UserGameWallet,
            UserGameWalletLedger,
            UserIdempotencyKey,
            UserInventoryItem,
            UserInventoryLedger,
            UserMissionProgress,
            VaultEarnEvent,
            VaultWithdrawalRequest,
        )
        print("Success! All models imported from app.models.")
    except ImportError as e:
        print(f"ImportError: {e}")
        # Print detailed traceback if needed, but ImportError usually has a clear message
    except Exception as e:
        print(f"Other Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_imports()
