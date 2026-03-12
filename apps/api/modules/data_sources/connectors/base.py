"""Contrato para test de conexión."""
from typing import TypedDict


class TestPayload(TypedDict, total=False):
    type: str
    host: str
    port: int
    database: str | None
    service_name: str | None
    username: str
    password: str
    options: dict


class TestResult(TypedDict):
    ok: bool
    message: str
    details: str | None
    error_code: str | None
