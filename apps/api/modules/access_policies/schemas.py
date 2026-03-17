"""Schemas para access policies."""
from pydantic import BaseModel


class PoliciesResponse(BaseModel):
    routinePolicies: dict[str, list[str]]
    modulePolicies: dict[str, list[str]]


class PoliciesUpdate(BaseModel):
    routinePolicies: dict[str, list[str]] = {}
    modulePolicies: dict[str, list[str]] = {}
