import os
import json
import time
import sys
import urllib.request
import urllib.parse

def request_api(url, method='GET', data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f"Request failed: {e}")
        return {}

token = os.getenv("TELEGRAM_BOT_TOKEN")
if not token:
    print("Error: TELEGRAM_BOT_TOKEN not found in environment")
    sys.exit(1)

base_url = f"https://api.telegram.org/bot{token}"
webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL")

print(f"--- Telegram Channel ID Finder (urllib) ---")

# 1. Delete Webhook (Required to use getUpdates)
print(f"1. Temporarily deleting webhook...")
request_api(f"{base_url}/deleteWebhook", method='POST')

print("   Waiting 2s for propagation...")
time.sleep(2)

# 2. Get Updates
print("2. Fetching recent updates...")
updates = request_api(f"{base_url}/getUpdates")

# 3. Restore Webhook (Critical!)
print("3. Restoring webhook...")
if webhook_url:
    request_api(f"{base_url}/setWebhook", method='POST', data={"url": webhook_url})
    print(f"   Webhook attempted restore to: {webhook_url}")
else:
    print("   ⚠️ TELEGRAM_WEBHOOK_URL not found, webhook NOT restored!")

# 4. Parse and Print Results
print("\n--- Results ---")
found = False
if updates.get("result"):
    for u in reversed(updates["result"]):
        chat = None
        # Check various update types where channel might appear
        if "message" in u and "chat" in u["message"]:
            chat = u["message"]["chat"]
        elif "channel_post" in u and "chat" in u["channel_post"]:
            chat = u["channel_post"]["chat"]
        elif "my_chat_member" in u and "chat" in u["my_chat_member"]:
            chat = u["my_chat_member"]["chat"]
            
        if chat and chat["type"] in ["channel", "supergroup"]:
            title = chat.get("title", "Unknown")
            print(f"✅ FOUND CHANNEL: \"{title}\"")
            print(f"➡️ ID: {chat['id']}")
            found = True
            break 

if not found:
    print("❌ No channel messages found.")
    print("   Please send a message (e.g., 'test') to your channel and run this script again.")
    # Debug info
    if updates.get("result"):
        print("   Debug: Last update raw:", json.dumps(updates["result"][-1]))
