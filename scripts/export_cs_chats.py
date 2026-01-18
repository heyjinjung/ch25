import asyncio
import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from telethon import TelegramClient

# ==========================================
# 🔧 설정 (Settings)
# ==========================================
# 1. 텔레그램 공홈(my.telegram.org)에서 발급받은 정보 입력
#    또는 실행 시 입력 가능
API_ID = None      # 예: 1234567
API_HASH = None    # 예: "0123456789abcdef..."

# 2. 세션 파일 저장 경로
SESSION_NAME = "mysession"

# 3. 데이터 수집 범위 (일수)
DAYS_TO_LOOK_BACK = 7

# ==========================================

async def main():
    print("🚀 Telegram CS Export Tool")
    print("--------------------------------")

    # 1. Credentials Check
    api_id = API_ID or os.getenv("TG_API_ID")
    api_hash = API_HASH or os.getenv("TG_API_HASH")

    if not api_id or not api_hash:
        print("ℹ️  API 정보가 없습니다. (my.telegram.org 에서 발급 필요)")
        api_id = input("👉 Enter API ID: ").strip()
        api_hash = input("👉 Enter API Hash: ").strip()

    if not api_id or not api_hash:
        print("❌ API 정보가 없으면 진행할 수 없습니다.")
        return

    # 2. Client Setup
    client = TelegramClient(SESSION_NAME, int(api_id), api_hash)
    
    print("\n🔐 Connecting to Telegram...")
    await client.start()
    
    me = await client.get_me()
    print(f"✅ Logged in as: {me.first_name} (@{me.username})")

    # 3. Collect Chats
    print("\n📦 Fetching recent chats (Users only)...")
    
    cutoff_date = datetime.utcnow() - timedelta(days=DAYS_TO_LOOK_BACK)
    data = []

    # Iterate Dialogs
    async for dialog in client.iter_dialogs(limit=None):
        # CS는 보통 1:1 대화이므로 User만 필터링 (필요시 Chat, Channel 포함 가능)
        if not dialog.is_user:
            continue
            
        # 봇 제외 (선택사항)
        if dialog.entity.bot:
            continue
            
        # 날짜 필터 (최근 대화가 없으면 스킵)
        if dialog.date.replace(tzinfo=None) < cutoff_date:
            continue

        target_name = dialog.name
        target_username = getattr(dialog.entity, 'username', 'N/A')
        
        print(f"   scanning: {target_name} (@{target_username})...")

        # Fetch Messages
        async for msg in client.iter_messages(dialog.entity, limit=50): # 최근 50개만
            if not msg.date:
                continue
                
            msg_date = msg.date.replace(tzinfo=None)
            if msg_date < cutoff_date:
                break
            
            # 내가 보낸 건지, 상대가 보낸 건지
            sender_type = "ME" if msg.out else "USER"
            
            data.append({
                "Date": msg_date.strftime("%Y-%m-%d %H:%M:%S"),
                "User Name": target_name,
                "User ID": dialog.entity.id,
                "Username": target_username,
                "Sender": sender_type,
                "Message": msg.text or "[Media/Sticker]"
            })

    # 4. Export
    if not data:
        print("\n⚠️  No messages found within the lookup period.")
        return

    df = pd.DataFrame(data)
    df = df.sort_values(by=["User Name", "Date"])
    
    filename = f"cs_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    df.to_csv(filename, index=False, encoding="utf-8-sig")
    
    print(f"\n✅ Export Complete!")
    print(f"   File: {os.path.abspath(filename)}")
    print(f"   Total Messages: {len(df)}")

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⛔ Cancelled.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
