import os
import re

DIR = r"c:\Users\task2\git\ch25\src\admin\api"

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Regex to capture the method call and the URL string.
    # Updated to include backticks (`) for template literals.
    pattern = re.compile(r'(adminApi\.(?:get|post|put|delete|patch|request)(?:<[^>]+>)?\s*\(\s*)(["\'`])((?!/admin/api)[^"\'`]+)(["\'`])')
    
    def replacer(match):
        prefix_code = match.group(1)
        quote = match.group(2)
        path = match.group(3)
        end_quote = match.group(4)
        
        if path.startswith("http"):
            return match.group(0)

        # Remove leading slash
        clean_path = path.lstrip("/")
        
        # If valid admin/api already (and not caught by lookahead for some reason), skip
        if clean_path.startswith("admin/api"):
            return match.group(0)

        # If it starts with 'api/', assume it was a legacy path and replace with 'admin/api/'
        if clean_path.startswith("api/"):
             clean_path = clean_path[4:] 
             
        new_path = f"/admin/api/{clean_path}"
        
        return f'{prefix_code}{quote}{new_path}{end_quote}'

    new_content = pattern.sub(replacer, content)
    
    if new_content != content:
        print(f"Fixed {filepath}")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)

if __name__ == "__main__":
    if os.path.exists(DIR):
        for filename in os.listdir(DIR):
            if filename.endswith(".ts") and filename != "httpClient.ts":
                fix_file(os.path.join(DIR, filename))
    else:
        print(f"Directory {DIR} not found.")
