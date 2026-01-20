import importlib
import pkgutil


def _import_all_modules(package_name: str) -> None:
    pkg = importlib.import_module(package_name)

    if not hasattr(pkg, "__path__"):
        return

    for module_info in pkgutil.iter_modules(pkg.__path__, prefix=f"{package_name}."):
        importlib.import_module(module_info.name)


def test_import_v2_schemas_and_workers_smoke() -> None:
    """Smoke-import V2 modules that otherwise stay at 0% coverage.

    Intent: raise coverage safely without executing runtime side-effects.
    """

    # Schemas: pure Pydantic models.
    _import_all_modules("app.v2.schemas")

    # Workers: should be import-safe (redis import happens inside run functions).
    _import_all_modules("app.v2.workers")

    # Models: register V2 tables on SQLAlchemy Base.
    importlib.import_module("app.v2.models")
    importlib.import_module("app.v2.models.v2_golden_intervention_log")
