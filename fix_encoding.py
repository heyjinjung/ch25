# Fix encoding and remove unused variables
import re

# Read backup with proper encoding
for encoding in ['cp949', 'euc-kr', 'latin1']:
    try:
        with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage_backup.tsx', 'r', encoding=encoding) as f:
            content = f.read()
        print(f"Read backup with {encoding}")
        break
    except Exception as e:
        print(f"Failed with {encoding}: {e}")
        continue

# Now apply the same fixes but preserve encoding
lines = content.split('\n')
new_lines = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # Skip lastResult declaration (multi-line)
    if 'const [lastResult' in line:
        while i < len(lines) and not lines[i].strip().endswith('(null);'):
            i += 1
        i += 1
        continue
    
    # Skip wallet and ledger queries
    if 'const walletsByUserIdQuery' in line or 'const ledgerByUserIdQuery' in line:
        while i < len(lines) and not lines[i].strip().endswith('});'):
            i += 1
        i += 1
        continue
        
    # Skip Pagination component
    if 'const Pagination: React.FC' in line:
        depth = 0
        while i < len(lines):
            if '{' in lines[i]:
                depth += lines[i].count('{')
            if '}' in lines[i]:
                depth -= lines[i].count('}')
            i += 1
            if depth == 0 and ';' in lines[i-1]:
                break
        continue
    
    # Fix userSearch
    if 'const [userSearch, setUserSearch]' in line:
        new_lines.append(line.replace('const [userSearch, setUserSearch]', 'const [userSearch]'))
        i += 1
        continue
    
    # Remove setLastResult calls
    if 'setLastResult' in line:
        i += 1
        continue
        
    new_lines.append(line)
    i += 1

# Write with UTF-8 BOM
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'w', encoding='utf-8-sig') as f:
    f.write('\n'.join(new_lines))

print("Fixed encoding and removed unused variables")
