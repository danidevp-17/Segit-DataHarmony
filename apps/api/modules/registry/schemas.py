"""Schemas Pydantic para el módulo registry."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AppSectionSchema(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None
    order_index: int
    route: str | None
    icon: str | None

    class Config:
        from_attributes = True


class AppModuleSchema(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None
    icon: str | None
    color: str | None
    order_index: int
    route: str | None
    sections: list[AppSectionSchema] = []

    class Config:
        from_attributes = True
