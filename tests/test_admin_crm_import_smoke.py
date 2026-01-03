from fastapi import APIRouter


def test_admin_crm_module_import_smoke():
    # Import-time failures here can crash uvicorn startup and cause container restart loops.
    from app.api.admin.routes import admin_crm

    assert isinstance(admin_crm.router, APIRouter)
