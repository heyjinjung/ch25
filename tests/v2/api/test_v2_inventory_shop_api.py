import pytest
from fastapi.testclient import TestClient

# Validates docs/v2_specs/03_api/v2_inventory_shop_api_contract_ko.md

def test_v2_inventory_shop_endpoints_exist(client: TestClient):
    # Inventory
    assert client.get("/api/v2/inventory/items").status_code != 404
    assert client.post("/api/v2/inventory/use").status_code != 404
    
    # Shop
    assert client.get("/api/v2/shop/products").status_code != 404
    assert client.post("/api/v2/shop/purchase").status_code != 404
    
    # Exchange (Crafting)
    assert client.post("/api/v2/exchange/craft").status_code != 404
