import pytest
from sqlalchemy import inspect
from app.v2.models.v2_ops_execution_result import V2OpsExecutionResult
from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox

# Validates:
# - docs/v2_specs/04_db/v2_db_ops_execution_result_ko.md
# - docs/v2_specs/04_db/v2_db_admin_message_ko.md
# - docs/v2_specs/04_db/v2_db_admin_message_inbox_ko.md

def test_v2_ops_execution_table():
    insp = inspect(V2OpsExecutionResult)
    cols = {c.name for c in insp.columns}
    assert "task_id" in cols
    assert "kind" in cols
    assert "payload_json" in cols

def test_v2_admin_message_tables():
    insp_msg = inspect(V2AdminMessage)
    cols_msg = {c.name for c in insp_msg.columns}
    assert "title" in cols_msg
    assert "content" in cols_msg
    assert "target_type" in cols_msg 

    insp_inbox = inspect(V2AdminMessageInbox)
    cols_inbox = {c.name for c in insp_inbox.columns}
    assert "user_id" in cols_inbox
    assert "message_id" in cols_inbox
    assert "is_read" in cols_inbox
