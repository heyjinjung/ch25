import re
import os
from enum import Enum
from typing import Set, Dict
import pytest
from app.models.mission import MissionRewardType
from app.models.game_wallet import GameTokenType

# Path to docs
DOCS_ROOT = os.path.join(os.path.dirname(__file__), "../../../docs/v2_specs/01_core")

def parse_markdown_table(file_path: str, col_index: int = 0) -> Set[str]:
    """Parses a markdown table from the given file and extracts values from a specific column."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    values = set()
    # Find the table by looking for standard markdown table syntax | val | val |
    lines = content.splitlines()
    in_table = False
    header_found = False
    
    for line in lines:
        if "|" in line:
            # Check if it's a separator line like |---|---|
            if set(line.strip().replace("|", "").replace(":", "")) == {"-"}:
                in_table = True
                header_found = True
                continue
            
            if in_table and header_found:
                # Extract value
                cols = [c.strip() for c in line.split("|")]
                # split puts empty strings at start/end if pipe is at start/end
                # e.g. | A | B | -> ['', 'A', 'B', '']
                # clean up empty strings
                clean_cols = [c for c in cols if c]
                if len(clean_cols) > col_index:
                    val = clean_cols[col_index]
                    # Filter out header like 'Value' if we started early or multiple tables
                    if val and val != "Value" and val != "용어" and val != "reward_type": 
                        # Specific fix for messy table parsing if needed, but basic should work
                        values.add(val)
        else:
            if in_table:
                # Table ended
                pass

    return values

def test_mission_reward_type_sot_compliance():
    """Verify MissionRewardType matches v2_reward_type_standard_sot_ko.md"""
    sot_path = os.path.join(DOCS_ROOT, "v2_reward_type_standard_sot_ko.md")
    
    # Extract standard types from "4. SoT: RewardType 표준 집합" table
    # Table structure: | reward_type | 설명 |
    # We want column 0
    sot_values = set()
    with open(sot_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Manual extraction to be precise about which table
    # Looking for table after "## 4. SoT: RewardType 표준 집합"
    section_match = re.search(r"## 4\. SoT: RewardType 표준 집합(.*?)(##|$)", content, re.DOTALL)
    assert section_match, "Could not find '4. SoT: RewardType 표준 집합' section in SoT doc"
    
    table_content = section_match.group(1)
    for line in table_content.splitlines():
        if "|" in line and "reward_type" not in line and "---" not in line:
            cols = [c.strip() for c in line.split("|") if c.strip()]
            if cols:
                sot_values.add(cols[0])

    code_values = {e.value for e in MissionRewardType}
    
    # Check if all SoT values exist in Code
    missing_in_code = sot_values - code_values
    
    # Ignore acceptable deviations if specific reasoning exists (none for now for strict V2)
    # But usually Code might have MORE values (Legacy). 
    # We strictly want to ensure V2 Standard Types are present.
    assert not missing_in_code, f"MissionRewardType is missing V2 Standard types: {missing_in_code}"

def test_game_token_type_sot_compliance():
    """Verify GameTokenType matches v2_ticket_enum_sot_ko.md"""
    sot_path = os.path.join(DOCS_ROOT, "v2_ticket_enum_sot_ko.md")
    
    # Extract from "## 4. SoT: 티켓 Enum 표"
    # Structure: | 용어 | Enum | SoT | 설명 |
    # We want Enum (index 1)
    sot_values = set()
    with open(sot_path, "r", encoding="utf-8") as f:
        content = f.read()

    section_match = re.search(r"## 4\. SoT: 티켓 Enum 표(.*?)(##|$)", content, re.DOTALL)
    assert section_match, "Could not find '4. SoT: 티켓 Enum 표' section in SoT doc"
    
    table_content = section_match.group(1)
    for line in table_content.splitlines():
        if "|" in line and "Enum" not in line and "---" not in line:
            cols = [c.strip() for c in line.split("|") if c.strip()]
            if len(cols) >= 2:
                sot_values.add(cols[1]) # Enum column
    
    code_values = {e.value for e in GameTokenType}
    
    missing_in_code = sot_values - code_values
    assert not missing_in_code, f"GameTokenType is missing V2 Standard Ticket types: {missing_in_code}"

def test_config_priority_check():
    """
    Placeholder for 'Config Priority' test (Phase 3).
    Ensures that Admin Config > Global Default logic is respected.
    This logic usually resides in Service layers, but we can check if Models allow overrides.
    """
    pass
