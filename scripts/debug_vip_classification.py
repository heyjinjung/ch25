import json
import re

TARGET_USERS = ["최정윤", "신자원", "고재우", "이용운", "권오석", "이헌주", "라라뿌", "눈물샤워", "배곧재우", "성민이", "고고천사", "행쥬"]

def analyze_targets(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    
    print(f"🔎 Scanning {len(chats)} chats for targets...")

    for chat in chats:
        name = chat.get('name') or ""
        
        # Check if this chat is one of the targets
        is_target = False
        for t in TARGET_USERS:
            if t in name:
                is_target = True
                break
        
        if not is_target: continue

        print(f"\n🎯 FOUND TARGET: {name}")
        print("="*40)
        
        messages = chat.get('messages', [])
        # Print last 20 messages to see context
        for msg in messages[-20:]:
            if msg.get('type') != 'message': continue
            text = msg.get('text', '')
            if isinstance(text, list):
                text = "".join([t['text'] if isinstance(t, dict) else str(t) for t in text])
            
            sender = msg.get('from', 'Unknown')
            print(f"[{sender}] {text}")

if __name__ == "__main__":
    analyze_targets(r"c:\Users\JAVIS\ch\ch25\docs\06_ops\202601\response_templates\result.json")
