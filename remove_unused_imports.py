# Remove unused imports
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track which imports to remove
unused_imports = [
    'Search',
    'ChevronLeft', 
    'ChevronRight',
    'fetchLedgerByUserId',
    'fetchWalletsByUserId',
    'LedgerEntry',
    'PlayLogEntry', 
    'TokenBalance',
    'UserWalletSummary'
]

new_lines = []
for line in lines:
    # Check if this is an import line containing unused imports
    if 'import' in line:
        # Remove unused imports from this line
        for unused in unused_imports:
            # Match patterns like "Search," or ", Search" or just "Search" 
            import re
            line = re.sub(rf'\b{unused}\b,?\s*', '', line)
            line = re.sub(r',\s*,', ',', line)  # Clean up double commas
            line = re.sub(r'{\s*,', '{', line)  # Clean up leading comma
            line = re.sub(r',\s*}', '}', line)  # Clean up trailing comma
        
        # Skip lines that became empty after removal
        if line.strip() in ['import {', 'import { } from', '} from']:
            continue
            
    new_lines.append(line)

# Write back
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'w', encoding='utf-8', newline='') as f:
    f.writelines(new_lines)

print("Removed unused imports")
