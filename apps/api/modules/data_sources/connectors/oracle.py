"""Test de conexión Oracle."""
from modules.data_sources.connectors.base import TestPayload, TestResult

try:
    import oracledb
    _HAS_ORACLE = True
except ImportError:
    _HAS_ORACLE = False

_ORACLE_THICK_INIT = False


def _ensure_thick_mode() -> None:
    """Inicializa modo thick para soportar verifiers 10G (DPY-3015). En Linux no pasar lib_dir."""
    global _ORACLE_THICK_INIT
    if not _ORACLE_THICK_INIT:
        try:
            oracledb.init_oracle_client()
        except oracledb.Error:
            pass  # Ya inicializado o no disponible; continuar con thin mode
        _ORACLE_THICK_INIT = True


def test_connection(payload: TestPayload) -> TestResult:
    if not _HAS_ORACLE:
        return {
            "ok": False,
            "message": "Oracle driver not available",
            "details": "Install oracledb: pip install oracledb",
            "error_code": "DRIVER_MISSING",
        }
    conn = None
    try:
        _ensure_thick_mode()
        dsn = payload.get("service_name") and f"{payload['host']}:{payload['port']}/{payload['service_name']}" or f"{payload['host']}:{payload['port']}"
        conn = oracledb.connect(
            user=payload["username"],
            password=payload["password"],
            dsn=dsn,
        )
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM dual")
        conn.close()
        return {"ok": True, "message": "Connection validated successfully (Oracle)", "details": None, "error_code": None}
    except oracledb.Error as e:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
        msg = str(e) or "Oracle connection failed"
        code = "DB_CONNECTION_ERROR"
        if "ORA-01017" in msg or "ORA-1017" in msg or "invalid username/password" in msg:
            msg, code = "Authentication failed", "AUTH_ERROR"
        elif "ORA-12541" in msg or "no listener" in msg:
            msg, code = "Connection refused", "CONNECTION_REFUSED"
        elif "ORA-12154" in msg or "could not resolve" in msg:
            msg, code = "Service name resolution failed", "SERVICE_NOT_FOUND"
        elif "DPI-1047" in msg or "Oracle Instant Client" in msg:
            msg, code = "Oracle Instant Client not found", "DRIVER_ERROR"
        elif "DPY-3015" in msg:
            msg = "Password verifier 10G no soportado en modo thin. Use modo thick (Oracle Instant Client en el contenedor)"
            code = "VERIFIER_10G"
        return {"ok": False, "message": msg, "details": str(e), "error_code": code}
    except Exception as e:
        return {"ok": False, "message": "Oracle connection failed", "details": str(e), "error_code": "DB_CONNECTION_ERROR"}
