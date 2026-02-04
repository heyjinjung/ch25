import os
import re

replacements = {
    'from app.schemas.base': 'from app.v2.schemas.base',
    'from app.schemas.mission': 'from app.v2.schemas.shared.mission',
    'from app.schemas.dice': 'from app.v2.schemas.shared.dice',
    'from app.schemas.lottery': 'from app.v2.schemas.shared.lottery',
    'from app.schemas.roulette': 'from app.v2.schemas.shared.roulette',
    'from app.schemas.admin_user': 'from app.v2.schemas.shared.admin_user',
    'from app.schemas.cc_deposit': 'from app.v2.schemas.shared.cc_deposit',
    'from app.schemas.admin_user_summary': 'from app.v2.schemas.shared.admin_user_summary'
}

def migrate_folder(folder_path):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    for old, new in replacements.items():
                        content = content.replace(old, new)
                    
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Updated: {file_path}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

# Run for app/v2
migrate_folder('app/v2')
# Run for app/db (for any specific imports there)
migrate_folder('app/db')
