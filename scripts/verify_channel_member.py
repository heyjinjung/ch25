import sys
import os
import argparse
import asyncio
import httpx
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings

async def verify_telegram_member(user_id: int, channel_username: str = None):
    settings = get_settings()
    bot_token = settings.telegram_bot_token
    target_channel = channel_username or settings.telegram_channel_username

    print(f"🔍 DEBUG: Manual Telegram Verification")
    print(f"   Bot Token: {'Present' if bot_token else 'MISSING'}")
    print(f"   Target Channel: {target_channel}")
    print(f"   Target User ID: {user_id}")

    if not bot_token:
        print("❌ Error: TELEGRAM_BOT_TOKEN is not configured in env.")
        return

    if not target_channel:
        print("❌ Error: TELEGRAM_CHANNEL_USERNAME is not configured.")
        return

    url = f"https://api.telegram.org/bot{bot_token}/getChatMember"
    params = {"chat_id": target_channel, "user_id": user_id}

    print(f"   Requesting: {url} with params={params}")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10)
            data = resp.json()
            
            print(f"   Response Status: {resp.status_code}")
            print(f"   Response Body: {data}")

            if data.get("ok"):
                status = data.get("result", {}).get("status")
                print(f"✅ SUCCESS: User status is '{status}'")
                if status in ["creator", "administrator", "member", "restricted"]:
                    print("   👉 CONCLUSION: User IS a member. (Verification should PASS)")
                else:
                    print("   👉 CONCLUSION: User is NOT a member (left/kicked).")
            else:
                print(f"❌ API ERROR: {data.get('description')}")
                print("   Possible Reasons:")
                print("   1. Bot is not an Admin in the channel.")
                print("   2. Channel ID/Username is wrong.")
                print("   3. User ID does not exist.")

    except Exception as e:
        print(f"❌ EXCEPTION: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("user_id", type=int, help="Telegram User ID (Active Number)")
    parser.add_argument("--channel", type=str, default=None, help="Channel Username (optional override)")
    args = parser.parse_args()
    
    asyncio.run(verify_telegram_member(args.user_id, args.channel))
