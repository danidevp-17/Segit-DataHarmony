"""
Dependencias FastAPI reutilizables.
"""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session
from starlette.requests import Request

from core.database import get_db
from core.middleware import get_correlation_id

DbSession = Annotated[Session, Depends(get_db)]


def get_request(request: Request) -> Request:
    return request


def get_correlation_id_dep(request: Request) -> str:
    return get_correlation_id(request)
