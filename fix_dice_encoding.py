import os

def fix_dice_page():
    path = r'c:\Users\JAVIS\ch\ch25\src\v2\pages\game\DicePage.tsx'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Replace corrupted pattern found in previous read
    content = content.replace('?이??준비중', '아이템 준비중')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {path}")

if __name__ == "__main__":
    fix_dice_page()
