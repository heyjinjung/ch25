# Fix BOM and other encoding issues
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Remove any BOM characters that might have leaked into the content
content = content.lstrip('\ufeff')

# Write without BOM, just plain UTF-8
with open('c:/Users/JAVIS/ch/ch25/src/admin/pages/TicketManagerPage.tsx', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("Fixed BOM and encoding issues")
