import re

# Try different encodings
for encoding in ['cp949', 'euc-kr', 'utf-8-sig', 'latin1']:
    try:
        with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'r', encoding=encoding) as f:
            content = f.read()
        print(f"Successfully read file with {encoding} encoding")
        break
    except:
        continue

# Remove lastResult state declaration (multi-line)
lines = content.split('\n')
new_lines = []
skip_until = None

i = 0
while i < len(lines):
    line = lines[i]
    
    # Skip lastResult declaration
    if 'const [lastResult' in line:
        # Skip until we find the closing
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
        while i < len(lines) and not ('}' in lines[i] and ';' in lines[i]):
            i += 1
        i += 1
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

content = '\n'.join(new_lines)

# Write back
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed unused variables in TicketManagerPage.tsx")
