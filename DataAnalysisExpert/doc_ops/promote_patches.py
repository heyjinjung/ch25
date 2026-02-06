import os
import re
import datetime
import shutil
from pathlib import Path
from typing import List, Dict, Optional

# --- Configuration ---
REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = REPO_ROOT / "docs" / "v2_specs"
ARCHIVE_ROOT = DOCS_ROOT / "99_archive" / "patches"

RE_META_BLOCK = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
RE_META_LINE = re.compile(r"^(?P<key>[^:]+)\s*:\s*(?P<value>.+)$")
RE_SOT_STATUS = re.compile(r"상태\s*:\s*(?P<status>.+)")
RE_LAST_RECONCILED = re.compile(r"\[최종\s*검토일\s*:\s*(?P<date>[^\]]+)\]")

class DocMeta:
    def __init__(self, content: str):
        self.raw_meta = {}
        # Parse loosely from top lines if not in YAML frontmatter
        lines = content.splitlines()[:15]
        for line in lines:
            m = RE_META_LINE.match(line)
            if m:
                key = m.group("key").strip()
                value = m.group("value").strip()
                self.raw_meta[key] = value

    @property
    def status(self) -> str:
        return self.raw_meta.get("상태", "").strip()

    @property
    def doc_type(self) -> str:
        return self.raw_meta.get("문서 타입", "").strip()

def get_stable_sot_for_patch(patch_path: Path) -> Optional[Path]:
    """Find the corresponding Stable SoT for a given Patch file."""
    # Heuristic 1: Look in the same folder or parent/sibling folders (after flattening)
    # The flattening script moved learned_ files into the domain folders (01_core, etc.)
    # We look for a file that shares the base name but has 'sot' and is 'Stable'
    
    filename = patch_path.name.lower()
    domain_folder = patch_path.parent
    
    # If the patch is "v2_user_hotfix.md", we look for "v2_user_sot_ko.md"
    # Logic: find files in the same folder with similar prefix
    prefix_match = re.match(r"(v2_[a-z_]+)", filename)
    if not prefix_match:
        return None
    
    prefix = prefix_match.group(1)
    for candidate in domain_folder.glob(f"{prefix}*.md"):
        if candidate == patch_path:
            continue
        try:
            content = candidate.read_text(encoding="utf-8")
        except:
            content = candidate.read_text(encoding="cp949", errors="replace")
            
        if "상태: SoT" in content or "상태: Stable" in content:
            return candidate
            
    return None

def merge_patch_into_stable(patch_path: Path, stable_path: Path):
    """Appends patch content to stable doc and updates meta."""
    try:
        p_content = patch_path.read_text(encoding="utf-8")
        s_content = stable_path.read_text(encoding="utf-8")
    except:
        p_content = patch_path.read_text(encoding="cp949", errors="replace")
        s_content = stable_path.read_text(encoding="cp949", errors="replace")

    # Extract interesting part of patch (skip meta)
    p_body = ""
    lines = p_content.splitlines()
    body_started = False
    for line in lines:
        if body_started:
            p_body += line + "\n"
        elif line.startswith("## ") or line.startswith("# "):
            body_started = True
            p_body += line + "\n"

    # Update Stable Doc
    today = datetime.date.today().isoformat()
    
    # 1. Update Last Reconciled date
    if RE_LAST_RECONCILED.search(s_content):
        s_content = RE_LAST_RECONCILED.sub(f"[최종 검토일: {today}]", s_content)
    else:
        # Insert after meta block if not found
        meta_end = 0
        for i, line in enumerate(s_content.splitlines()[:15]):
            if line.strip() == "":
                meta_end = i
                break
        s_lines = s_content.splitlines()
        s_lines.insert(meta_end + 1, f"[최종 검토일: {today}]")
        s_lines.insert(meta_end + 2, f"[정책 최신화 상태: 🟢] (자동 병합: {patch_path.name})")
        s_content = "\n".join(s_lines)

    # 2. Append Patch Content in a "Recent Patches" section if it doesn't exist
    if "## 8. 변경 내역 (Recent Updates)" not in s_content:
        # Check for "변경 이력" and insert before it
        if "## 변경 이력" in s_content:
            s_content = s_content.replace("## 변경 이력", f"## 8. 변경 내역 (Recent Updates)\n\n### [{today}] {patch_path.name}\n\n{p_body}\n\n---\n\n## 변경 이력")
        else:
            s_content += f"\n\n## 8. 변경 내역 (Recent Updates)\n\n### [{today}] {patch_path.name}\n\n{p_body}\n"
    else:
        # Append to existing section
        insertion_point = s_content.find("## 8. 변경 내역 (Recent Updates)") + len("## 8. 변경 내역 (Recent Updates)")
        s_content = s_content[:insertion_point] + f"\n\n### [{today}] {patch_path.name}\n\n{p_body}\n\n---" + s_content[insertion_point:]

    stable_path.write_text(s_content, encoding="utf-8")
    print(f"MERGED: {patch_path.name} -> {stable_path.name}")

    # Archive patch
    target_archive = ARCHIVE_ROOT / datetime.date.today().strftime("%Y%m")
    target_archive.mkdir(parents=True, exist_ok=True)
    shutil.move(patch_path, target_archive / patch_path.name)
    print(f"ARCHIVED: {patch_path.name} moved to {target_archive}")

def main():
    print("Scanning for Patches to promote...")
    
    # Scan logical folders for files that are NOT Stable SoT but share prefix
    for folder in DOCS_ROOT.iterdir():
        if not folder.is_dir() or folder.name in ["00_sot_meta", "99_archive"]:
            continue
            
        for doc in folder.glob("*.md"):
            try:
                content = doc.read_text(encoding="utf-8")
            except:
                content = doc.read_text(encoding="cp949", errors="replace")
            
            meta = DocMeta(content)
            # If it's a "Patch" or "변경기록" or just looks like a transient update
            if "SoT" not in meta.status and ("Patch" in meta.status or "learned_" in str(doc)):
                stable = get_stable_sot_for_patch(doc)
                if stable:
                    print(f"Found patch candidate: {doc.name}")
                    merge_patch_into_stable(doc, stable)
                else:
                    print(f"Skip (No Stable target): {doc.name}")

if __name__ == "__main__":
    main()
