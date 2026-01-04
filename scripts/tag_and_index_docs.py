import os
import shutil


def _encode_markdown_link_target(path: str) -> str:
    # Markdown link destination에서 공백은 URL을 끊고, '#'는 fragment로 해석되어
    # 파일명이 깨질 수 있으므로 최소 인코딩을 적용한다.
    return path.replace("#", "%23").replace(" ", "%20")

# List of files provided by user (relative to git root c:\Users\task2\git\ch25)
files_to_process = [
    r"docs\06_ops\202601\[2026001#] 현재앱리텐션요소종합 분석.md",
    r"docs\06_ops\202601\[2026001#] unified_economy_and_progression_ko.md",
    r"docs\06_ops\202601\[2026001#]daily_mission_system_ko_v5.md",
    r"docs\06_ops\202601\[2026001#]economy_onboarding_v7.md",
    r"docs\06_ops\202601\[2026001#]inventory_voucher_system_ko.md",
    r"docs\06_ops\202601\[2026001#]ops_onboarding_apply_guide_ko.md",
    r"docs\06_ops\[2026001#01]final_user_report.md",
    r"docs\design\[2026001#]daily_mission_system_ko_v6.md",
    r"docs\design\[2026001#] unified_economy_and_progression_ko.md",
    r"docs\design\[2026001#]inventory_voucher_system_ko.md",
    r"docs\design\[2026001#]economy_onboarding_v7.md",
    r"docs\ops\[2026001#]SERVER_ENV_ONBOARDING.md",
    r"docs\product\[2026001#] vault_single_sot_unification_plan_v1.0.md",
    r"docs\[2026001#]admin_audit_plan_ko.md"
]

base_dir = r"c:\Users\task2\git\ch25"
new_tag = "[20261월첫째주]"
index_file_path = os.path.join(base_dir, r"docs\[20261월첫째주]_핵심문서_인덱스.md")

renamed_files_info = []

print("Starting file processing...")

for rel_path in files_to_process:
    full_path = os.path.join(base_dir, rel_path)
    
    if not os.path.exists(full_path):
        print(f"File not found, skipping: {rel_path}")
        continue
    
    dirname, filename = os.path.split(full_path)
    
    # Remove existing confusing tags if strictly needed, or just append distinct new tag.
    # User said "Add common tag", implies keeping or just making it searchable.
    # To make it CLEAN, I will prepend the new tag.
    
    # Check if already tagged to avoid double tagging
    if new_tag in filename:
        new_filename = filename
    else:
        new_filename = f"{new_tag} {filename}"
        
    new_full_path = os.path.join(dirname, new_filename)
    
    try:
        os.rename(full_path, new_full_path)
        print(f"Renamed: {filename} -> {new_filename}")
        
        # Store info for index
        # direct link relative to docs root or absolute? VS Code works best with relative to workspace or file.
        # Let's make links relative to the index file (which is in docs/)
        
        # Calculate relative path from docs/ to the file
        # file is in docs/subdir/... 
        # index is in docs/
        
        # rel_path was docs\...\...
        # new rel path is dirname(rel_path) + new_filename
        
        rel_dir = os.path.dirname(rel_path) # e.g. docs\06_ops\202601
        
        # We need path relative to 'docs/' because index is in 'docs/'
        # rel_dir starts with docs\
        if rel_dir.startswith("docs\\"):
            link_path = os.path.join(rel_dir[5:], new_filename).replace("\\", "/")
        elif rel_dir.startswith("docs/"):
            link_path = os.path.join(rel_dir[5:], new_filename).replace("\\", "/")
        else:
            # Fallback
            link_path = new_filename
            
        renamed_files_info.append({
            "name": new_filename,
            "path": link_path,
            "original": filename
        })
        
    except Exception as e:
        print(f"Error renaming {filename}: {e}")

# Generate Index File
print("Generating Index File...")

content = f"# 📂 {new_tag} 핵심 문서 인덱스\n\n"
content += "이 문서는 2026년 1월 첫째주 주요 운영/기획 문서를 모아둔 총괄 인덱스입니다.\n"
content += "모든 파일에는 검색 편의를 위해 제목에 `[20261월첫째주]` 태그가 추가되었습니다.\n\n"

current_category = ""

# Sort by path to group by folder
renamed_files_info.sort(key=lambda x: x['path'])

for info in renamed_files_info:
    # Grouping logic simple
    folder = os.path.dirname(info['path'])
    if folder != current_category:
        folder_display = folder if folder else "(docs root)"
        content += f"\n### 📁 {folder_display}\n"
        current_category = folder
    
    link_target = _encode_markdown_link_target(info['path'])
    content += f"- [{info['name']}]({link_target})\n"

try:
    with open(index_file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Index created at: {index_file_path}")
except Exception as e:
    print(f"Error writing index: {e}")

print("Done.")
