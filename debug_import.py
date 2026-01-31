import sys
import os
import traceback

sys.path.append(os.getcwd())

modules_to_test = [
    "app.v2.services.hq_margin_import_service",
    "app.v2.services.hq_margin_stats_service",
    "app.v2.services.golden_scheduler_service",
    "app.v2.services.segment_service",
    "app.v2.models.user",
    "app.v2.models.v2_user_segment",
    "app.v2.models.hq_prospective_user",
    "app.v2.models.v2_admin_audit_log",
    "app.v2.models.v2_golden_intervention_log"
]

for mod in modules_to_test:
    try:
        print(f"Attempting to import {mod}...")
        __import__(mod)
        print(f"Import {mod} successful!")
    except Exception:
        print(f"FAILED to import {mod}")
        traceback.print_exc()
