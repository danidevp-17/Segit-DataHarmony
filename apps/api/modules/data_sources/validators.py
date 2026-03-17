"""Validación de payloads y llamada al connector correspondiente."""
from modules.data_sources.connectors.base import TestPayload, TestResult
from modules.data_sources.connectors import postgres as conn_pg
from modules.data_sources.connectors import mssql as conn_mssql
from modules.data_sources.connectors import oracle as conn_oracle


def validate_test_payload(payload: dict) -> tuple[bool, str]:
    """Valida campos requeridos. Retorna (ok, error_message)."""
    if not payload.get("type") or not payload.get("host") or not payload.get("port") or not payload.get("username") or not payload.get("password"):
        return False, "type, host, port, username and password are required"
    t = payload["type"]
    if t not in ("postgres", "sqlserver", "oracle"):
        return False, f"Unsupported type: {t}"
    if t == "oracle" and not payload.get("service_name"):
        return False, "Oracle datasource requires service_name"
    if t in ("postgres", "sqlserver") and not payload.get("database"):
        return False, f"{t} datasource requires database"
    return True, ""


def test_connection(payload: TestPayload) -> TestResult:
    """Ejecuta el test de conexión según el tipo."""
    ok, err = validate_test_payload(payload)
    if not ok:
        return {"ok": False, "message": err, "details": None, "error_code": "INVALID_CONFIG"}

    if payload["type"] == "postgres":
        return conn_pg.test_connection(payload)
    if payload["type"] == "sqlserver":
        return conn_mssql.test_connection(payload)
    if payload["type"] == "oracle":
        return conn_oracle.test_connection(payload)
    return {"ok": False, "message": f"Unsupported type: {payload['type']}", "details": None, "error_code": "INVALID_CONFIG"}
