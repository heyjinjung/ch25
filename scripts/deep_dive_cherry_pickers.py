import json
import os
import re
from datetime import datetime, timedelta

def deep_dive_cherry(json_path: str, output_file: str, days: int = 60):
    print(f"📂 Loading JSON file: {json_path}...")
    
    if not os.path.exists(json_path):
        print("❌ File not found!")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats_list = data.get('chats', {}).get('list', [])
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    # Detect Owner ID (ME)
    my_id_marker = "user_unknown"
    user_id = data.get('personal_information', {}).get('user_id')
    if not user_id:
        for c in chats_list:
            if c.get('type') == 'saved_messages':
                user_id = c.get('id')
                break
    if user_id: my_id_marker = f"user{user_id}"

    # Cherry Picker Definition Patterns
    CHERRY_PATTERNS = [r"꽁", r"무료", r"체험", r"쿠폰", r"코드", r"기프티콘", r"문상", r"가입비", r"지원금", r"입플", r"찍먹", r"간보기"]
    VIP_PATTERNS = [r"충전", r"입금", r"배팅", r"출금", r"환전", r"올인", r"재입", r"감사", r"수익"]

    # Sub-Classification Patterns (Behavior Types)
    BEHAVIORS = {
        "CODE_HUNTER": [r"코드", r"쿠폰", r"번호", r"이벤트"],
        "BEGGAR": [r"주세요", r"좀", r"서비스", r"거지", r"한번만", r"포인트"],
        "PROCESS_POKER": [r"출금", r"환전", r"되나요", r"가능", r"입금없이", r"무조건"],
        "COMPLAINER": [r"왜", r"안됨", r"안줌", r"사기", r"장난"]
    }

    classified_logs = {k: [] for k in BEHAVIORS.keys()}
    classified_logs["UNCATEGORIZED"] = []

    print("🕵️‍♂️ Analyzing Cherry Picker Dialogues...")
    
    count = 0 

    for chat in chats_list:
        if chat.get('type') != 'personal_chat': continue
        
        chat_name = chat.get('name', 'Unknown')
        messages = chat.get('messages', [])
        
        # 1. Identify if Cherry Picker
        # (Must have Cherry keywords, Must NOT have VIP keywords)
        cherry_score = 0
        vip_score = 0
        user_text_blob = ""
        
        relevant_msgs = []

        for msg in messages:
            if msg.get('type') != 'message': continue
            if msg.get('date') < cutoff_date: continue
            
            raw_text = msg.get('text', '')
            if isinstance(raw_text, list):
                raw_text = "".join([t['text'] if isinstance(t, dict) else str(t) for t in raw_text])
            text_str = str(raw_text)
            
            # Record Dialogue
            from_name = msg.get('from', 'Unknown')
            from_id = msg.get('from_id', '')
            
            # Determine if ME (Strict)
            is_me = (from_id == my_id_marker)
             # Fallback: If no ID, but 'out' is true
            if not is_me and msg.get('out') is True: is_me = True
            
            formatted_line = f"[{from_name}] {text_str}"
            relevant_msgs.append(formatted_line)

            if not is_me:
                user_text_blob += text_str + " "
                for p in CHERRY_PATTERNS:
                    if re.search(p, text_str): cherry_score += 1
                for p in VIP_PATTERNS:
                    if re.search(p, text_str): vip_score += 1

        # Logic: High Cherry, No VIP
        if cherry_score > 0 and vip_score == 0:
            count += 1
            
            # 2. Classify Behavior Type
            my_type = "UNCATEGORIZED"
            for b_key, b_pats in BEHAVIORS.items():
                for p in b_pats:
                    if re.search(p, user_text_blob):
                        my_type = b_key
                        break
                if my_type != "UNCATEGORIZED": break
            
            # Format Output
            dialogue_snippet = "\n".join(relevant_msgs[-10:]) # Last 10 messages
            entry = f"## 👤 {chat_name} (Total Msgs: {len(relevant_msgs)})\n"
            entry += f"**Behavior**: {my_type}\n"
            entry += "```\n" + dialogue_snippet + "\n```\n"
            entry += "-"*40 + "\n"
            
            classified_logs[my_type].append(entry)

    # Write Report
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"# 🍒 Cherry Picker Deep Dive Report\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"Total Identified: {count}\n\n")
        
        for b_key, entries in classified_logs.items():
            if not entries: continue
            f.write(f"\n# 📂 Type: {b_key} ({len(entries)} Users)\n")
            f.write("="*60 + "\n")
            for e in entries:
                f.write(e)

    print(f"\n✅ Deep Dive Complete! Analyzed {count} Cherry Pickers.")
    print(f"📄 Report Saved: {output_file}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, default="docs/06_ops/202601/response_templates/result.json")
    parser.add_argument("--output", type=str, default="docs/06_ops/202601/response_templates/cherry_dialogues.md")
    args = parser.parse_args()
    
    deep_dive_cherry(args.input, args.output)
