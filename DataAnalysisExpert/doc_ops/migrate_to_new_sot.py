import os
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OLD_DOCS_ROOT = REPO_ROOT / "docs" / "v2_specs"
NEW_SOT_ROOT = REPO_ROOT / "docs" / "SOT"

DOMAINS = [
    "auth", "user", "vault", "shop", "inventory", 
    "level", "mission", "ops", "golden", "admin", 
    "segment", "teambattle", "game", "core"
]

def init_structure():
    print(f"Initializing new SoT structure at {NEW_SOT_ROOT}...")
    for domain in DOMAINS:
        domain_path = NEW_SOT_ROOT / domain
        (domain_path / "아카이브").mkdir(parents=True, exist_ok=True)
        (domain_path / "변경로그").mkdir(parents=True, exist_ok=True)
    print("Done.")

def migrate_files():
    print("Starting migration...")
    
    # 1. Collect all .md files from old structure
    # Skip troubleshooting and guides for now, focus on specs and learned
    for folder in OLD_DOCS_ROOT.iterdir():
        if not folder.is_dir():
            continue
            
        # We need to map old folders/files to new domains
        for file_path in folder.rglob("*.md"):
            content = ""
            try:
                content = file_path.read_text(encoding="utf-8")
            except:
                try:
                    content = file_path.read_text(encoding="cp949", errors="replace")
                except:
                    continue

            # Heuristic for domain detection
            domain = "core" # Default
            rel_path_str = str(file_path.relative_to(OLD_DOCS_ROOT)).lower()
            
            for d in DOMAINS:
                if d in rel_path_str or f"_{d}_" in content.lower():
                    domain = d
                    break
            
            target_domain_dir = NEW_SOT_ROOT / domain
            
            # Decide if it's a main SoT candidate, a patch (changelog), or archive
            filename = file_path.name
            if "sot" in filename.lower() and "patch" not in filename.lower() and "hotfix" not in filename.lower():
                # Potential Main SoT -> rename to standard
                target_name = f"v2_sot_{domain}_ko.md"
                target_path = target_domain_dir / target_name
                
                if target_path.exists():
                    # If exists, move current one to 변경로그 as it might be a fragment
                    shutil.copy(file_path, target_domain_dir / "변경로그" / filename)
                else:
                    shutil.copy(file_path, target_path)
            elif "learned_" in rel_path_str or "patch" in filename.lower() or "hotfix" in filename.lower():
                # To 변경로그
                shutil.copy(file_path, target_domain_dir / "변경로그" / filename)
            else:
                # To 아카이브 by default if unsure
                shutil.copy(file_path, target_domain_dir / "아카이브" / filename)
                
    print("Migration Step 1 (Copying) complete.")

if __name__ == "__main__":
    init_structure()
    migrate_files()
