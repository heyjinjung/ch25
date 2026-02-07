import gzip
import re

file_path = "xmas_event_backup_20260206_112635.sql.gz"
output_file = "analysis_result.txt"

def parse_sql_dump(file_path):
    print("Parsing...")
    with open(output_file, "w", encoding="utf-8") as out:
        tables = {"v2_user": [], "hq_prospective_user": []}
        
        with gzip.open(file_path, "rt", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if "INSERT INTO `v2_user`" in line or "INSERT INTO `hq_prospective_user`" in line:
                    # Capture the whole line
                    # But lines might be huge.
                    # We only care about 2026-02-06 occurences in them.
                    
                    # Count '2026-02-06' in this line (rough metric)
                    # But we want context.
                    
                    # Store samples
                    if "v2_user" in line:
                         tables["v2_user"].append(line)
                    elif "hq_prospective_user" in line:
                         tables["hq_prospective_user"].append(line)

        # Process v2_user
        v2_lines = tables["v2_user"]
        total_v2_created_today = 0
        total_v2_deposited_today = 0
        
        out.write(f"--- v2_user Analysis ({len(v2_lines)} lines) ---\n")
        
        for line in v2_lines:
            # We want to count how many records have '2026-02-06' in specific positions?
            # Or just count "2026-02-06" string occurrences?
            # If a row has "2026-02-06" twice, it likely means created AND first_deposited (or updated/joined).
            
            # Let's split by "),(" roughly
            rows = line.split("),(")
            for row in rows:
                cnt = row.count("2026-02-06")
                if cnt >= 1:
                    total_v2_created_today += 1
                if cnt >= 2:
                    total_v2_deposited_today += 1
                
                # Sample
                if cnt >= 1 and total_v2_created_today < 5:
                    out.write(f"SAMPLE ROW (1 match): {row}\n")
                if cnt >= 2 and total_v2_deposited_today < 5:
                    out.write(f"SAMPLE ROW (2 matches): {row}\n")

        out.write(f"\nv2_user rows with >= 1 '2026-02-06': {total_v2_created_today}\n")
        out.write(f"v2_user rows with >= 2 '2026-02-06' (Deposit): {total_v2_deposited_today}\n")
        
        # Process hq
        hq_lines = tables["hq_prospective_user"]
        total_joins_today = 0
        out.write(f"\n--- hq_prospective_user Analysis ({len(hq_lines)} lines) ---\n")
        for line in hq_lines:
            rows = line.split("),(")
            for row in rows:
                if "2026-02-06" in row:
                    total_joins_today += 1
                    if total_joins_today < 5:
                         out.write(f"SAMPLE HQ ROW: {row}\n")
                         
        out.write(f"hq_prospective_user rows with '2026-02-06': {total_joins_today}\n")

parse_sql_dump(file_path)
print("Done writing to " + output_file)
