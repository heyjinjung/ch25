import re
import json

SQL_FILE = r"c:\Users\JAVIS\ch\ch25\backup_20260114_v2.sql"
OUTPUT_FILE = r"v1_shop_dump.json"

def extract_shop_products():
    print(f"Reading {SQL_FILE}...")
    with open(SQL_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Generic regex for ANY insert into app_ui_config
    # We want to capture the JSON part specifically for 'shop_products' key.
    # The format in SQL: VALUES (..., 'shop_products', '{JSON}', ...)
    
    # Let's try to match the specific key first
    # VALUES (..., 'shop_products', ' <JSON> ', ...)
    
    # Regex explanation:
    # 'shop_products' \s*,\s* ' (.*?) '
    # We use non-greedy matching for the JSON string, stopping at the next quote comma
    # But JSON can contain escaped quotes.
    
    # Simpler approach: Find the index of 'shop_products' and work from there.
    
    idx = content.find("'shop_products'")
    if idx == -1:
        print("Key 'shop_products' not found.")
        return

    print(f"Found 'shop_products' at index {idx}")
    
    # The structure should be: 'shop_products', '{...}'
    # So we look for the next starting quote after the comma
    
    start_search = idx + len("'shop_products'")
    json_start = content.find("'{", start_search)
    
    if json_start == -1:
        print("Could not find JSON start '{")
        return
        
    # We need to find the matching closing quote ' that is followed by , or )
    # But since it's a huge file, let's try to parse it carefully.
    # SQL dumps usually escape single quotes inside the string as \', or ''
    
    # We will walk forward until we find ' that is NOT escaped.
    # Actually, simpler: in standard mysqldump, it's usually just escaped '
    
    current_pos = json_start + 1 # Skip the opening '
    json_chars = []
    
    while current_pos < len(content):
        char = content[current_pos]
        
        if char == "'":
            # Check if escaped
            # If it's '' (standard SQL escape) or \' (MySQL specific sometimes)
            # We need to look back?
            # Mysql dump usually uses backslash escape for strings if generated with certain options
            # OR doubled single quotes.
            
            # Let's check the next char
            if current_pos + 1 < len(content) and content[current_pos+1] == "'":
                # It's an escaped quote '' -> literal '
                json_chars.append("'")
                current_pos += 2
                continue
                
            # Check backslash
            if content[current_pos-1] == '\\':
                 # It was escaped by backslash? But we are iterating...
                 # We need to handle backslash separately.
                 pass
            
            # If not escaped, it's the end of the string
            # But wait, looking at the previous output, it was standard JSON.
            
            # Let's assume it's the end if followed by , or )
            next_snippet = content[current_pos+1:current_pos+10]
            if next_snippet.strip().startswith(",") or next_snippet.strip().startswith(")"):
                 break # End of string
            
        if char == "\\":
            # potential escape
            if current_pos + 1 < len(content):
                next_c = content[current_pos+1]
                if next_c == "'":
                    json_chars.append("'")
                    current_pos += 2
                    continue
                if next_c == '"':
                    json_chars.append('"')
                    current_pos += 2
                    continue
                if next_c == '\\':
                    json_chars.append('\\')
                    current_pos += 2
                    continue
                    
        json_chars.append(char)
        current_pos += 1

    raw_json = "".join(json_chars)
    
    # Remove SQL escapes if any remained (like \\n -> \n)
    raw_json = raw_json.replace("\\r", "").replace("\\n", "")
    
    # Try multiple cleanup strategies if load fails
    try:
        data = json.loads(raw_json)
        print("Success: JSON parsed.")
    except Exception as e:
        print(f"Warning: Direct JSON parse failed: {e}")
        # Try unescaping double backslashes
        try:
            raw_json_fixed = raw_json.replace('\\"', '"')
            data = json.loads(raw_json_fixed)
            print("Success: JSON parsed after fixing quotes.")
        except:
            print("Failed to parse JSON. Saving raw string.")
            data = {"raw": raw_json}

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    extract_shop_products()
