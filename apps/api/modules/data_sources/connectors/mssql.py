"""Test de conexión SQL Server."""
from modules.data_sources.connectors.base import TestPayload, TestResult

try:
    import pyodbc
    _HAS_PYODBC = True
except ImportError:
    _HAS_PYODBC = False


def test_connection(payload: TestPayload) -> TestResult:
    if not _HAS_PYODBC:
        return {
            "ok": False,
            "message": "SQL Server driver not available",
            "details": "Install pyodbc: pip install pyodbc",
            "error_code": "DRIVER_MISSING",
        }
    try:
        driver = "{ODBC Driver 18 for SQL Server}"
        conn_str = (
            f"DRIVER={driver};SERVER={payload['host']},{payload['port']};"
            f"DATABASE={payload.get('database') or 'master'};UID={payload['username']};PWD={payload['password']};"
            "Connection Timeout=5;Encrypt=yes;TrustServerCertificate=yes;"
        )
        conn = pyodbc.connect(conn_str)
        conn.close()
        return {"ok": True, "message": "Connection validated successfully (SQL Server)", "details": None, "error_code": None}
    except pyodbc.Error as e:
        msg = str(e) or "SQL Server connection failed"
        code = "DB_CONNECTION_ERROR"
        if "timeout" in msg.lower() or "timed out" in msg.lower():
            msg, code = "Connection timeout", "TIMEOUT"
        elif "Login failed" in msg or "password" in msg.lower():
            msg, code = "Authentication failed", "AUTH_ERROR"
        elif "ENOTFOUND" in msg or "getaddrinfo" in msg:
            msg, code = "DNS resolution failed", "DNS_ERROR"
        elif "ECONNREFUSED" in msg:
            msg, code = "Connection refused", "CONNECTION_REFUSED"
        return {"ok": False, "message": msg, "details": str(e), "error_code": code}
    except Exception as e:
        return {"ok": False, "message": "SQL Server connection failed", "details": str(e), "error_code": "DB_CONNECTION_ERROR"}
