"""Schemas Pydantic para data_sources."""
from uuid import UUID
from pydantic import BaseModel, Field


class DataSourceCreate(BaseModel):
    name: str
    type: str = Field(..., pattern="^(postgres|sqlserver|oracle)$")
    host: str
    port: int
    database: str | None = None
    service_name: str | None = None
    username: str
    password: str
    options: dict | None = None


class DataSourceUpdate(BaseModel):
    name: str | None = None
    type: str | None = Field(None, pattern="^(postgres|sqlserver|oracle)$")
    host: str | None = None
    port: int | None = None
    database: str | None = None
    service_name: str | None = None
    username: str | None = None
    password: str | None = None
    options: dict | None = None


class DataSourceResponse(BaseModel):
    id: UUID
    name: str
    type: str
    host: str
    port: int
    database: str | None
    service_name: str | None
    username: str
    options: dict | None
    is_active: bool

    class Config:
        from_attributes = True


class TestConnectionBody(BaseModel):
    type: str = Field(..., pattern="^(postgres|sqlserver|oracle)$")
    host: str
    port: int
    database: str | None = None
    service_name: str | None = None
    username: str
    password: str
    options: dict | None = None


class TestConnectionResponse(BaseModel):
    ok: bool
    message: str
    details: str | None = None
    error_code: str | None = None
