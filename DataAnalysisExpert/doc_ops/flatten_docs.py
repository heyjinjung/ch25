from pathlib import Path
import os
import re
import shutil

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = REPO_ROOT / "docs" / "v2_specs"
LEARNED_ROOT = DOCS_ROOT / "00_sot_meta" / "00_A_sot_code_ops_chk" / "learned_"

RE_REDIRECT_LINK = re.compile(r"\[.+?\]\((?P<link>.+?)\)")

def get_redirect_target(file_path: Path) -> Path | None:
    try:
        content = file_path.read_text(encoding="utf-8")
    except:
        content = file_path.read_text(encoding="cp949", errors="replace")
    
    if "상태: Redirect" not in content and "문서 타입: 안내(리다이렉트)" not in content:
        return None
    
    for line in content.splitlines():
        if "최신 본문:" in line:
            match = RE_REDIRECT_LINK.search(line)
            if match:
                link = match.group("link")
                # Handle relative paths like ../00_sot_meta/...
                target_path = (file_path.parent / link).resolve()
                if target_path.exists():
                    return target_path
    return None

def main():
    print(f"Scanning {DOCS_ROOT} for redirect stubs...")
    
    moved_count = 0
    
    # Iterate through logic folders like 01_core, 02_game, etc.
    for folder in DOCS_ROOT.iterdir():
        if not folder.is_dir() or folder.name in ["00_sot_meta", "90_troubleshooting", "99_archive", "999_활용"]:
            continue
            
        for doc in folder.glob("*.md"):
            target = get_redirect_target(doc)
            if target:
                print(f"Found stub: {doc.name} -> {target.relative_to(REPO_ROOT)}")
                
                # Backup stub content just in case
                # stub_backup = doc.with_suffix(".md.bak")
                # shutil.copy(doc, stub_backup)
                
                # Copy real content to stub location
                shutil.copy(target, doc)
                
                # Optional: Delete original source if it was in learned_
                if LEARNED_ROOT in target.parents:
                    # target.unlink() # Not deleting yet, let's just copy first
                    pass
                
                moved_count += 1

    print(f"\nDone. Flattened {moved_count} documents.")

if __name__ == "__main__":
    main()
