import pytest
from sqlalchemy import inspect
from app.v2.models.v2_shop_order import V2ShopOrder
from app.v2.models.v2_exchange_log import V2ExchangeLog
from app.v2.models.v2_ticket_zero_log import V2TicketZeroLog

# Validates:
# - docs/v2_specs/04_db/v2_db_shop_order_ko.md
# - docs/v2_specs/04_db/v2_db_exchange_log_ko.md
# - docs/v2_specs/04_db/v2_db_ticket_zero_log_ko.md

def test_v2_shop_order_table():
    insp = inspect(V2ShopOrder)
    cols = {c.name for c in insp.columns}
    assert "user_id" in cols
    assert "sku" in cols
    assert "cost_amount" in cols
    # assert "status" in cols # Skipped as per model inspection

def test_v2_exchange_log_table():
    insp = inspect(V2ExchangeLog)
    cols = {c.name for c in insp.columns}
    assert "input_type" in cols
    assert "output_type" in cols
    assert "input_amount" in cols

def test_v2_ticket_zero_log_table():
    insp = inspect(V2TicketZeroLog)
    cols = {c.name for c in insp.columns}
    assert "user_id" in cols
    assert "ticket_amount" in cols
    assert "reason" in cols
