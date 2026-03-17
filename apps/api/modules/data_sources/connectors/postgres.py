"""Test de conexión PostgreSQL."""
import psycopg2
from psycopg2 import OperationalError

from modules.data_sources.connectors.base import TestPayload, TestResult


def test_connection(payload: TestPayload) -> TestResult:
    try:
        conn = psycopg2.connect(
            host=payload["host"],
            port=payload["port"],
            database=payload.get("database") or "postgres",
            user=payload["username"],
            password=payload["password"],
            connect_timeout=5,
        )
        conn.close()
        return {"ok": True, "message": "Connection validated successfully (PostgreSQL)", "details": None, "error_code": None}
    except OperationalError as e:
        msg = str(e) or "PostgreSQL connection failed"
        code = "DB_CONNECTION_ERROR"
        if "timeout" in msg.lower() or "timed out" in msg.lower():
            msg, code = "Connection timeout", "TIMEOUT"
        elif "password" in msg.lower() or "authentication" in msg.lower():
            msg, code = "Authentication failed", "AUTH_ERROR"
        elif "ENOTFOUND" in msg or "getaddrinfo" in msg:
            msg, code = "DNS resolution failed", "DNS_ERROR"
        elif "ECONNREFUSED" in msg:
            msg, code = "Connection refused", "CONNECTION_REFUSED"
        return {"ok": False, "message": msg, "details": str(e), "error_code": code}
    except Exception as e:
        return {"ok": False, "message": "PostgreSQL connection failed", "details": str(e), "error_code": "DB_CONNECTION_ERROR"}
