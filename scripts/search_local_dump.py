import json

def main():
    try:
        with open("users_dump.json", "r", encoding="utf-16") as f:
            content = f.read()
    except UnicodeError:
        with open("users_dump.json", "r", encoding="utf-8") as f:
            content = f.read()
        
    try:
        users = json.loads(content)
    except:
        # Try finding [ ... ]
        start = content.find("[")
        end = content.rfind("]")
        if start != -1 and end != -1:
            users = json.loads(content[start:end+1])
        else:
            print("Could not parse JSON")
            return

    # Targets
    targets = ["효시리", "정우성", "persipic"] 
    # Also valid korean name parts? But DB doesn't have name.
    
    print(f"Loaded {len(users)} users.")
    
    for u in users:
        nick = u.get("nickname") or ""
        ext = u.get("external_id") or ""
        tg = u.get("telegram_username") or ""
        
        # Check targets
        for t in targets:
            if t in nick or t in ext or t in tg:
                print(f"MATCH {t} -> {u}")

if __name__ == "__main__":
    main()
